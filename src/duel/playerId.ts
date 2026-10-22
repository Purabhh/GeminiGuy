import { PLAYER_ID } from '../../shared/duel'
import { safeStorage } from '../state/progress'

// An anonymous player id until accounts exist: random, made once and kept in
// localStorage. The server keys ratings and match history by it, so the swap
// to real accounts is one column. Blocked storage = a fresh id per visit.

const KEY = 'mochee-player-id'
let cached: string | null = null

export function playerId(): string {
  if (cached) return cached
  const stored = safeStorage.getItem(KEY)
  if (typeof stored === 'string' && PLAYER_ID.test(stored)) return (cached = stored)
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  cached = `p${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`
  safeStorage.setItem(KEY, cached)
  return cached
}
