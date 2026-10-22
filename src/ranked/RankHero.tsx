import { CardCharacter } from '../pages/HomeScene'
import { PLAYER, TIERS } from './mockData'
import s from './Ranked.module.css'

// The player's rank card: placement progress (everyone starts unranked) and
// the tier ladder, with Mochee standing by in the corner.
export function RankHero() {
  const { placementsDone: done, placementsTotal: total } = PLAYER
  return (
    <section className={s.hero}>
      <div className={s.heroMain}>
        <div className={s.eyebrow}>Season 1 · Preview</div>
        <div className={s.rankRow}>
          <div className={s.rankBadge} data-tier="unranked" aria-hidden>
            ?
          </div>
          <div>
            <div className={s.rankName}>Unranked</div>
            <div className={s.rankSub}>
              Play {total - done} placement match{total - done === 1 ? '' : 'es'} to get your rank
            </div>
          </div>
        </div>

        <div className={s.placements} aria-label={`${done} of ${total} placement matches played`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={s.pip} data-done={i < done} />
          ))}
          <span className={s.pipLabel}>
            {done} / {total}
          </span>
        </div>

        <div className={s.stats}>
          <Stat label="Rating" value={`${PLAYER.rating}`} hint="provisional" />
          <Stat label="Record" value={`${PLAYER.wins}–${PLAYER.losses}`} />
          <Stat label="Streak" value="—" />
        </div>
      </div>

      <div className={s.heroArt}>
        <CardCharacter className={s.heroView} awake offsetY={0.2} />
      </div>

      <ol className={s.ladder} aria-label="Tiers">
        {TIERS.map((t) => (
          <li key={t.id} className={s.rung}>
            <span className={s.rungDot} style={{ background: t.color }} />
            <span className={s.rungName}>{t.name}</span>
            <span className={s.rungMin}>{t.min === 0 ? 'start' : `${t.min}+`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={s.stat}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>
        {value}
        {hint && <span className={s.statHint}>{hint}</span>}
      </div>
    </div>
  )
}
