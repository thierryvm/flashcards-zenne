import { useCallback, useEffect, useRef, useState } from 'react'
import { GRADES, GRADE_LABELS, Rating, type ReviewGrade } from '../domain/scheduler'
import { availableHintLevels, hintFor, HINT_LABELS, type HintLevel } from '../domain/hints'
import { THEME_LABELS, type StudyCard } from '../domain/types'

export interface StudyViewProps {
  queue: readonly StudyCard[]
  onReview: (card: StudyCard, grade: ReviewGrade, note: string | undefined) => void
  onFinish: () => void
  onExit: () => void
}

/** 48 px tall, 10 px radius, one accent. The rest is intensity. */
const BUTTON = 'min-h-12 rounded-button border px-5 py-2 text-label font-semibold'

const PRIMARY = `${BUTTON} bg-accent text-accent-text border-accent`
const SECONDARY = `${BUTTON} border-muted text-ink`

/**
 * The four grades as one hue at decreasing intensity, never a traffic light.
 * Red on "À revoir" makes not knowing feel like a failure, and green rewards
 * the easy card that taught nothing — the opposite of how spacing works. The
 * most visible button is the one you press when you did not know.
 *
 * The intensities are 100 / 45 / 20 / outline rather than DESIGN.md's literal
 * 100 / 70 / 45: at 70 % of the dark accent no label colour reaches 4.5:1
 * (3.34 with the ink, 4.35 with the paper). The order and the meaning are
 * unchanged; the numbers are what the contrast floor allows.
 *
 * All four are bounded in `accent`, including the bare one. Outlining "Facile"
 * in `muted` made it match the navigation buttons instead of the scale, so the
 * eye filed the fourth step with the commands rather than next to "Correct".
 * The outline is the 0 % step of the same ramp, not a different kind of object.
 */
