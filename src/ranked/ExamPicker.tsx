import { EXAMS, LATER_EXAMS } from './mockData'
import s from './Ranked.module.css'

// Which question bank the match draws from. SAT and PSAT are locked until the
// bank ships, so every card is disabled for now.
export function ExamPicker() {
  return (
    <div className={s.examRow}>
      {EXAMS.map((e) => (
        <button key={e.id} type="button" className={s.exam} disabled={!e.available} aria-disabled={!e.available}>
          <div className={s.examHead}>
            <span className={s.examName}>{e.name}</span>
            {!e.available && (
              <span className={s.soon}>
                <LockIcon /> Coming soon
              </span>
            )}
          </div>
          <div className={s.examSections}>{e.sections.join(' · ')}</div>
        </button>
      ))}
      <div className={s.examLater}>
        <span className={s.examLaterTitle}>More exams later</span>
        <span>{LATER_EXAMS.join(', ')}</span>
      </div>
    </div>
  )
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="11" width="14" height="10" rx="2.5" fill="currentColor" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  )
}
