import type { PlayerProfile } from '../../shared/duel'
import { RATING, tierOf, TIERS } from '../../shared/rating'
import { CardCharacter } from '../pages/HomeScene'
import s from './Ranked.module.css'

// The player's rank card: placement progress until the first five rated
// games are played, then the tier. The ladder lights up the current tier.
export function RankHero({ profile }: { profile: PlayerProfile | null }) {
  const p = profile ?? { rating: RATING.start, games: 0, wins: 0, losses: 0, draws: 0, placementsLeft: RATING.placements, recent: [] }
  const placed = p.placementsLeft === 0
  const tier = tierOf(p.rating)
  const done = RATING.placements - p.placementsLeft
  const streak = currentStreak(p)
  return (
    <section className={s.hero}>
      <div className={s.heroMain}>
        <div className={s.eyebrow}>Season 1 · Beta</div>
        <div className={s.rankRow}>
          <div className={s.rankBadge} data-tier={placed ? tier.id : 'unranked'} style={placed ? { background: tier.color } : undefined} aria-hidden>
            {placed ? tier.name[0] : '?'}
          </div>
          <div>
            <div className={s.rankName}>{placed ? tier.name : 'Unranked'}</div>
            <div className={s.rankSub}>
              {placed
                ? `${p.rating} rating`
                : `Play ${p.placementsLeft} placement match${p.placementsLeft === 1 ? '' : 'es'} to get your rank`}
            </div>
          </div>
        </div>

        {!placed && (
          <div className={s.placements} aria-label={`${done} of ${RATING.placements} placement matches played`}>
            {Array.from({ length: RATING.placements }, (_, i) => (
              <span key={i} className={s.pip} data-done={i < done} />
            ))}
            <span className={s.pipLabel}>
              {done} / {RATING.placements}
            </span>
          </div>
        )}

        <div className={s.stats}>
          <Stat label="Rating" value={`${p.rating}`} hint={placed ? undefined : 'provisional'} />
          <Stat label="Record" value={`${p.wins}–${p.losses}${p.draws ? `–${p.draws}` : ''}`} />
          <Stat label="Streak" value={streak ? `${streak}W` : '—'} />
        </div>
      </div>

      <div className={s.heroArt}>
        <CardCharacter className={s.heroView} awake offsetY={0.2} />
      </div>

      <ol className={s.ladder} aria-label="Tiers">
        {TIERS.map((t) => (
          <li key={t.id} className={s.rung} data-current={placed && t.id === tier.id}>
            <span className={s.rungDot} style={{ background: t.color }} />
            <span className={s.rungName}>{t.name}</span>
            <span className={s.rungMin}>{t.min === 0 ? 'start' : `${t.min}+`}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

// Rated wins in a row, from the most recent match back.
function currentStreak(p: PlayerProfile): number {
  let n = 0
  for (const m of p.recent) {
    if (m.ratingDelta === null) continue
    if (m.outcome !== 'win') break
    n++
  }
  return n
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