const GRADE_STYLE: Record<ReviewGrade, string> = {
  [Rating.Again]: `${BUTTON} bg-accent text-accent-text border-accent`,
  [Rating.Hard]: `${BUTTON} bg-grade-hard text-ink border-accent`,
  [Rating.Good]: `${BUTTON} bg-grade-good text-ink border-accent`,
  [Rating.Easy]: `${BUTTON} border-accent text-ink`,
}

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

  return (
    <section aria-labelledby="question-heading" className="max-w-reading mx-auto px-5 py-8 sm:px-8">
      <div className="flex items-baseline justify-between gap-4">
        <p aria-live="polite" className="text-muted text-note">
          Carte {index + 1} sur {queue.length} — {THEME_LABELS[card.content.theme]}
        </p>
        {/* Leaving mid-session must always be possible: every graded card is
            already saved, so nothing is lost by stopping early. */}
        <button type="button" onClick={onExit} className="text-muted text-note min-h-12 underline">
          Quitter la séance
        </button>
      </div>

      {/* The question sits on the paper, with no container. A box around it
          would make it one object among several instead of the screen itself.

          Once the answer is out, the question steps back into `muted` so the
          answer is the only thing left in full ink. That makes the answer
          dominant without touching the type scale, and the pair stays readable
          at a glance. */}
      <h2
        id="question-heading"
        ref={questionRef}
        tabIndex={-1}
        className={`font-serif text-question mt-6 text-balance ${revealed ? 'text-muted' : ''}`}
      >
        {card.content.question}
      </h2>

      {/* Opening a rung inserts content above the button that opened it, so it
          has to announce itself; focus stays on the button for the next rung.
          Separated by a rule rather than boxed: three bordered blocks made the
          hints heavier on the page than the answer they lead to. */}
      <ul aria-live="polite" className="mt-8 empty:mt-0">
        {openHints.map((level) => (
          <li key={level} className="border-line border-t py-4 first:pt-0">
            <p className="text-muted text-label">{HINT_LABELS[level]}</p>
            <p className="text-body mt-1">{hintFor(card.content, level)}</p>
          </li>
        ))}
      </ul>

      {!revealed && (
        <div className="mt-8 flex flex-wrap gap-3">
          {/* Asking for help is the primary action. The button that skips
              retrieval altogether should not be the inviting one. */}
          {nextLevel && (
            <button type="button" className={PRIMARY} onClick={openNextHint}>
              {openHints.length === 0 ? 'Aidez-moi' : 'Un indice de plus'}
              <span className="font-normal">
                {' '}
                ({openHints.length + 1}/{levels.length})
              </span>
            </button>
          )}
          <button type="button" className={nextLevel ? SECONDARY : PRIMARY} onClick={reveal}>
            Afficher la réponse
          </button>
        </div>
      )}

      {revealed && (
        <div
          ref={answerRef}
          tabIndex={-1}
          aria-labelledby="answer-heading"
          className="motion-safe:animate-[fade_120ms_ease-out] mt-8"
        >
          <h3 id="answer-heading" className="sr-only">
            Réponse
          </h3>
          {/* The answer is the heaviest thing on the screen: serif, larger,
              and alone. It used to sit in the same bordered box as the hints. */}
          <p className="font-serif text-answer border-line border-t pt-6 font-semibold">
            {card.content.answer}
          </p>

          {card.content.elaboration && <p className="text-body mt-4">{card.content.elaboration}</p>}

          {/*
            The source is what makes a card checkable rather than merely
            asserted. It sits after the answer so it never leaks the response.

            The new-tab warning is announced but not printed, which is a
            different call from the hint ladder even though it looks similar.
            There, two versions of the *hint itself* could drift apart and one
            of them was unreadable. Here the sentence is not content: it is an
            affordance announcement, the same class as an aria-label. A sighted
            person sees the new tab arrive and loses nothing; a screen-reader
            user gets no such signal, so they keep the words. One string, no
            drift, and twelve fewer interface asides per session.
          */}
          <p className="text-note mt-4">
            <a
              href={card.content.source.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2"
            >
              Vérifier&nbsp;: {card.content.source.title}
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
          </p>

          {/*
            Elaborative interrogation only works if the learner's own
            explanation comes back to them. The field is pre-filled with it, so
            it can be re-read, edited, or cleared — storing a note that could
            never be changed was the appearance of the method, not the method.
          */}
          <div className="mt-8">
            <label htmlFor="note" className="text-label block font-semibold">
              Pourquoi&nbsp;? <span className="text-muted font-normal">(facultatif)</span>
            </label>
            <p id="note-help" className="text-muted text-note mt-1">
              {card.progress.note
                ? 'Votre explication de la dernière fois. Modifiez-la, ou videz le champ pour l’effacer.'
                : 'Expliquez la réponse avec vos mots. Elle vous sera reproposée à la prochaine révision.'}
            </p>
            {/* A form control needs a boundary someone can see: `line` is a
                separator colour and does not meet 3:1. */}
            <textarea
              id="note"
              aria-describedby="note-help"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={2}
              className="border-muted bg-raised rounded-block text-body mt-3 w-full border p-3"
            />
          </div>

          {/* A grid rather than a wrapping row: flow-wrap left "Facile" alone
              on a second line at 1280 px, which reads as an afterthought rather
              than the fourth step of a scale. */}
          <div
            role="group"
            aria-label="Évaluer votre rappel"
            aria-describedby="grades-help"
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {GRADES.map((value) => (
              <button
                key={value}
                type="button"
                className={GRADE_STYLE[value]}
                onClick={() => grade(value)}
              >
                {GRADE_LABELS[value]}
              </button>
            ))}
          </div>
          {/* The shortcut used to sit inside each label. In four equal columns
              that forced every one of them onto two lines. */}
          <p id="grades-help" className="text-muted text-note mt-3">
            Touches 1 à 4. Dire que vous ne saviez pas n’est pas un échec : c’est ce qui règle la
            prochaine échéance.
          </p>
        </div>
      )}
    </section>
  )
}
