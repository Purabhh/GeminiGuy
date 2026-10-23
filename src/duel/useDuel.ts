import { useCallback, useEffect, useRef, useState } from 'react'
import type { DuelAnswered, DuelMode, DuelQuestion, DuelSource, DuelStarted } from '../../shared/duel'
import { useProgress } from '../state/progress'
import { answerDuel, startDuel } from './api'

// One duel from start to result. The server owns the clock and the answers;
// the countdown here is only for show, and when it hits zero we tell the
// server we ran out of time (it would count us late anyway).
//
// loading -> question -> sending -> reveal -> question ... -> final

export type DuelPhase = 'loading' | 'question' | 'sending' | 'reveal' | 'final' | 'error'

export interface DuelView {
  phase: DuelPhase
  started: DuelStarted | null
  question: DuelQuestion | null
  picked: number | null
  result: DuelAnswered | null
  history: DuelAnswered[]
  deadline: number // performance.now() when the current question runs out
  error: string | null
  coinsPaid: number
}

const initial: DuelView = { phase: 'loading', started: null, question: null, picked: null, result: null, history: [], deadline: 0, error: null, coinsPaid: 0 }

export function useDuel(mode: DuelMode, source: DuelSource | null) {
  const [view, setView] = useState<DuelView>(initial)
  const awardDuel = useProgress((s) => s.awardDuel)
  const begun = useRef(false) // StrictMode runs effects twice; a second start would forfeit the first match
  const sending = useRef(false)

  useEffect(() => {
    if (begun.current || !source) return
    begun.current = true
    void startDuel({ mode, source }).then((res) => {
      if (!res.ok) return setView((v) => ({ ...v, phase: 'error', error: res.error }))
      setView({ ...initial, phase: 'question', started: res.data, question: res.data.question, deadline: performance.now() + res.data.question.limitMs })
    })
  }, [mode, source])

  const answer = useCallback(
    (choice: number | null) => {
      const { started, question, phase } = view
      if (!started || !question || phase !== 'question' || sending.current) return
      sending.current = true
      setView((v) => ({ ...v, phase: 'sending', picked: choice }))
      void answerDuel({ matchId: started.matchId, index: question.index, choice }).then((res) => {
        sending.current = false
        if (!res.ok) return setView((v) => ({ ...v, phase: 'error', error: res.error }))
        const result = res.data
        // The server's summary decides the payout; the store pays each match once.
        const coinsPaid = result.final && result.final.coins > 0 ? awardDuel(started.matchId, result.final.coins) : 0
        setView((v) => ({ ...v, phase: 'reveal', result, history: [...v.history, result], coinsPaid: v.coinsPaid + coinsPaid }))
      })
    },
    [view, awardDuel],
  )

  const next = useCallback(() => {
    setView((v) => {
      if (v.phase !== 'reveal' || !v.result) return v
      if (v.result.final || !v.result.next) return { ...v, phase: 'final' }
      return { ...v, phase: 'question', question: v.result.next, picked: null, result: null, deadline: performance.now() + v.result.next.limitMs }
    })
  }, [])

  // Out of time: send "no answer" once the countdown ends.
  useEffect(() => {
    if (view.phase !== 'question') return
    const left = view.deadline - performance.now()
    const timer = setTimeout(() => answer(null), Math.max(0, left))
    return () => clearTimeout(timer)
  }, [view.phase, view.deadline, answer])

  return { view, answer, next }
}
