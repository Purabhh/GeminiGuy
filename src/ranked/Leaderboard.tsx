import type { PlayerProfile, RecentMatch } from '../../shared/duel'
import { tierOf } from '../../shared/rating'
import { LEADERBOARD } from './mockData'
import s from './Ranked.module.css'

const OUTCOME = { win: 'W', loss: 'L', draw: 'D' } as const
const MODE = { ranked: 'Ranked', practice: 'Warm-up', personal: 'Personal' } as const

// Season board (sample rows until accounts) with you pinned under it, then
// your recent matches from the duel server.
export function Leaderboard({ profile }: { profile: PlayerProfile | null }) {
  const placed = !!profile && profile.placementsLeft === 0
  return (
    <aside className={s.side}>
      <div className={s.panel}>
        <div className={s.panelHead}>
          <span className={s.panelTitle}>Leaderboard</span>
          <span className={s.sample}>sample</span>
        </div>
        <ol className={s.board}>
          {LEADERBOARD.map((r, i) => {
            const tier = tierOf(r.rating)
            return (
              <li key={r.name} className={s.row}>
                <span className={s.place} data-top={i < 3}>
                  {i + 1}
                </span>
                <span className={s.rowDot} style={{ background: tier.color }} title={tier.name} />
                <span className={s.rowName}>{r.name}</span>
                <span className={s.rowRating}>{r.rating}</span>
              </li>
            )
          })}
        </ol>
        <div className={s.row} data-me="true">
          <span className={s.place}>—</span>
          <span className={s.rowDot} data-unranked={!placed} style={placed && profile ? { background: tierOf(profile.rating).color } : undefined} />
          <span className={s.rowName}>You</span>
          <span className={s.rowRating}>{placed && profile ? profile.rating : 'Unranked'}</span>
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHead}>
          <span className={s.panelTitle}>Recent matches</span>
        </div>
        {profile?.recent.length ? (
          <ol className={s.board}>
            {profile.recent.map((m) => (
              <MatchRow key={m.matchId} m={m} />
            ))}
          </ol>
        ) : (
          <div className={s.emptyMatches}>No matches yet. Your placements will show up here.</div>
        )}
      </div>
    </aside>
  )
}

function MatchRow({ m }: { m: RecentMatch }) {
  return (
    <li className={s.row}>
      <span className={s.outcome} data-outcome={m.outcome}>
        {OUTCOME[m.outcome]}
      </span>
      <span className={s.rowName}>
        {m.label}
        <span className={s.rowMode}>{MODE[m.mode]}</span>
      </span>
      <span className={s.rowRating}>
        {m.ratingDelta === null ? `${m.you}–${m.opponent}` : `${m.ratingDelta >= 0 ? '+' : ''}${m.ratingDelta}`}
      </span>
    </li>
  )
}
