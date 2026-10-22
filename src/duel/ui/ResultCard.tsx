import { Link } from 'react-router'
import type { DuelMode, DuelSummary } from '../../../shared/duel'
import { tierOf } from '../../../shared/rating'
import s from './Duel.module.css'

const HEADLINE = { win: 'You win!', loss: 'Mochee wins', draw: 'Draw' } as const
const SUB = {
  win: 'Nice. He wants a rematch already.',
  loss: 'Close one. Run it back?',
  draw: 'Dead even. Tiebreaker?',
} as const

// The end of a match: who won, the score, and what it was worth (a rating
// change for ranked, coins for a personal duel, nothing for practice).
export function ResultCard({ summary, mode, coinsPaid, onRematch }: { summary: DuelSummary; mode: DuelMode; coinsPaid: number; onRematch: () => void }) {
  const delta = summary.rating ? summary.rating.after - summary.rating.before : 0
  return (
    <section className={s.result} data-outcome={summary.outcome}>
      <div className={s.resultHead}>{HEADLINE[summary.outcome]}</div>
      <div className={s.resultSub}>{SUB[summary.outcome]}</div>

      <div className={s.resultScore}>
        <span>{summary.you}</span>
        <span className={s.resultDash}>–</span>
        <span>{summary.opponent}</span>
      </div>
      <div className={s.resultMeta}>
        {summary.correct} of {summary.total} right
      </div>

      <div className={s.rewards}>
        {summary.rating && (
          <div className={s.reward}>
            <div className={s.rewardLabel}>Rating</div>
            <div className={s.rewardValue}>
              {summary.rating.before} → {summary.rating.after}
              <span className={s.delta} data-up={delta >= 0}>
                {delta >= 0 ? '+' : ''}
                {delta}
              </span>
            </div>
            <div className={s.rewardHint}>{tierOf(summary.rating.after).name}</div>
          </div>
        )}
        {mode === 'personal' && (
          <div className={s.reward}>
            <div className={s.rewardLabel}>Coins</div>
            <div className={s.rewardValue}>+{summary.coins}</div>
            <div className={s.rewardHint}>{coinsPaid > 0 ? 'added to your wallet' : 'already paid'}</div>
          </div>
        )}
        {mode === 'practice' && (
          <div className={s.reward}>
            <div className={s.rewardLabel}>Warm-up</div>
            <div className={s.rewardValue}>Unrated</div>
            <div className={s.rewardHint}>nothing on the line</div>
          </div>
        )}
      </div>

      <div className={s.resultActions}>
        <button type="button" className={s.next} onClick={onRematch}>
          Rematch
        </button>
        <Link to="/?tab=ranked" className={s.ghost}>
          Back to Ranked
        </Link>
      </div>
    </section>
  )
}
