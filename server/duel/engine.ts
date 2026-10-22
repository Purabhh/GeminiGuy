import { randomBytes } from 'node:crypto'
import { join } from 'node:path'
import {
  DUEL_CONFIG,
  EXAM_LABEL,
  MATCH_ID,
  PLAYER_ID,
  type DuelAnswered,
  type DuelMode,
  type DuelMove,
  type DuelQuestion,
  type DuelSource,
  type DuelStarted,
  type DuelSummary,
  type PlayerProfile,
} from '../../shared/duel.ts'
import type { QuizSet } from '../../shared/docsTypes.ts'
import { eloUpdate, kFactor, questionUpdate, RATING, scoreOf, type Outcome } from '../../shared/rating.ts'
import { cleanExplanation } from '../docs/quiz.ts'
import type { DocsService, Reply } from '../docs/service.ts'
import { DOC_ID } from '../docs/service.ts'
import { seededRandom } from '../docs/text.ts'
import { BOT, botMove } from './bot.ts'
import { SEED_QUESTIONS } from './seed.ts'
import { openDuelStore, type BankQuestion, type DuelStore, type MatchRow } from './store.ts'
import type { MatchQuestion, MatchState } from './types.ts'

// The duel engine as plain operations (no HTTP), like the docs service: start
// a match, answer a question, read a profile. The server owns the clock and
// the answers; the client sends only "I picked choice n of question i".
//
// Anti-cheat rules this enforces:
// - answers and Mochee's moves never leave the server before you answer;
// - time is measured on the server, so a slow answer is a timeout whatever the client says;
// - questions go in order, each answered once; a retry gets the first result back;
// - starting a new match forfeits any match left unfinished (a loss when rated), so quitting can't dodge a loss;
// - rating and coins are settled once, in the same transaction that marks the match finished.

export interface DuelOptions {
  dataDir: string
  docs: DocsService
  now?: () => number // injectable clock for tests
}

const fail = (status: number, error: string): Reply => ({ status, body: { error } })
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const DUEL_DB = 'duel.db'

function parseSource(v: unknown): DuelSource | null {
  if (!isObj(v)) return null
  if (v.kind === 'exam' && (v.exam === 'sat' || v.exam === 'psat')) return { kind: 'exam', exam: v.exam }
  if (v.kind === 'notebook' && typeof v.documentId === 'string' && DOC_ID.test(v.documentId)) return { kind: 'notebook', documentId: v.documentId }
  return null
}

const MODES: readonly DuelMode[] = ['ranked', 'practice', 'personal']

// Seeded Fisher-Yates.
function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

const points = (correct: boolean, ms: number, limitMs: number) =>
  correct ? DUEL_CONFIG.points.correct + Math.round(DUEL_CONFIG.points.speedMax * Math.max(0, 1 - ms / limitMs)) : 0

const view = (q: MatchQuestion, index: number): DuelQuestion => ({ index, prompt: q.prompt, passage: q.passage, choices: q.choices, section: q.section, limitMs: q.limitMs })

export function seedBank(store: DuelStore): number {
  return store.addBankQuestions(
    SEED_QUESTIONS.map((s) => ({
      id: `s-${s.key}`,
      key: s.key,
      exams: s.exams,
      section: s.section,
      domain: s.domain,
      rating: s.rating,
      passage: s.passage,
      prompt: s.prompt,
      choices: [...s.choices],
      answerIndex: 0,
      explanation: s.explanation,
      source: 'seed',
    })),
  )
}

