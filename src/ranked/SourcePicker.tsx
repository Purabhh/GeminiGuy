import type { DocumentInfo } from '../../shared/docsTypes'
import type { DuelSource } from '../../shared/duel'
import { EXAMS, LATER_EXAMS } from './mockData'
import s from './Ranked.module.css'

// Where the questions come from: an exam bank (ranked or warm-up) or one of
// your uploaded notebooks (a Personal duel: coins, no rating).
export function SourcePicker(props: { selected: DuelSource | null; onSelect: (src: DuelSource) => void; notebooks: DocumentInfo[] | null }) {
  const isExam = (id: string) => props.selected?.kind === 'exam' && props.selected.exam === id
  const isDoc = (id: string) => props.selected?.kind === 'notebook' && props.selected.documentId === id
  return (
    <div className={s.sources}>
      <div className={s.examRow} role="radiogroup" aria-label="Exam">
        {EXAMS.map((e) => (
          <button key={e.id} type="button" role="radio" aria-checked={isExam(e.id)} className={s.exam} onClick={() => props.onSelect({ kind: 'exam', exam: e.id })}>
            <div className={s.examHead}>
              <span className={s.examName}>{e.name}</span>
              <span className={s.examTag}>Exam bank</span>
            </div>
            <div className={s.examSections}>{e.sections.join(' · ')}</div>
          </button>
        ))}
        <div className={s.examLater}>
          <span className={s.examLaterTitle}>More exams later</span>
          <span>{LATER_EXAMS.join(', ')}</span>
        </div>
      </div>

      <div className={s.notebooks}>
        <div className={s.notebooksHead}>
          Or your own notes <span className={s.notebooksHint}>Personal duel · coins, no rating</span>
        </div>
        {props.notebooks === null ? (
          <div className={s.notebooksEmpty}>Loading your notebooks…</div>
        ) : props.notebooks.length === 0 ? (
          <div className={s.notebooksEmpty}>Upload notes to a tutor and they show up here.</div>
        ) : (
          <div className={s.notebookList} role="radiogroup" aria-label="Notebook">
            {props.notebooks.map((d) => (
              <button key={d.id} type="button" role="radio" aria-checked={isDoc(d.id)} className={s.notebook} onClick={() => props.onSelect({ kind: 'notebook', documentId: d.id })}>
                <span className={s.notebookTitle}>{d.title}</span>
                <span className={s.notebookMeta}>
                  {d.pageCount} page{d.pageCount === 1 ? '' : 's'}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
