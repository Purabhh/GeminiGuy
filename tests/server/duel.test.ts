import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { DUEL_CONFIG, type DuelAnswered, type DuelStarted, type PlayerProfile } from '../../shared/duel.ts'
import { eloUpdate, expectedScore, kFactor, questionUpdate, RATING, tierOf } from '../../shared/rating.ts'
import type { GeminiCall } from '../../server/docs/gemini.ts'
import { createDocsService } from '../../server/docs/service.ts'
import { chunkPage } from '../../server/docs/text.ts'
import type { GeminiFn } from '../../server/docs/tutor.ts'
import { botMove } from '../../server/duel/bot.ts'
import { createDuelService } from '../../server/duel/engine.ts'
import { growBank } from '../../server/duel/generate.ts'
import { SEED_QUESTIONS } from '../../server/duel/seed.ts'
import { seededRandom } from '../../server/docs/text.ts'

const PLAYER = `p${'a'.repeat(24)}`
const OTHER = `p${'b'.repeat(24)}`

// ---- Rating math

test('expected score is 0.5 for equal ratings and symmetric', () => {
  assert.equal(expectedScore(1200, 1200), 0.5)
  assert.ok(Math.abs(expectedScore(1400, 1000) + expectedScore(1000, 1400) - 1) < 1e-12)
  assert.ok(expectedScore(1400, 1000) > 0.9)
})

test('elo moves ratings by K times the surprise, and an upset moves more', () => {
  assert.equal(eloUpdate(1000, 1000, 1, 24), 1012)
  assert.equal(eloUpdate(1000, 1000, 0, 24), 988)
  assert.equal(eloUpdate(1000, 1000, 0.5, 24), 1000)
  const upset = eloUpdate(1000, 1400, 1, 24) - 1000
  const expected = eloUpdate(1400, 1000, 1, 24) - 1400
  assert.ok(upset > expected)
  assert.equal(eloUpdate(RATING.floor, 2000, 0, 48), RATING.floor)
})

test('placements use the bigger K, and tiers follow rating', () => {
  assert.equal(kFactor(0), RATING.kPlacement)
  assert.equal(kFactor(RATING.placements), RATING.kSettled)
  assert.equal(tierOf(1000).id, 'bronze')
  assert.equal(tierOf(1300).id, 'gold')
  assert.equal(tierOf(2400).id, 'mochi')
})

test('a question gets easier when answered right and harder when missed', () => {
  assert.ok(questionUpdate(1100, 1100, true) < 1100)
  assert.ok(questionUpdate(1100, 1100, false) > 1100)
})

// ---- Mochee bot

test('the bot is deterministic per seed and does better on easy questions', () => {
  const moves = (seed: string, q: number) => {
    const rand = seededRandom(seed)
    return Array.from({ length: 400 }, () => botMove(rand, 1000, q, 0, 4, 60_000))
  }
  assert.deepEqual(moves('m1', 1000), moves('m1', 1000))
  const rate = (q: number) => moves('m2', q).filter((m) => m.choice === 0).length
  assert.ok(rate(700) > rate(1400))
  for (const m of moves('m3', 1000)) assert.ok(m.ms > 0 && m.ms <= 60_000)
})

// ---- Engine

function fixture(t: { after: (fn: () => void) => void }, gemini?: GeminiFn) {
  const dataDir = mkdtempSync(join(tmpdir(), 'gg-duel-'))
  const docs = createDocsService({ dataDir, readKey: () => (gemini ? 'test-only' : null), gemini })
  let clock = 1_000_000
  const duel = createDuelService({ dataDir, docs, now: () => clock })
  t.after(() => {
    duel.close()
    docs.close()
    rmSync(dataDir, { recursive: true, force: true })
  })
  return { duel, docs, tick: (ms: number) => (clock += ms) }
}

const start = async (duel: ReturnType<typeof fixture>['duel'], body: object) => {
  const reply = await duel.start(body)
  assert.equal(reply.status, 200, JSON.stringify(reply.body))
  return reply.body as DuelStarted
}

// Plays a whole match, answering right when `right(i)` says so.
function play(f: ReturnType<typeof fixture>, matchId: string, total: number, right: (i: number) => boolean, playerId = PLAYER): DuelAnswered {
  let last: DuelAnswered | null = null
  for (let i = 0; i < total; i++) {
    const q = f.duel.store.getMatch(matchId)!.state.questions[i]
    f.tick(5_000)
    const choice = right(i) ? q.correctChoice : (q.correctChoice + 1) % q.choices.length
    const reply = f.duel.answer({ playerId, matchId, index: i, choice })
    assert.equal(reply.status, 200)
    last = reply.body as DuelAnswered
  }
  return last!
}

