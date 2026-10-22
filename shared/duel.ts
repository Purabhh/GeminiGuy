import type { Outcome } from './rating.ts'

// Contract between the duel engine (server/duel/**) and the UI. The server
// runs the match: it picks the questions, keeps the answers and Mochee's
// moves until you have answered, times every question on its own clock, and
// settles rating and coins exactly once when the match ends.

export const DUEL_ROUTES = {
  me: '/api/duel/me', // GET ?playerId= -> PlayerProfile
  start: '/api/duel/start', // POST DuelStartRequest -> DuelStarted
  answer: '/api/duel/answer', // POST DuelAnswerRequest -> DuelAnswered
} as const

export const DUEL_CONFIG = {
  questions: { exam: 7, notebook: 5 },
  limitMs: { math: 60_000, rw: 45_000, notebook: 25_000 },
  graceMs: 1_500, // network slack on the server's clock before an answer counts as out of time
  points: { correct: 100, speedMax: 50 }, // a right answer: 100, plus up to 50 for time left
  coins: { perCorrect: 10, win: 30, draw: 15 }, // Personal (notebook) duels only
  recentMatches: 5,
} as const

export const PLAYER_ID = /^p[a-f0-9]{24}$/
export const MATCH_ID = /^m[a-f0-9]{24}$/

export type ExamId = 'sat' | 'psat'
export type Section = 'math' | 'rw'

// What the questions come from. An exam duel draws from the question bank; a
// notebook duel quizzes one of your uploaded documents.
export type DuelSource = { kind: 'exam'; exam: ExamId } | { kind: 'notebook'; documentId: string }

// ranked: exam bank, moves your rating. practice: exam bank, nothing on the
// line. personal: your notebook, pays coins, never rated.
export type DuelMode = 'ranked' | 'practice' | 'personal'

export interface DuelStartRequest {
  playerId: string
  mode: DuelMode
  source: DuelSource
}

// A question as the client sees it: no answer.
export interface DuelQuestion {
  index: number
  prompt: string
  passage: string | null
  choices: string[]
  section: Section | 'notebook'
  limitMs: number
}

export interface DuelStarted {
  matchId: string
  mode: DuelMode
  total: number
  you: { rating: number }
  opponent: { name: string; rating: number }
  question: DuelQuestion
}

export interface DuelAnswerRequest {
  playerId: string
  matchId: string
  index: number
  choice: number | null // null = time ran out
}

export interface DuelMove {
  choice: number | null
  correct: boolean
  ms: number
  points: number
}

export interface DuelSummary {
  outcome: Outcome
  you: number // total points
  opponent: number
  correct: number // your right answers
  total: number
  rating: { before: number; after: number } | null // ranked only
  coins: number // personal only; 0 otherwise
}

export interface DuelAnswered {
  index: number
  correctChoice: number
  explanation: string
  you: DuelMove
  opponent: DuelMove
  score: { you: number; opponent: number }
  next: DuelQuestion | null
  final: DuelSummary | null
}

export interface RecentMatch {
  matchId: string
  mode: DuelMode
  label: string // "SAT", "PSAT" or the notebook title
  outcome: Outcome
  you: number
  opponent: number
  ratingDelta: number | null
  finishedAt: string
}

export interface PlayerProfile {
  rating: number
  games: number // rated games
  wins: number
  losses: number
  draws: number
  placementsLeft: number
  recent: RecentMatch[]
}

export const EXAM_LABEL: Record<ExamId, string> = { sat: 'SAT', psat: 'PSAT/NMSQT' }
