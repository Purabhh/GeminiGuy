import type { ExamId } from '../../shared/duel'

// The Ranked tab's fixed content: game types, exams and the sample
// leaderboard. Your rating, record and matches come from the duel server.

export type GameModeId = 'duel' | 'friend' | 'blitz' | 'practice'

export interface GameMode {
  id: GameModeId
  name: string
  blurb: string
  facts: string[]
  rated: boolean
  playable: boolean // false = needs accounts or live matchmaking first
  color: string
  icon: string
}

export const GAME_MODES: GameMode[] = [
  {
    id: 'duel',
    name: 'Ranked Duel',
    blurb: 'Matched near your rating. Mochee plays you until live matchmaking opens.',
    facts: ['1v1', '7 questions', 'Elo'],
    rated: true,
    playable: true,
    color: '#f28b7a',
    icon: '⚔️',
  },
  {
    id: 'friend',
    name: 'Challenge a Friend',
    blurb: 'Send an invite link or friend code. Still counts for rating.',
    facts: ['1v1', 'Invite link', 'Elo'],
    rated: true,
    playable: false,
    color: '#a98bfa',
    icon: '🤝',
  },
  {
    id: 'blitz',
    name: 'Blitz',
    blurb: 'Two minutes on the clock. Most right answers wins.',
    facts: ['1v1', '2 min', 'Blitz Elo'],
    rated: true,
    playable: false,
    color: '#7fd88a',
    icon: '⚡',
  },
  {
    id: 'practice',
    name: 'Warm-up vs Mochee',
    blurb: 'Same rules, but nothing on the line.',
    facts: ['Solo', '7 questions', 'Unrated'],
    rated: false,
    playable: true,
    color: '#8fd3f0',
    icon: '🍡',
  },
]

export interface Exam {
  id: ExamId
  name: string
  sections: string[]
}

export const EXAMS: Exam[] = [
  { id: 'sat', name: 'SAT', sections: ['Math', 'Reading & Writing'] },
  { id: 'psat', name: 'PSAT/NMSQT', sections: ['Math', 'Reading & Writing'] },
]

export const LATER_EXAMS = ['ACT', 'AP exams']

export interface LeaderRow {
  name: string
  rating: number
}

// Sample rows so the board has a shape; replaced by the real season board once accounts exist.
export const LEADERBOARD: LeaderRow[] = [
  { name: 'priya.k', rating: 1942 },
  { name: 'marcusduels', rating: 1811 },
  { name: 'satslayer', rating: 1764 },
  { name: 'jlee_07', rating: 1630 },
  { name: 'nora.studies', rating: 1588 },
]