test('the starter bank is seeded once and has enough of each section for a match', (t) => {
  const f = fixture(t)
  assert.equal(f.duel.store.bankCount(), SEED_QUESTIONS.length)
  for (const exam of ['sat', 'psat'] as const) {
    const bank = f.duel.store.bankFor(exam)
    assert.ok(bank.filter((q) => q.section === 'math').length >= Math.ceil(DUEL_CONFIG.questions.exam / 2))
    assert.ok(bank.filter((q) => q.section === 'rw').length >= Math.floor(DUEL_CONFIG.questions.exam / 2))
  }
  for (const q of SEED_QUESTIONS) assert.equal(new Set(q.choices).size, 4, q.key)
})

test('a ranked match never sends answers early and settles rating exactly once', async (t) => {
  const f = fixture(t)
  const started = await start(f.duel, { playerId: PLAYER, mode: 'ranked', source: { kind: 'exam', exam: 'sat' } })
  assert.equal(started.total, DUEL_CONFIG.questions.exam)
  const wire = JSON.stringify(started)
  assert.ok(!/correct|answer|explanation|bot/i.test(wire), wire)

  const last = play(f, started.matchId, started.total, () => true)
  assert.ok(last.final)
  assert.ok(last.final.rating)
  const profile = f.duel.me(PLAYER).body as PlayerProfile
  assert.equal(profile.games, 1)
  assert.equal(profile.rating, last.final.rating.after)
  assert.equal(profile.recent.length, 1)

  // Replaying the last answer returns the same result and changes nothing.
  const replay = f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: started.total - 1, choice: 0 })
  assert.deepEqual(replay.body, last)
  assert.equal((f.duel.me(PLAYER).body as PlayerProfile).games, 1)
  assert.equal(f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: started.total, choice: 0 }).status, 409)
})

test('the server clock decides timeouts, whatever the client sends', async (t) => {
  const f = fixture(t)
  const started = await start(f.duel, { playerId: PLAYER, mode: 'practice', source: { kind: 'exam', exam: 'psat' } })
  const q = f.duel.store.getMatch(started.matchId)!.state.questions[0]
  f.tick(q.limitMs + DUEL_CONFIG.graceMs + 1)
  const out = f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: 0, choice: q.correctChoice }).body as DuelAnswered
  assert.equal(out.you.choice, null)
  assert.equal(out.you.correct, false)
  assert.equal(out.you.points, 0)
})

test('answers go in order, only from the match owner, and practice is unrated', async (t) => {
  const f = fixture(t)
  const started = await start(f.duel, { playerId: PLAYER, mode: 'practice', source: { kind: 'exam', exam: 'sat' } })
  assert.equal(f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: 1, choice: 0 }).status, 409)
  assert.equal(f.duel.answer({ playerId: OTHER, matchId: started.matchId, index: 0, choice: 0 }).status, 404)
  assert.equal(f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: 0, choice: 9 }).status, 400)
  const last = play(f, started.matchId, started.total, () => true)
  assert.equal(last.final?.rating, null)
  assert.equal(last.final?.coins, 0)
  assert.equal((f.duel.me(PLAYER).body as PlayerProfile).games, 0)
})

test('a quick right answer earns a speed bonus on top of the base points', async (t) => {
  const f = fixture(t)
  const started = await start(f.duel, { playerId: PLAYER, mode: 'ranked', source: { kind: 'exam', exam: 'sat' } })
  const q = f.duel.store.getMatch(started.matchId)!.state.questions[0]
  f.tick(1_000)
  const fast = f.duel.answer({ playerId: PLAYER, matchId: started.matchId, index: 0, choice: q.correctChoice }).body as DuelAnswered
  assert.ok(fast.you.points > DUEL_CONFIG.points.correct)
  assert.ok(fast.you.points <= DUEL_CONFIG.points.correct + DUEL_CONFIG.points.speedMax)
})

test('starting a new match forfeits an unfinished ranked one as a loss', async (t) => {
  const f = fixture(t)
  const first = await start(f.duel, { playerId: PLAYER, mode: 'ranked', source: { kind: 'exam', exam: 'sat' } })
  await start(f.duel, { playerId: PLAYER, mode: 'practice', source: { kind: 'exam', exam: 'sat' } })
  const old = f.duel.store.getMatch(first.matchId)!
  assert.equal(old.status, 'finished')
  assert.equal(old.summary?.outcome, 'loss')
  const profile = f.duel.me(PLAYER).body as PlayerProfile
  assert.equal(profile.losses, 1)
  assert.ok(profile.rating < RATING.start)
})

