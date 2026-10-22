import { useRef, type CSSProperties, type KeyboardEvent } from 'react'
import s from './HomeTabs.module.css'

// Study / Ranked pill for the home top bar. Same chunky toy look as the
// lesson's ModeSwitch; a radiogroup with one tab stop and arrow keys.

export type HomeTab = 'study' | 'ranked'

const OPTIONS: { id: HomeTab; label: string; hint: string }[] = [
  { id: 'study', label: 'Study', hint: 'Your tutors and notes' },
  { id: 'ranked', label: 'Ranked', hint: 'Head-to-head exam duels' },
]

export function HomeTabs({ tab, onChange }: { tab: HomeTab; onChange: (t: HomeTab) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const index = Math.max(0, OPTIONS.findIndex((o) => o.id === tab))

  const onKeyDown = (e: KeyboardEvent) => {
    const n = OPTIONS.length
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (index + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (index - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : -1
    if (to < 0) return
    e.preventDefault()
    onChange(OPTIONS[to].id)
    refs.current[to]?.focus()
  }

  return (
    <div
      className={s.pill}
      role="radiogroup"
      aria-label="Home section"
      data-tab={tab}
      onKeyDown={onKeyDown}
      style={{ '--i': index, '--n': OPTIONS.length } as CSSProperties}
    >
      <span className={s.thumb} aria-hidden />
      {OPTIONS.map((o, i) => (
        <button
          key={o.id}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={o.id === tab}
          tabIndex={o.id === tab ? 0 : -1}
          title={o.hint}
          className={s.option}
          onClick={() => onChange(o.id)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
