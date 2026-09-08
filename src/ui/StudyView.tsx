import { useCallback, useEffect, useRef, useState } from 'react'
import { GRADES, GRADE_LABELS, type ReviewGrade } from '../domain/scheduler'
import { THEME_LABELS, type StudyCard } from '../domain/types'

export interface StudyViewProps {
  queue: readonly StudyCard[]
  onReview: (card: StudyCard, grade: ReviewGrade, note?: string) => void
  onFinish: () => void
}

const BUTTON =
  'min-h-11 px-4 py-2 rounded-lg border border-border text-text bg-raised ' +
  'hover:border-accent disabled:opacity-60'

const PRIMARY = 'min-h-11 px-5 py-2 rounded-lg bg-accent text-accent-text font-semibold'

export function StudyView({ queue, onReview, onFinish }: StudyViewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [hintShown, setHintShown] = useState(false)
  const [note, setNote] = useState('')
  const ratingRef = useRef<HTMLDivElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const card = queue[index]

  const reveal = useCallback(() => setRevealed(true), [])

  const grade = useCallback(
    (value: ReviewGrade) => {
      if (!card) return
      onReview(card, value, note.trim() || undefined)
      setRevealed(false)
      setHintShown(false)
      setNote('')
      if (index + 1 >= queue.length) onFinish()
      else setIndex(index + 1)
    },
    [card, index, note, onFinish, onReview, queue.length],
  )

  // Keyboard shortcuts: space or enter to reveal, 1-4 to grade. Typing a note
  // must never be captured, so the note field is excluded explicitly.
  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT')) return

      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        event.preventDefault()
        reveal()
        return
      }
      if (revealed) {
        const position = Number.parseInt(event.key, 10)
        if (position >= 1 && position <= GRADES.length) {
          event.preventDefault()
          grade(GRADES[position - 1])
        }
      }
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [grade, reveal, revealed])

  // Send focus to the grading controls on reveal so the keyboard path continues
  // without a hunt through the page.
  useEffect(() => {
    if (revealed) ratingRef.current?.focus()
  }, [revealed])

  if (!card) return null

  return (
    <section aria-labelledby="question-heading" className="mx-auto w-full max-w-2xl px-4 py-6">
      <p aria-live="polite" className="text-muted text-sm">
        Carte {index + 1} sur {queue.length} — {THEME_LABELS[card.content.theme]}
      </p>

      <h2 id="question-heading" className="mt-4 text-2xl font-semibold text-balance">
        {card.content.question}
      </h2>

      {!revealed && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={PRIMARY} onClick={reveal}>
            Afficher la réponse
          </button>
          {card.content.hint && !hintShown && (
            <button type="button" className={BUTTON} onClick={() => setHintShown(true)}>
              Un indice
            </button>
          )}
        </div>
      )}

      {hintShown && card.content.hint && (
        <p className="mt-4 rounded-lg border border-border bg-raised p-3">
          <strong>Indice.</strong> {card.content.hint}
        </p>
      )}

      {revealed && (
        <div className="mt-6">
          <h3 className="sr-only">Réponse</h3>
          <p className="rounded-lg border border-border bg-raised p-4 text-xl">
            {card.content.answer}
          </p>

          {card.content.elaboration && (
            <p className="mt-3 text-muted">{card.content.elaboration}</p>
          )}

          {/*
            The source is what makes a card checkable rather than merely
            asserted. It sits after the answer so it never leaks the response.
          */}
          <p className="mt-3 text-sm">
            <a
              href={card.content.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              Vérifier&nbsp;: {card.content.source.title}
              <span className="text-muted"> (nouvel onglet)</span>
            </a>
          </p>

          <div className="mt-5">
            <label htmlFor="note" className="block font-medium">
              Pourquoi&nbsp;? <span className="text-muted font-normal">(facultatif)</span>
            </label>
            <p id="note-help" className="text-muted text-sm">
              Formuler l&apos;explication avec vos mots ancre la carte plus solidement.
            </p>
            <textarea
              id="note"
              ref={noteRef}
              aria-describedby="note-help"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="mt-2 w-full rounded-lg border border-border bg-surface p-2"
            />
          </div>

          <div
            ref={ratingRef}
            tabIndex={-1}
            role="group"
            aria-label="Évaluer votre rappel"
            className="mt-5 flex flex-wrap gap-3"
          >
            {GRADES.map((value, position) => (
              <button key={value} type="button" className={BUTTON} onClick={() => grade(value)}>
                {GRADE_LABELS[value]}
                <span className="text-muted text-sm"> ({position + 1})</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
