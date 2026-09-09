import { useCallback, useEffect, useRef, useState } from 'react'
import { GRADES, GRADE_LABELS, type ReviewGrade } from '../domain/scheduler'
import {
  availableHintLevels,
  describeSkeleton,
  hintFor,
  HINT_LABELS,
  type HintLevel,
} from '../domain/hints'
import { THEME_LABELS, type StudyCard } from '../domain/types'

export interface StudyViewProps {
  queue: readonly StudyCard[]
  onReview: (card: StudyCard, grade: ReviewGrade, note: string | undefined) => void
  onFinish: () => void
  onExit: () => void
}

const BUTTON =
  'min-h-11 px-4 py-2 rounded-lg border border-border text-text bg-raised ' +
  'hover:border-accent disabled:opacity-60'

const PRIMARY = 'min-h-11 px-5 py-2 rounded-lg bg-accent text-accent-text font-semibold'

const TEXT_FIELD = 'input, textarea, select, [contenteditable="true"]'
const INTERACTIVE = 'button, a[href], [role="button"], summary'

export function StudyView({ queue, onReview, onFinish, onExit }: StudyViewProps) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [openHints, setOpenHints] = useState<HintLevel[]>([])
  const questionRef = useRef<HTMLHeadingElement>(null)
  const answerRef = useRef<HTMLDivElement>(null)

  const card = queue[index]
  const levels = card ? availableHintLevels(card.content) : []
  const nextLevel = levels[openHints.length]

  // The note starts from what the learner wrote last time, so leaving it
  // untouched keeps it and emptying it erases it. Both were impossible before.
  // Reset during render rather than in an effect: an effect would render the
  // previous card's note for one frame before correcting it.
  const [note, setNote] = useState(card?.progress.note ?? '')
  const [noteCardId, setNoteCardId] = useState(card?.content.id)
  if (card && noteCardId !== card.content.id) {
    setNoteCardId(card.content.id)
    setNote(card.progress.note ?? '')
  }

  const reveal = useCallback(() => setRevealed(true), [])

  const openNextHint = useCallback(() => {
    if (nextLevel) setOpenHints((current) => [...current, nextLevel])
  }, [nextLevel])

  const grade = useCallback(
    (value: ReviewGrade) => {
      if (!card) return
      onReview(card, value, note.trim() === '' ? undefined : note.trim())
      setRevealed(false)
      setOpenHints([])
      if (index + 1 >= queue.length) onFinish()
      else setIndex(index + 1)
    },
    [card, index, note, onFinish, onReview, queue.length],
  )

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      // A shortcut must never shadow a browser or assistive-technology command.
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target?.closest(TEXT_FIELD)) return

      if (!revealed && (event.key === ' ' || event.key === 'Enter')) {
        // Space and Enter activate whatever button has focus. Swallowing them
        // here would break every control on the card for keyboard users, which
        // is exactly what it used to do.
        if (target?.closest(INTERACTIVE)) return
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

  // Focus follows the reading order: the new question, then the answer once it
  // is shown. Without this the focus fell back to <body> on every card, so a
  // screen-reader user was silently returned to the top of the document twelve
  // times a session.
  useEffect(() => {
    if (!revealed) questionRef.current?.focus()
  }, [index, revealed])

  useEffect(() => {
    if (revealed) answerRef.current?.focus()
  }, [revealed])

  if (!card) return null

  const skeletonSpoken = describeSkeleton(card.content)

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

      <h2
        id="question-heading"
        ref={questionRef}
        tabIndex={-1}
        className="mt-2 text-2xl font-semibold text-balance"
      >
        {card.content.question}
      </h2>

      {/* Opening a rung inserts content above the button that opened it, so it
          has to announce itself; focus stays on the button for the next rung. */}
      <ul aria-live="polite" className="mt-4 space-y-2 empty:mt-0">
        {openHints.map((level) => {
          const text = hintFor(card.content, level)
          const isSkeleton = level === 'skeleton'
          return (
            <li key={level} className="border-border bg-raised rounded-lg border p-3">
              <p className="text-muted text-sm">{HINT_LABELS[level]}</p>
              {isSkeleton && skeletonSpoken ? (
                <>
                  <p aria-hidden="true" className="font-mono text-lg tracking-wide">
                    {text}
                  </p>
                  <p className="sr-only">{skeletonSpoken}</p>
                </>
              ) : (
                <p>{text}</p>
              )}
            </li>
          )
        })}
      </ul>

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
        <div ref={answerRef} tabIndex={-1} aria-labelledby="answer-heading" className="mt-6">
          <h3 id="answer-heading" className="sr-only">
            Réponse
          </h3>
          <p className="border-border bg-raised rounded-lg border p-4 text-xl">
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
            explanation comes back to them. The field is pre-filled with it, so
            it can be re-read, edited, or cleared — storing a note that could
            never be changed was the appearance of the method, not the method.
          */}
          <div className="mt-5">
            <label htmlFor="note" className="block font-medium">
              Pourquoi&nbsp;? <span className="text-muted font-normal">(facultatif)</span>
            </label>
            <p id="note-help" className="text-muted text-sm">
              {card.progress.note
                ? 'Votre explication de la dernière fois. Modifiez-la, ou videz le champ pour l’effacer.'
                : 'Expliquez la réponse avec vos mots. Elle vous sera reproposée à la prochaine révision.'}
            </p>
            <textarea
              id="note"
              aria-describedby="note-help"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="border-border bg-surface mt-2 w-full rounded-lg border p-2"
            />
          </div>

          <div role="group" aria-label="Évaluer votre rappel" className="mt-5 flex flex-wrap gap-3">
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
