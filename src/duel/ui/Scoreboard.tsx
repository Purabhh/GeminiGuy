import type { DuelAnswered, DuelStarted } from '../../../shared/duel'
import { CardCharacter } from '../../pages/HomeScene'
import s from './Duel.module.css'

// You vs Mochee: names, ratings, live scores, and a pip per question that
// fills in green or red as each one is revealed.
export function Scoreboard({ started, history, thinking }: { started: DuelStarted; history: DuelAnswered[]; thinking: boolean }) {
  const last = history[history.length - 1]
  const score = last?.score ?? { you: 0, opponent: 0 }
  const rated = started.mode === 'ranked'
  return (
    <div className={s.board}>
      <Plate side="you" name="You" rating={rated ? started.you.rating : null} score={score.you} history={history.map((h) => h.you.correct)} total={started.total} />
      <div className={s.vs} aria-hidden>
        VS
      </div>
      <Plate side="bot" name={started.opponent.name} rating={rated ? started.opponent.rating : null} score={score.opponent} history={history.map((h) => h.opponent.correct)} total={started.total} thinking={thinking} />
    </div>
  )
}

function Plate(props: { side: 'you' | 'bot'; name: string; rating: number | null; score: number; history: boolean[]; total: number; thinking?: boolean }) {
  return (
    <div className={s.plate} data-side={props.side}>
      <div className={s.plateArt}>
        {props.side === 'bot' ? <CardCharacter className={s.plateView} awake offsetY={0.25} /> : <span className={s.youBadge}>You</span>}
      </div>
      <div className={s.plateBody}>
        <div className={s.plateName}>
          {props.name}
          {props.rating !== null && <span className={s.plateRating}>{props.rating}</span>}
        </div>
        <div className={s.plateScore} aria-label={`${props.name} score`}>
          {props.score}
        </div>
        <div className={s.pips} aria-hidden>
          {Array.from({ length: props.total }, (_, i) => (
            <span key={i} className={s.pip} data-state={i < props.history.length ? (props.history[i] ? 'right' : 'wrong') : 'open'} />
          ))}
        </div>
        {props.thinking && <div className={s.thinking}>thinking…</div>}
      </div>
    </div>
  )
}
