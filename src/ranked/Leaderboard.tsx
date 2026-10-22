import { LEADERBOARD, PLAYER, tierOf } from './mockData'
import s from './Ranked.module.css'

// Season board (sample rows) with the player pinned under it, then recent
// matches, which stay empty until the first placement match.
export function Leaderboard() {
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
          <span className={s.rowDot} data-unranked="true" />
          <span className={s.rowName}>{PLAYER.name}</span>
          <span className={s.rowRating}>Unranked</span>
        </div>
      </div>

      <div className={s.panel}>
        <div className={s.panelHead}>
          <span className={s.panelTitle}>Recent matches</span>
        </div>
        <div className={s.emptyMatches}>No ranked matches yet. Your placements will show up here.</div>
      </div>
    </aside>
  )
}
