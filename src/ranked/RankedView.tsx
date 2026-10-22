import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { DocumentInfo } from '../../shared/docsTypes'
import type { DuelMode, DuelSource, PlayerProfile } from '../../shared/duel'
import { fetchProfile } from '../duel/api'
import { listDocuments } from '../ui/Drawers/docsClient'
import { GameModes } from './GameModes'
import { Leaderboard } from './Leaderboard'
import { GAME_MODES, type GameModeId } from './mockData'
import { RankHero } from './RankHero'
import { SourcePicker } from './SourcePicker'
import s from './Ranked.module.css'

// The home page's Ranked tab: your rank, then pick a game type and a question
// source, then play. Ranked Duel and Warm-up are live against Mochee; Friend
// and Blitz wait for accounts and live matchmaking.

// The duel a game type + source makes, or why it can't be played yet.
function duelFor(game: GameModeId, source: DuelSource | null): { mode: DuelMode; url: string } | { blocked: string } {
  if (game === 'friend' || game === 'blitz') return { blocked: 'Needs accounts. Coming soon.' }
  if (!source) return { blocked: 'Pick an exam or one of your notebooks.' }
  if (source.kind === 'notebook') return { mode: 'personal', url: `/duel?mode=personal&doc=${source.documentId}` }
  const mode: DuelMode = game === 'duel' ? 'ranked' : 'practice'
  return { mode, url: `/duel?mode=${mode}&exam=${source.exam}` }
}

const HINT: Record<DuelMode, string> = {
  ranked: 'Rated · your Elo moves with the result',
  practice: 'Unrated warm-up · nothing on the line',
  personal: 'Personal · coins for every right answer, no rating',
}

export function RankedView() {
  const navigate = useNavigate()
  const [game, setGame] = useState<GameModeId>('duel')
  const [source, setSource] = useState<DuelSource | null>({ kind: 'exam', exam: 'sat' })
  const [profile, setProfile] = useState<PlayerProfile | null>(null)
  const [notebooks, setNotebooks] = useState<DocumentInfo[] | null>(null)

  useEffect(() => {
    let live = true
    void fetchProfile().then((r) => live && r.ok && setProfile(r.data))
    void listDocuments().then((r) => live && setNotebooks(r.ok ? r.data : []))
    return () => {
      live = false
    }
  }, [])

  const current = GAME_MODES.find((m) => m.id === game) ?? GAME_MODES[0]
  const duel = duelFor(game, source)
  const label = 'url' in duel ? (duel.mode === 'personal' ? 'Start personal duel' : duel.mode === 'practice' ? 'Start warm-up' : 'Find match') : game === 'friend' ? 'Copy invite link' : 'Find match'

  return (
    <div className={s.layout}>
      <div className={s.main}>
        <RankHero profile={profile} />

        <section className={s.block}>
          <div className={s.blockHead}>
            <span className={s.step}>1</span>
            <span className={s.blockTitle}>Pick a game type</span>
          </div>
          <GameModes selected={game} onSelect={setGame} />
        </section>

        <section className={s.block}>
          <div className={s.blockHead}>
            <span className={s.step}>2</span>
            <span className={s.blockTitle}>Pick your questions</span>
          </div>
          <SourcePicker selected={source} onSelect={setSource} notebooks={notebooks} />
        </section>

        <div className={s.matchBar}>
          <div className={s.matchSummary}>
            <span className={s.matchMode}>{current.name}</span>
            <span className={s.matchHint}>{'url' in duel ? HINT[duel.mode] : duel.blocked}</span>
          </div>
          <button type="button" className={s.matchButton} disabled={!('url' in duel)} onClick={() => 'url' in duel && navigate(duel.url)}>
            {label}
          </button>
        </div>
      </div>

      <Leaderboard profile={profile} />
    </div>
  )
}
