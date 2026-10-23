import type { DuelAnswered, DuelSource, Section } from '../../shared/duel.ts'

// A match's server-side state. Stored whole as JSON on the match row; the
// client only ever sees DuelQuestion views of it and each DuelAnswered once
// it has answered.

export interface MatchQuestion {
  ref: { kind: 'bank' | 'notebook'; id: string }
  section: Section | 'notebook'
  rating: number // difficulty when the match started
  limitMs: number
  passage: string | null
  prompt: string
  choices: string[] // in the order shown in this match
  correctChoice: number // index into `choices`
  explanation: string
  bot: { choice: number | null; ms: number } // Mochee's move, fixed at the start; null = runs out of time
}

export interface MatchState {
  source: DuelSource
  rated: boolean
  playerRating: number // at the start
  opponentRating: number
  questions: MatchQuestion[]
  current: number // index of the question being played
  shownAt: number // server time (ms) the current question went out
  answers: DuelAnswered[] // one per answered question, replayed verbatim on a retry
  score: { you: number; opponent: number }
}
