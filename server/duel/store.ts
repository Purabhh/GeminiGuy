import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import type { DuelMode, DuelSummary, ExamId, RecentMatch, Section } from '../../shared/duel.ts'
import { RATING } from '../../shared/rating.ts'
import type { Domain } from './outline.ts'
import type { MatchState } from './types.ts'

// Data access for duels (node:sqlite): the exam question bank, players and
// matches. Settling a match is one IMMEDIATE transaction guarded by the
// match's status, so a replayed or concurrent finish can never apply a rating
// change or a payout twice, even with several server processes on one file.

export interface BankQuestion {
  id: string
  key: string | null // seed key; null for generated questions
  exams: ExamId[]
  section: Section
  domain: Domain
  rating: number
  plays: number
  passage: string | null
  prompt: string
  choices: string[]
  answerIndex: number
  explanation: string
  source: 'seed' | 'gemini'
}

export interface PlayerRow {
  id: string
  rating: number
  games: number // rated games
  wins: number
  losses: number
  draws: number
}

export interface MatchRow {
  id: string
  playerId: string
  mode: DuelMode
  label: string
  status: 'active' | 'finished'
  state: MatchState
  summary: DuelSummary | null
  createdAt: string
  finishedAt: string | null
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS bank_questions (id TEXT PRIMARY KEY, key TEXT UNIQUE, examsJson TEXT NOT NULL, section TEXT NOT NULL, domain TEXT NOT NULL,
  rating INTEGER NOT NULL, plays INTEGER NOT NULL DEFAULT 0, passage TEXT, prompt TEXT NOT NULL, choicesJson TEXT NOT NULL, answerIndex INTEGER NOT NULL,
  explanation TEXT NOT NULL, source TEXT NOT NULL, createdAt TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS bank_section ON bank_questions (section, rating);
CREATE TABLE IF NOT EXISTS players (id TEXT PRIMARY KEY, rating INTEGER NOT NULL, games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0, draws INTEGER NOT NULL DEFAULT 0, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, playerId TEXT NOT NULL, mode TEXT NOT NULL, label TEXT NOT NULL, status TEXT NOT NULL,
  stateJson TEXT NOT NULL, summaryJson TEXT, createdAt TEXT NOT NULL, finishedAt TEXT);
CREATE INDEX IF NOT EXISTS matches_player ON matches (playerId, status, finishedAt);
`

type Row = Record<string, unknown>
const str = (v: unknown) => String(v ?? '')
const num = (v: unknown) => Number(v ?? 0)

function toBank(r: Row): BankQuestion {
  return {
    id: str(r.id),
    key: r.key === null || r.key === undefined ? null : str(r.key),
    exams: JSON.parse(str(r.examsJson)) as ExamId[],
    section: r.section === 'rw' ? 'rw' : 'math',
    domain: str(r.domain) as Domain,
    rating: num(r.rating),
    plays: num(r.plays),
    passage: r.passage === null || r.passage === undefined ? null : str(r.passage),
    prompt: str(r.prompt),
    choices: JSON.parse(str(r.choicesJson)) as string[],
    answerIndex: num(r.answerIndex),
    explanation: str(r.explanation),
    source: r.source === 'gemini' ? 'gemini' : 'seed',
  }
}

function toPlayer(r: Row): PlayerRow {
  return { id: str(r.id), rating: num(r.rating), games: num(r.games), wins: num(r.wins), losses: num(r.losses), draws: num(r.draws) }
}

function toMatch(r: Row): MatchRow {
  return {
    id: str(r.id),
    playerId: str(r.playerId),
    mode: str(r.mode) as DuelMode,
    label: str(r.label),
    status: r.status === 'finished' ? 'finished' : 'active',
    state: JSON.parse(str(r.stateJson)) as MatchState,
    summary: r.summaryJson ? (JSON.parse(str(r.summaryJson)) as DuelSummary) : null,
    createdAt: str(r.createdAt),
    finishedAt: r.finishedAt ? str(r.finishedAt) : null,
  }
}

export type DuelStore = ReturnType<typeof openDuelStore>

export function openDuelStore(dbPath: string) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;')
  db.exec(SCHEMA)

  // IMMEDIATE takes the write lock up front, so two settles never interleave a read and a write.
  const inTransaction = <T>(fn: () => T): T => {
    db.exec('BEGIN IMMEDIATE')
    try {
      const out = fn()
      db.exec('COMMIT')
      return out
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }

  const now = () => new Date().toISOString()

  return {
    close: () => db.close(),
    inTransaction,

    // ---- Bank

    // Inserts each question unless one with the same seed key (or the same prompt) is already there. Returns how many were added.
    addBankQuestions(questions: Omit<BankQuestion, 'plays'>[]): number {
      return inTransaction(() => {
        const exists = db.prepare('SELECT 1 FROM bank_questions WHERE key = ? OR prompt = ? AND COALESCE(passage, \'\') = ?')
        const insert = db.prepare(
          'INSERT INTO bank_questions (id, key, examsJson, section, domain, rating, passage, prompt, choicesJson, answerIndex, explanation, source, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )
        let added = 0
        for (const q of questions) {
          if (exists.get(q.key, q.prompt, q.passage ?? '')) continue
          insert.run(q.id, q.key, JSON.stringify(q.exams), q.section, q.domain, Math.round(q.rating), q.passage, q.prompt, JSON.stringify(q.choices), q.answerIndex, q.explanation, q.source, now())
          added++
        }
        return added
      })
    },

    bankFor(exam: ExamId): BankQuestion[] {
      return (db.prepare('SELECT * FROM bank_questions ORDER BY id').all() as Row[]).map(toBank).filter((q) => q.exams.includes(exam))
    },

    bankCount(): number {
      return num((db.prepare('SELECT COUNT(*) AS n FROM bank_questions').get() as Row).n)
    },

    getBankQuestion(id: string): BankQuestion | null {
      const r = db.prepare('SELECT * FROM bank_questions WHERE id = ?').get(id) as Row | undefined
      return r ? toBank(r) : null
    },

    // A question's difficulty after one answer; read and written under the caller's transaction.
    setBankRating(id: string, rating: number) {
      db.prepare('UPDATE bank_questions SET rating = ?, plays = plays + 1 WHERE id = ?').run(Math.round(rating), id)
    },

    // ---- Players

    // The player, created at the starting rating on first sight.
    player(id: string): PlayerRow {
      db.prepare('INSERT OR IGNORE INTO players (id, rating, createdAt, updatedAt) VALUES (?, ?, ?, ?)').run(id, RATING.start, now(), now())
      return toPlayer(db.prepare('SELECT * FROM players WHERE id = ?').get(id) as Row)
    },

    savePlayer(p: PlayerRow) {
      db.prepare('UPDATE players SET rating = ?, games = ?, wins = ?, losses = ?, draws = ?, updatedAt = ? WHERE id = ?').run(p.rating, p.games, p.wins, p.losses, p.draws, now(), p.id)
    },

    // ---- Matches

    insertMatch(m: Omit<MatchRow, 'summary' | 'finishedAt' | 'createdAt'>) {
      db.prepare('INSERT INTO matches (id, playerId, mode, label, status, stateJson, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(m.id, m.playerId, m.mode, m.label, m.status, JSON.stringify(m.state), now())
    },

    getMatch(id: string): MatchRow | null {
      const r = db.prepare('SELECT * FROM matches WHERE id = ?').get(id) as Row | undefined
      return r ? toMatch(r) : null
    },

    activeMatches(playerId: string): MatchRow[] {
      return (db.prepare("SELECT * FROM matches WHERE playerId = ? AND status = 'active'").all(playerId) as Row[]).map(toMatch)
    },

    // Saves progress on an active match, only if it is still on question `from`
    // (optimistic check). False if another request moved it on or finished it first.
    saveState(id: string, state: MatchState, from: number): boolean {
      const res = db
        .prepare("UPDATE matches SET stateJson = ? WHERE id = ? AND status = 'active' AND json_extract(stateJson, '$.current') = ?")
        .run(JSON.stringify(state), id, from)
      return Number(res.changes) === 1
    },

    // Marks the match finished with its summary. False if it already was: the caller must then apply nothing.
    finishMatch(id: string, state: MatchState, summary: DuelSummary): boolean {
      const res = db.prepare("UPDATE matches SET status = 'finished', stateJson = ?, summaryJson = ?, finishedAt = ? WHERE id = ? AND status = 'active'").run(JSON.stringify(state), JSON.stringify(summary), now(), id)
      return Number(res.changes) === 1
    },

    recent(playerId: string, limit: number): RecentMatch[] {
      const rows = db.prepare("SELECT * FROM matches WHERE playerId = ? AND status = 'finished' ORDER BY finishedAt DESC LIMIT ?").all(playerId, limit) as Row[]
      return rows.map(toMatch).map((m) => ({
        matchId: m.id,
        mode: m.mode,
        label: m.label,
        outcome: m.summary?.outcome ?? 'loss',
        you: m.summary?.you ?? 0,
        opponent: m.summary?.opponent ?? 0,
        ratingDelta: m.summary?.rating ? m.summary.rating.after - m.summary.rating.before : null,
        finishedAt: m.finishedAt ?? m.createdAt,
      }))
    },
  }
}
