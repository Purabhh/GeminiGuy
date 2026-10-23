import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EXAM_LABEL, type DuelMode, type DuelSource } from '../../shared/duel'
import { useDuel } from '../duel/useDuel'
import { QuestionCard } from '../duel/ui/QuestionCard'
import { ResultCard } from '../duel/ui/ResultCard'
import { Scoreboard } from '../duel/ui/Scoreboard'
import s from '../duel/ui/Duel.module.css'
import { errorText } from '../ui/Drawers/docsClient'
import { HomeCanvas } from './HomeScene'

// "/duel": a duel against Mochee.
//   ?mode=ranked&exam=sat    rated, exam bank
//   ?mode=practice&exam=psat unrated warm-up, exam bank
//   ?mode=personal&doc=<id>  your notebook, pays coins

const MODE_TITLE: Record<DuelMode, string> = { ranked: 'Ranked Duel', practice: 'Warm-up', personal: 'Personal Duel' }

function parse(params: URLSearchParams): { mode: DuelMode; source: DuelSource } | null {
  const mode = params.get('mode')
  const exam = params.get('exam')
  const doc = params.get('doc')
  if ((mode === 'ranked' || mode === 'practice') && (exam === 'sat' || exam === 'psat')) return { mode, source: { kind: 'exam', exam } }
  if (mode === 'personal' && doc && /^[a-f0-9]{16}$/.test(doc)) return { mode, source: { kind: 'notebook', documentId: doc } }
  return null
}

export function DuelPage() {
  const [params] = useSearchParams()
  const setup = useMemo(() => parse(params), [params])
  const [round, setRound] = useState(0) // a rematch mounts a fresh match

  return (
    <div className={s.page} data-screen-label="Duel">
      <div className={s.wrap}>
        <div className={s.top}>
          <Link to="/?tab=ranked" className={s.back}>
            ‹ Ranked
          </Link>
          <div className={s.title}>
            {setup ? MODE_TITLE[setup.mode] : 'Duel'}
            {setup?.source.kind === 'exam' && <span className={s.titleTag}>{EXAM_LABEL[setup.source.exam]}</span>}
          </div>
        </div>
        {setup ? <Match key={round} mode={setup.mode} source={setup.source} onRematch={() => setRound((r) => r + 1)} /> : <div className={s.notice}>That duel link is missing its mode or exam.</div>}
      </div>
      <HomeCanvas className={s.canvas} />
    </div>
  )
}

function Match({ mode, source, onRematch }: { mode: DuelMode; source: DuelSource; onRematch: () => void }) {
  const { view, answer, next } = useDuel(mode, source)
  const { started, question } = view

  if (view.phase === 'error') {
    return (
      <div className={s.notice}>
        {errorText(view.error ?? 'internal')}
        <Link to="/?tab=ranked" className={s.ghost}>
          Back to Ranked
        </Link>
      </div>
    )
  }
  if (!started || !question) {
    return <div className={s.notice}>{source.kind === 'notebook' ? 'Mochee is writing questions from your notes…' : 'Finding questions at your level…'}</div>
  }
  const final = view.history[view.history.length - 1]?.final
  return (
    <div className={s.stage}>
      <Scoreboard started={started} history={view.history} thinking={view.phase === 'question' || view.phase === 'sending'} />
      {view.phase === 'final' && final ? (
        <ResultCard summary={final} mode={mode} coinsPaid={view.coinsPaid} onRematch={onRematch} />
      ) : (
        <QuestionCard
          key={question.index}
          question={question}
          total={started.total}
          deadline={view.deadline}
          picked={view.picked}
          result={view.result}
          locked={view.phase === 'sending'}
          onPick={answer}
          onNext={next}
        />
      )}
    </div>
  )
}
