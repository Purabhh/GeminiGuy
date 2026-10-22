import { useState } from 'react'
import { ExamPicker } from './ExamPicker'
import { GameModes } from './GameModes'
import { Leaderboard } from './Leaderboard'
import { GAME_MODES, type GameModeId } from './mockData'
import { RankHero } from './RankHero'
import s from './Ranked.module.css'

// The home page's Ranked tab: a UI preview. Game types are selectable; exams
// are locked, so the match button stays disabled until the SAT/PSAT bank ships.
export function RankedView() {
  const [mode, setMode] = useState<GameModeId>('duel')
  const current = GAME_MODES.find((m) => m.id === mode) ?? GAME_MODES[0]

  return (
    <div className={s.layout}>
      <div className={s.main}>
        <RankHero />

        <section className={s.block}>
          <div className={s.blockHead}>
            <span className={s.step}>1</span>
            <span className={s.blockTitle}>Pick a game type</span>
          </div>
          <GameModes selected={mode} onSelect={setMode} />
        </section>

        <section className={s.block}>
          <div className={s.blockHead}>
            <span className={s.step}>2</span>
            <span className={s.blockTitle}>Pick an exam</span>
          </div>
          <ExamPicker />
        </section>

        <div className={s.matchBar}>
          <div className={s.matchSummary}>
            <span className={s.matchMode}>{current.name}</span>
            <span className={s.matchHint}>Exams open soon. You'll be able to queue here.</span>
          </div>
          <button type="button" className={s.matchButton} disabled>
            {mode === 'friend' ? 'Copy invite link' : mode === 'practice' ? 'Start warm-up' : 'Find match'}
          </button>
        </div>
      </div>

      <Leaderboard />
    </div>
  )
}
