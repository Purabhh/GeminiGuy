import { DUEL_ROUTES, type DuelAnswerRequest, type DuelAnswered, type DuelStartRequest, type DuelStarted, type PlayerProfile } from '../../shared/duel'
import { postJson, request } from '../ui/Drawers/docsClient'
import { playerId } from './playerId'

// Browser client for the duel engine (server/duel/**). Same { ok, data } /
// { ok: false, error } results as the documents client.

const START_TIMEOUT_MS = 45_000 // a notebook duel writes its questions with Gemini first

export const fetchProfile = () => request<PlayerProfile>(`${DUEL_ROUTES.me}?playerId=${encodeURIComponent(playerId())}`)

export const startDuel = (req: Omit<DuelStartRequest, 'playerId'>) =>
  postJson<DuelStarted>(DUEL_ROUTES.start, { ...req, playerId: playerId() }, START_TIMEOUT_MS)

export const answerDuel = (req: Omit<DuelAnswerRequest, 'playerId'>) => postJson<DuelAnswered>(DUEL_ROUTES.answer, { ...req, playerId: playerId() })