test('mode and source must match, and bad input is refused', async (t) => {
  const f = fixture(t)
  const bad = [
    { playerId: PLAYER, mode: 'ranked', source: { kind: 'notebook', documentId: 'a'.repeat(16) } },
    { playerId: PLAYER, mode: 'personal', source: { kind: 'exam', exam: 'sat' } },
    { playerId: 'nope', mode: 'ranked', source: { kind: 'exam', exam: 'sat' } },
    { playerId: PLAYER, mode: 'ranked', source: { kind: 'exam', exam: 'act' } },
  ]
  for (const body of bad) assert.equal((await f.duel.start(body)).status, 400)
  assert.equal(f.duel.me('x').status, 400)
})

test('a personal notebook duel quizzes the document and pays coins, never rating', async (t) => {
  const documentId = 'cccccccccccccccc'
  const passage = 'First come first served runs jobs in arrival order. Shortest job first picks the job with the least work. Round robin gives each job a fixed time slice in turn.'
  const chunks = chunkPage(documentId, 1, passage)
  const gemini: GeminiFn = async () => ({
    ok: true,
    json: {
      questions: [
        { sourceId: chunks[0].id, quote: 'First come first served runs jobs in arrival order.', prompt: 'Which policy runs jobs in arrival order?', choices: ['FCFS', 'SJF', 'Round robin', 'Priority'], answerIndex: 0, explanation: 'FCFS runs jobs as they arrive.' },
        { sourceId: chunks[0].id, quote: 'Shortest job first picks the job with the least work.', prompt: 'Which policy picks the job with the least work?', choices: ['SJF', 'FCFS', 'Round robin', 'Lottery'], answerIndex: 0, explanation: 'SJF picks the shortest job.' },
      ],
    },
  })
  const f = fixture(t, gemini)
  f.docs.store.insertDocument({ id: documentId, title: 'Scheduling notes', savedPath: 'uploads/x.txt', pageCount: 1, createdAt: new Date().toISOString(), tutorId: 'test-class', kind: 'class' },
    [passage], chunks, [{ id: `${documentId}-t1`, documentId, title: 'Scheduling', keywords: ['scheduling'], firstPage: 1 }])
  const started = await start(f.duel, { playerId: PLAYER, mode: 'personal', source: { kind: 'notebook', documentId } })
  assert.ok(started.total >= 2 && started.total <= DUEL_CONFIG.questions.notebook)
  const last = play(f, started.matchId, started.total, () => true)
  assert.equal(last.final?.rating, null)
  assert.ok((last.final?.coins ?? 0) >= started.total * DUEL_CONFIG.coins.perCorrect)
  const profile = f.duel.me(PLAYER).body as PlayerProfile
  assert.equal(profile.games, 0)
  assert.equal(profile.recent[0].label, 'Scheduling notes')
})

// ---- Bank generator

test('generated questions are kept only when a cold solve agrees', async (t) => {
  const f = fixture(t)
  const before = f.duel.store.bankCount()
  const written = {
    questions: [
      { skill: 'linear equations', difficulty: 'easy', passage: '', prompt: 'If 5x = 35, what is x?', choices: ['7', '5', '30', '40'], answerIndex: 0, explanation: 'Divide both sides by 5.' },
      { skill: 'linear equations', difficulty: 'hard', passage: '', prompt: 'If 2x + 1 = 9, what is x?', choices: ['3', '4', '5', '8'], answerIndex: 0, explanation: 'Wrong key on purpose.' },
    ],
  }
  const gemini: GeminiFn = async (call: GeminiCall) => {
    if (call.schema === undefined || !('work' in (call.schema.properties as object))) return { ok: true, json: written }
    // The solver sees choices reversed; it picks the truly right one each time.
    const lines = call.user.split('\n').filter((l) => /^\d\. /.test(l))
    const right = call.user.includes('5x = 35') ? '7' : '4'
    return { ok: true, json: { work: 'solved', answerIndex: lines.findIndex((l) => l.endsWith(` ${right}`)) } }
  }
  const r = await growBank({ store: f.duel.store, gemini, key: 'test-only', domain: 'algebra', count: 2, examples: SEED_QUESTIONS.slice(0, 2) })
  assert.equal(r.written, 2)
  assert.equal(r.verified, 1)
  assert.equal(r.added, 1)
  assert.equal(r.rejected[0].reason, 'solver disagreed')
  assert.equal(f.duel.store.bankCount(), before + 1)
})