export function createDuelService(opts: DuelOptions) {
  const store = openDuelStore(join(opts.dataDir, DUEL_DB))
  seedBank(store)
  const now = opts.now ?? Date.now

  // Exam questions near the player's level, about half math and half reading
  // and writing, then mixed. Choices are reshuffled for this match.
  function examQuestions(exam: 'sat' | 'psat', playerRating: number, rand: () => number): BankQuestion[] | null {
    const bank = store.bankFor(exam)
    const n = DUEL_CONFIG.questions.exam
    const pick = (section: 'math' | 'rw', count: number) =>
      bank
        .filter((q) => q.section === section)
        .map((q) => ({ q, d: Math.abs(q.rating - playerRating) + rand() * 250 }))
        .sort((a, b) => a.d - b.d)
        .slice(0, count)
        .map((x) => x.q)
    const math = pick('math', Math.ceil(n / 2))
    const rw = pick('rw', n - math.length)
    if (math.length + rw.length < n) return null
    return shuffle([...math, ...rw], rand)
  }

  async function notebookQuestions(documentId: string): Promise<Omit<MatchQuestion, 'bot'>[] | Reply> {
    const reply = await opts.docs.quiz({ documentId })
    if (reply.status !== 200) return reply
    const quiz = reply.body as QuizSet
    const out: Omit<MatchQuestion, 'bot'>[] = []
    for (const pub of quiz.questions.slice(0, DUEL_CONFIG.questions.notebook)) {
      const q = opts.docs.store.getQuestion(pub.id)
      if (!q) continue
      out.push({
        ref: { kind: 'notebook', id: q.id },
        section: 'notebook',
        rating: RATING.start,
        limitMs: DUEL_CONFIG.limitMs.notebook,
        passage: null,
        prompt: q.prompt,
        choices: q.choices,
        correctChoice: q.answerIndex,
        explanation: cleanExplanation(q.explanation, `Page ${q.citation.page} says: "${q.citation.quote}"`),
      })
    }
    return out.length ? out : fail(422, 'no-text')
  }

  function summarize(state: MatchState, forfeit: boolean): Omit<DuelSummary, 'rating'> {
    const { you, opponent } = state.score
    const outcome: Outcome = forfeit ? 'loss' : you > opponent ? 'win' : you < opponent ? 'loss' : 'draw'
    const correct = state.answers.filter((a) => a.you.correct).length
    const c = DUEL_CONFIG.coins
    const coins = state.source.kind === 'notebook' ? correct * c.perCorrect + (outcome === 'win' ? c.win : outcome === 'draw' ? c.draw : 0) : 0
    return { outcome, you, opponent, correct, total: state.questions.length, coins }
  }

  // Marks the match finished and applies its rating change, in one
  // transaction. Returns null if another request finished it first.
  function settle(match: MatchRow, state: MatchState, forfeit: boolean): DuelSummary | null {
    return store.inTransaction(() => {
      const base = summarize(state, forfeit)
      let rating: DuelSummary['rating'] = null
      const player = store.player(match.playerId) // read inside the lock: never a stale rating
      if (state.rated) {
        const after = eloUpdate(player.rating, state.opponentRating, scoreOf(base.outcome), kFactor(player.games))
        rating = { before: player.rating, after }
      }
      const summary: DuelSummary = { ...base, rating }
      // The final answer carries the summary, so a retry of it replays the result.
      const last = state.answers[state.answers.length - 1]
      if (!forfeit && last) last.final = summary
      if (!store.finishMatch(match.id, state, summary)) return null
      if (rating) {
        store.savePlayer({
          ...player,
          rating: rating.after,
          games: player.games + 1,
          wins: player.wins + (base.outcome === 'win' ? 1 : 0),
          losses: player.losses + (base.outcome === 'loss' ? 1 : 0),
          draws: player.draws + (base.outcome === 'draw' ? 1 : 0),
        })
      }
      return summary
    })
  }

  return {
    store,
    close: () => store.close(),

    me(playerIdRaw: string | null): Reply {
      if (!playerIdRaw || !PLAYER_ID.test(playerIdRaw)) return fail(400, 'bad-request')
      const p = store.player(playerIdRaw)
      const profile: PlayerProfile = {
        rating: p.rating,
        games: p.games,
        wins: p.wins,
        losses: p.losses,
        draws: p.draws,
        placementsLeft: Math.max(0, RATING.placements - p.games),
        recent: store.recent(p.id, DUEL_CONFIG.recentMatches),
      }
      return { status: 200, body: profile }
    },

    async start(payload: unknown): Promise<Reply> {
      if (!isObj(payload) || typeof payload.playerId !== 'string' || !PLAYER_ID.test(payload.playerId)) return fail(400, 'bad-request')
      const mode = MODES.find((m) => m === payload.mode)
      const source = parseSource(payload.source)
      if (!mode || !source) return fail(400, 'bad-request')
      // Ranked and practice play the exam bank; personal plays a notebook.
      if ((mode === 'personal') !== (source.kind === 'notebook')) return fail(400, 'bad-request')
      const playerId = payload.playerId

      for (const left of store.activeMatches(playerId)) settle(left, left.state, true)
      const player = store.player(playerId)
      const matchId = `m${randomBytes(12).toString('hex')}`
      const rand = seededRandom(matchId)
      const rated = mode === 'ranked'
      const opponentRating = rated ? player.rating + Math.round((rand() * 2 - 1) * BOT.ratingSpread) : player.rating

      let base: Omit<MatchQuestion, 'bot'>[]
      let label: string
      if (source.kind === 'exam') {
        const picked = examQuestions(source.exam, player.rating, rand)
        if (!picked) return fail(503, 'bank-empty')
        base = picked.map((q) => {
          const order = shuffle(q.choices.map((_, i) => i), rand)
          return {
            ref: { kind: 'bank', id: q.id },
            section: q.section,
            rating: q.rating,
            limitMs: DUEL_CONFIG.limitMs[q.section],
            passage: q.passage,
            prompt: q.prompt,
            choices: order.map((i) => q.choices[i]),
            correctChoice: order.indexOf(q.answerIndex),
            explanation: q.explanation,
          }
        })
        label = EXAM_LABEL[source.exam]
      } else {
        const doc = opts.docs.store.getDocument(source.documentId)
        if (!doc) return fail(404, 'not-found')
        const built = await notebookQuestions(source.documentId)
        if (!Array.isArray(built)) return built
        base = built
        label = doc.title
      }
      const questions: MatchQuestion[] = base.map((q) => ({ ...q, bot: botMove(rand, opponentRating, q.rating, q.correctChoice, q.choices.length, q.limitMs) }))

      const state: MatchState = {
        source,
        rated,
        playerRating: player.rating,
        opponentRating,
        questions,
        current: 0,
        shownAt: now(),
        answers: [],
        score: { you: 0, opponent: 0 },
      }
      store.insertMatch({ id: matchId, playerId, mode, label, status: 'active', state })
      const started: DuelStarted = {
        matchId,
        mode,
        total: questions.length,
        you: { rating: player.rating },
        opponent: { name: BOT.name, rating: opponentRating },
        question: view(questions[0], 0),
      }
      return { status: 200, body: started }
    },

    answer(payload: unknown): Reply {
      if (!isObj(payload)) return fail(400, 'bad-request')
      const { playerId, matchId, index, choice } = payload
      if (typeof playerId !== 'string' || !PLAYER_ID.test(playerId) || typeof matchId !== 'string' || !MATCH_ID.test(matchId)) return fail(400, 'bad-request')
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0) return fail(400, 'bad-request')
      if (choice !== null && (typeof choice !== 'number' || !Number.isInteger(choice))) return fail(400, 'bad-request')

      const match = store.getMatch(matchId)
      if (!match || match.playerId !== playerId) return fail(404, 'not-found')
      const state = match.state
      // A retry of an answered question gets the first result back, unchanged.
      if (index < state.answers.length) return { status: 200, body: state.answers[index] }
      if (match.status === 'finished' || index !== state.current) return fail(409, 'conflict')
      const q = state.questions[index]
      if (choice !== null && (choice < 0 || choice >= q.choices.length)) return fail(400, 'bad-request')

      const elapsed = Math.max(0, now() - state.shownAt)
      const late = elapsed > q.limitMs + DUEL_CONFIG.graceMs
      const yourChoice = late ? null : choice
      const yourMs = Math.min(elapsed, q.limitMs)
      const youRight = yourChoice === q.correctChoice
      const you: DuelMove = { choice: yourChoice, correct: youRight, ms: yourMs, points: points(youRight, yourMs, q.limitMs) }
      const botRight = q.bot.choice === q.correctChoice
      const opponent: DuelMove = { choice: q.bot.choice, correct: botRight, ms: q.bot.ms, points: points(botRight, q.bot.ms, q.limitMs) }

      state.score = { you: state.score.you + you.points, opponent: state.score.opponent + opponent.points }
      state.current = index + 1
      const done = state.current >= state.questions.length
      if (!done) state.shownAt = now()
      const answered: DuelAnswered = {
        index,
        correctChoice: q.correctChoice,
        explanation: q.explanation,
        you,
        opponent,
        score: { ...state.score },
        next: done ? null : view(state.questions[state.current], state.current),
        final: null,
      }
      state.answers.push(answered)

      // Lost a race with another request for the same answer: return what it stored.
      const saved = done ? settle(match, state, false) !== null : store.saveState(matchId, state, index)
      if (!saved) {
        const settled = store.getMatch(matchId)?.state.answers[index]
        return settled ? { status: 200, body: settled } : fail(409, 'conflict')
      }
      // Bank questions learn their difficulty from every exam answer (once: only the request that saved it gets here).
      if (q.ref.kind === 'bank') {
        store.inTransaction(() => {
          const live = store.getBankQuestion(q.ref.id)
          if (live) store.setBankRating(live.id, questionUpdate(live.rating, state.playerRating, youRight))
        })
      }
      return { status: 200, body: answered }
    },
  }
}

export type DuelService = ReturnType<typeof createDuelService>
