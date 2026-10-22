// Ranked preview data. No accounts or match server yet: everything on the
// Ranked tab reads from here so the real API can swap in later.

export interface Tier {
  id: string
  name: string
  min: number // Elo at which the tier starts
  color: string
}

export const TIERS: Tier[] = [
  { id: 'bronze', name: 'Bronze', min: 0, color: '#d79a6a' },
  { id: 'silver', name: 'Silver', min: 1100, color: '#c3c8d2' },
  { id: 'gold', name: 'Gold', min: 1300, color: '#ffc83d' },
  { id: 'platinum', name: 'Platinum', min: 1500, color: '#7fd8c8' },
  { id: 'diamond', name: 'Diamond', min: 1700, color: '#8fb8ff' },
  { id: 'mochi', name: 'Mochi Master', min: 1900, color: '#ff8fab' },
]

export const PLAYER = {
  name: 'You',
  rating: 1000, // provisional until placements are done
  placementsDone: 0,
  placementsTotal: 5,
  wins: 0,
  losses: 0,
}

export type GameModeId = 'duel' | 'friend' | 'blitz' | 'practice'

export interface GameMode {
  id: GameModeId
  name: string
  blurb: string
  facts: string[]
  rated: boolean
  color: string
  icon: string
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'duel',
    name: 'Ranked Duel',
    blurb: 'Queue up and get matched with someone near your rating.',
    facts: ['1v1', '10 questions', 'Elo'],
    rated: true,
    color: '#f28b7a',
    icon: '⚔️',
  },
  {
    id: 'friend',
    name: 'Challenge a Friend',
    blurb: 'Send an invite link or friend code. Still counts for rating.',
    facts: ['1v1', 'Invite link', 'Elo'],
    rated: true,
    color: '#a98bfa',
    icon: '🤝',
  },
  {
    id: 'blitz',
    name: 'Blitz',
    blurb: 'Two minutes on the clock. Most right answers wins.',
    facts: ['1v1', '2 min', 'Blitz Elo'],
    rated: true,
    color: '#7fd88a',
    icon: '⚡',
  },
  {
    id: 'practice',
    name: 'Warm-up vs Mochee',
    blurb: 'Same rules, but against Mochee. Nothing on the line.',
    facts: ['Solo', '10 questions', 'Unrated'],
    rated: false,
    color: '#8fd3f0',
    icon: '🍡',
  },
]

export interface Exam {
  id: string
  name: string
  sections: string[]
  available: boolean
}

export const EXAMS: Exam[] = [
  { id: 'sat', name: 'SAT', sections: ['Math', 'Reading & Writing'], available: false },
  { id: 'psat', name: 'PSAT/NMSQT', sections: ['Math', 'Reading & Writing'], available: false },
]

export const LATER_EXAMS = ['ACT', 'AP exams']

export interface LeaderRow {
  name: string
  rating: number
  wins: number
}

// Sample rows so the board has a shape; replaced by the real season board.
export const LEADERBOARD: LeaderRow[] = [
  { name: 'priya.k', rating: 1942, wins: 88 },
  { name: 'marcusduels', rating: 1811, wins: 71 },
  { name: 'satslayer', rating: 1764, wins: 64 },
  { name: 'jlee_07', rating: 1630, wins: 52 },
  { name: 'nora.studies', rating: 1588, wins: 47 },
]

export const tierOf = (rating: number) => [...TIERS].reverse().find((t) => rating >= t.min) ?? TIERS[0]
