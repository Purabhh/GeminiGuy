import { expectedScore } from '../../shared/rating.ts'

// Mochee as an opponent. Whether he gets a question right is a weighted coin:
// his rating against the question's difficulty, on the same Elo curve players
// use. Easy questions he answers fast, hard ones slower; a wrong answer is a
// random wrong choice. Every move is drawn when the match starts, from the
// match's own seeded random, and stays on the server until you answer.

export const BOT = {
  name: 'Mochee',
  accuracy: { min: 0.2, max: 0.92 }, // never perfect, never hopeless
  speed: { fastest: 0.18, slowest: 0.8 }, // share of the time limit
  jitter: 0.12,
  timeoutChance: 0.04, // now and then he just runs out of time
  ratingSpread: 60, // ranked: his rating lands within this of yours
} as const

export interface BotMove {
  choice: number | null
  ms: number
}

export function botMove(rand: () => number, botRating: number, questionRating: number, correctChoice: number, choiceCount: number, limitMs: number): BotMove {
  if (rand() < BOT.timeoutChance) return { choice: null, ms: limitMs }
  const p = Math.min(BOT.accuracy.max, Math.max(BOT.accuracy.min, expectedScore(botRating, questionRating)))
  const right = rand() < p
  // Harder (lower p) = slower; jitter keeps him from feeling robotic.
  const share = BOT.speed.fastest + (BOT.speed.slowest - BOT.speed.fastest) * (1 - p) + (rand() - 0.5) * BOT.jitter
  const ms = Math.round(Math.min(0.95, Math.max(0.1, share)) * limitMs)
  if (right) return { choice: correctChoice, ms }
  const wrong = Array.from({ length: choiceCount }, (_, i) => i).filter((i) => i !== correctChoice)
  return { choice: wrong[Math.floor(rand() * wrong.length)], ms }
}
