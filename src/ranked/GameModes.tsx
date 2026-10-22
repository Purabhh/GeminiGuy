import type { CSSProperties } from 'react'
import { GAME_MODES, type GameModeId } from './mockData'
import s from './Ranked.module.css'

// Pick a game type. One is always selected; the exam picker and the match bar
// below follow it.
export function GameModes({ selected, onSelect }: { selected: GameModeId; onSelect: (id: GameModeId) => void }) {
  return (
    <div className={s.modeGrid} role="radiogroup" aria-label="Game type">
      {GAME_MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={m.id === selected}
          className={s.mode}
          style={{ '--mode': m.color } as CSSProperties}
          onClick={() => onSelect(m.id)}
        >
          <div className={s.modeTop}>
            <span className={s.modeIcon} aria-hidden>
              {m.icon}
            </span>
            <span className={s.modeTag} data-rated={m.rated}>
              {m.rated ? 'Rated' : 'Unrated'}
            </span>
          </div>
          <div className={s.modeName}>{m.name}</div>
          <div className={s.modeBlurb}>{m.blurb}</div>
          <div className={s.modeFacts}>
            {m.facts.map((f) => (
              <span key={f} className={s.fact}>
                {f}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  )
}
