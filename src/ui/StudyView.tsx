import { useCallback, useEffect, useRef, useState } from 'react'
import { GRADES, GRADE_LABELS, type ReviewGrade } from '../domain/scheduler'
import { availableHintLevels, hintFor, HINT_LABELS, type HintLevel } from '../domain/hints'
import { THEME_LABELS, type StudyCard } from '../domain/types'

export interface StudyViewProps {
  queue: readonly StudyCard[]
  onReview: (card: StudyCard, grade: ReviewGrade, note?: string) => void
  onFinish: () => void
  onExit: () => void
}

const BUTTON =
  'min-h-11 px-4 py-2 rounded-lg border border-border text-text bg-raised ' +
  'hover:border-accent disabled:opacity-60'

const PRIMARY = 'min-h-11 px-5 py-2 rounded-lg bg-accent text-accent-text font-semibold'

export function StudyView({ queue, onReview, onFinish, onExit }: StudyViewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [openHints, setOpenHints] = useState<HintLevel[]>([])
  const [note, setNote] = useState('')
  const ratingRef = useRef<HTMLDivElement>(null)

  const card = queue[index]
  const levels = card ? availableHintLevels(card.content) : []
  const nextLevel = levels[openHints.length]

  const reveal = useCallback(() => setRevealed(true), [])

  const openNextHint = useCallback(() => {
    if (nextLevel) setOpenHints((current) => [...current, nextLevel])
  }, [nextLevel])

  const grade = useCallback(
    (value: ReviewGrade) => {
      if (!card) return
      onReview(card, value, note.trim() || undefined)
      setRevealed(false)
      setOpenHints([])
      setNote('')
      if (index + 1 >= queue.length) onFinish()
      else setIndex(index + 1)
    },
    [card, index, note, onFinish, onReview, queue.length],
  )

  // Keyboard shortcuts: space or enter to reveal, 1-4 to grade. Typing a note
  // must never be captured, so text fields are excluded explicitly.
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

  const previousNote = card.progress.note

  return (
    <section aria-labelledby="question-heading" className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="flex items-baseline justify-between gap-3">
        <p aria-live="polite" className="text-muted text-sm">
          Carte {index + 1} sur {queue.length} — {THEME_LABELS[card.content.theme]}
        </p>
        {/* Leaving mid-session must always be possible: every graded card is
            already saved, so nothing is lost by stopping early. */}
        <button type="button" onClick={onExit} className="text-muted min-h-11 text-sm underline">
          Quitter la séance
        </button>
      </div>

      <h2 id="question-heading" className="mt-2 text-2xl font-semibold text-balance">
        {card.content.question}
      </h2>

      {openHints.length > 0 && (
        <ul className="mt-4 space-y-2">
          {openHints.map((level) => (
            <li key={level} className="rounded-lg border border-border bg-raised p-3">
              <p className="text-muted text-sm">{HINT_LABELS[level]}</p>
              <p className={level === 'skeleton' ? 'font-mono text-lg tracking-wide' : ''}>
                {hintFor(card.content, level)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {!revealed && (
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className={PRIMARY} onClick={reveal}>
            Afficher la réponse
          </button>
          {nextLevel && (
            <button type="button" className={BUTTON} onClick={openNextHint}>
              {openHints.length === 0 ? 'Aidez-moi' : 'Un indice de plus'}
              <span className="text-muted text-sm">
                {' '}
                ({openHints.length + 1}/{levels.length})
              </span>
            </button>
          )}
        </div>
      )}

      {revealed && (
        <div className="mt-6">
          <h3 className="sr-only">Réponse</h3>
          <p className="rounded-lg border border-border bg-raised p-4 text-xl">
            {card.content.answer}
          </p>

          {card.content.elaboration && (
            <p className="text-muted mt-3">{card.content.elaboration}</p>
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

          {/*
            Elaborative interrogation only works if the learner's own
            explanation comes back to them. Storing it and never showing it
            again would be the appearance of the method without its mechanism.
          */}
          {previousNote && (
            <div className="border-accent mt-5 rounded-lg border-l-4 bg-raised p-3">
              <p className="text-muted text-sm">Votre explication, la dernière fois</p>
              <p className="mt-1">{previousNote}</p>
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="note" className="block font-medium">
              Pourquoi&nbsp;? <span className="text-muted font-normal">(facultatif)</span>
            </label>
            <p id="note-help" className="text-muted text-sm">
              Expliquez la réponse avec vos mots. Elle vous sera reproposée à la prochaine révision
              de cette carte.
            </p>
            <textarea
              id="note"
              aria-describedby="note-help"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              placeholder={previousNote ? 'Reformuler ou compléter…' : undefined}
              className="border-border bg-surface mt-2 w-full rounded-lg border p-2"
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
