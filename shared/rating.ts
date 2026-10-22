// Elo ratings for duels, shared by the match engine and the UI. Pure
// functions: no clock, no randomness, no storage.

export const RATING = {
  start: 1000, // every new player, and every notebook question
  placements: 5, // rated games before a player gets a tier
  kPlacement: 48, // big swings while placing, so a strong player climbs fast
  kSettled: 24,
  kQuestion: 12, // a bank question's difficulty moves slowly
  floor: 100, // nobody drops below this
  scale: 400, // a 400-point gap = 10:1 expected odds
} as const

export type Outcome = 'win' | 'loss' | 'draw'

export const scoreOf = (outcome: Outcome): number => (outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0)

// Chance that a player rated `a` beats one rated `b`.
export function expectedScore(a: number, b: number): number {
  return 1 / (1 + 10 ** ((b - a) / RATING.scale))
}

export const kFactor = (gamesPlayed: number): number => (gamesPlayed < RATING.placements ? RATING.kPlacement : RATING.kSettled)

// The new rating after one game. `score` is 1 win, 0.5 draw, 0 loss.
export function eloUpdate(rating: number, opponent: number, score: number, k: number): number {
  const next = rating + k * (score - expectedScore(rating, opponent))
  return Math.max(RATING.floor, Math.round(next))
}

// A bank question plays a mini game against each answer: a right answer is a
// loss for the question (it gets easier), a wrong one a win (it gets harder).
export function questionUpdate(questionRating: number, playerRating: number, correct: boolean): number {
  return eloUpdate(questionRating, playerRating, correct ? 0 : 1, RATING.kQuestion)
}

export interface Tier {
  id: string
  name: string
  min: number // rating at which the tier starts
  color: string
}

export const TIERS: readonly Tier[] = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#d79a6a' },
  { id: 'silver', name: 'Silver', min: 1100, color: '#c3c8d2' },
  { id: 'gold', name: 'Gold', min: 1300, color: '#ffc83d' },
  { id: 'platinum', name: 'Platinum', min: 1500, color: '#7fd8c8' },
  { id: 'diamond', name: 'Diamond', min: 1700, color: '#8fb8ff' },
  { id: 'mochi', name: 'Mochi Master', min: 1900, color: '#ff8fab' },
]

export const tierOf = (rating: number): Tier => [...TIERS].reverse().find((t) => rating >= t.min) ?? TIERS[0]
