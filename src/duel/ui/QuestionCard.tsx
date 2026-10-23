import { useEffect, useState } from 'react'
import type { DuelAnswered, DuelQuestion } from '../../../shared/duel'
import s from './Duel.module.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const SECTION_LABEL = { math: 'Math', rw: 'Reading & Writing', notebook: 'Your notes' } as const

// The question being played. Before the reveal the choices are buttons; after
// it they show the right answer, your pick and Mochee's pick, with the
// explanation and the points each of you scored.
export function QuestionCard(props: {
  question: DuelQuestion
  total: number
  deadline: number
  picked: number | null
  result: DuelAnswered | null
  locked: boolean
  onPick: (choice: number) => void
  onNext: () => void
}) {
  const { question, result } = props
  const revealed = !!result

  // Keys 1-4 / A-D pick; Enter moves on after the reveal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (revealed && e.key === 'Enter') return props.onNext()
      if (revealed || props.locked) return
      const n = /^[1-9]$/.test(e.key) ? Number(e.key) - 1 : LETTERS.indexOf(e.key.toUpperCase())
      if (n >= 0 && n < question.choices.length) props.onPick(n)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [revealed, props, question.choices.length])

  return (
    <section className={s.card} aria-live="polite">
      <div className={s.cardHead}>
        <span className={s.qNum}>
          Question {question.index + 1} of {props.total}
        </span>
        <span className={s.section}>{SECTION_LABEL[question.section]}</span>
      </div>
      <Countdown deadline={props.deadline} limitMs={question.limitMs} stopped={revealed || props.locked} />

      {question.passage && <div className={s.passage}>{question.passage}</div>}
      <div className={s.prompt}>{question.prompt}</div>

      <div className={s.choices}>
        {question.choices.map((c, i) => {
          const state = !result ? (props.picked === i ? 'picked' : 'open') : i === result.correctChoice ? 'right' : i === result.you.choice ? 'wrong' : 'done'
          return (
            <button key={i} type="button" className={s.choice} data-state={state} disabled={revealed || props.locked} onClick={() => props.onPick(i)}>
              <span className={s.letter}>{LETTERS[i]}</span>
              <span className={s.choiceText}>{c}</span>
              {result && (
                <span className={s.marks}>
                  {result.you.choice === i && <span className={s.mark} data-who="you">You</span>}
                  {result.opponent.choice === i && <span className={s.mark} data-who="bot">Mochee</span>}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {result && (
        <div className={s.reveal}>
          <div className={s.revealLine}>
            <Verdict who="You" move={result.you} />
            <Verdict who="Mochee" move={result.opponent} />
          </div>
          <div className={s.explanation}>{result.explanation}</div>
          <button type="button" className={s.next} onClick={props.onNext} autoFocus>
            {result.final ? 'See result' : 'Next question'}
          </button>
        </div>
      )}
    </section>
  )
}

function Verdict({ who, move }: { who: string; move: DuelAnswered['you'] }) {
  const text = move.choice === null ? 'ran out of time' : move.correct ? `right in ${(move.ms / 1000).toFixed(1)}s` : 'missed'
  return (
    <span className={s.verdict} data-correct={move.correct}>
      <b>{who}</b> {text}
      <span className={s.gain}>+{move.points}</span>
    </span>
  )
}

// A bar that drains toward the deadline. Display only: the server keeps the real time.
function Countdown({ deadline, limitMs, stopped }: { deadline: number; limitMs: number; stopped: boolean }) {
  const [left, setLeft] = useState(limitMs)
  useEffect(() => {
    if (stopped) return
    let raf = 0
    const tick = () => {
      setLeft(Math.max(0, deadline - performance.now()))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [deadline, stopped])
  const share = left / limitMs
  return (
    <div className={s.timer} data-low={share < 0.25} role="timer" aria-label={`${Math.ceil(left / 1000)} seconds left`}>
      <div className={s.timerBar} style={{ transform: `scaleX(${share})` }} />
      <span className={s.timerText}>{Math.ceil(left / 1000)}s</span>
    </div>
  )
}
