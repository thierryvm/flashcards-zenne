import { useCallback, useEffect, useMemo, useState } from 'react'
import { StudyView } from './ui/StudyView'
import { Dashboard } from './ui/Dashboard'
import { buildQueue, DEFAULT_SESSION_LIMIT } from './domain/queue'
import { createScheduler, type ReviewGrade } from './domain/scheduler'
import { readSeed } from './domain/seed'
import { loadStudyCards, saveProgress } from './data/repository'
import type { StudyCard } from './domain/types'

type Phase = 'loading' | 'home' | 'study' | 'done'
export type StorageFailure = 'load' | 'save'

const STORAGE_MESSAGE: Record<StorageFailure, string> = {
  load: "Vos révisions précédentes n'ont pas pu être chargées. Ce que vous voyez peut être incomplet.",
  save: "Votre dernière réponse n'a pas pu être enregistrée. Vos révisions de cette séance risquent d'être perdues.",
}

export default function App() {
  const scheduler = useMemo(() => createScheduler(), [])
  // Read once: the address bar is not going to change under a running session.
  const pinnedSeed = useMemo(() => readSeed(window.location.search), [])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [queue, setQueue] = useState<StudyCard[]>([])
  const [reviewedCount, setReviewedCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [storageFailure, setStorageFailure] = useState<StorageFailure | null>(null)

  useEffect(() => {
    let cancelled = false
    loadStudyCards(scheduler)
      .then((loaded) => {
        if (cancelled) return
        setCards(loaded)
        setPhase('home')
      })
      .catch(() => {
        // Browser storage can be unavailable outright: private windows, a
        // corrupted database, a quota refusal. Failing silently would show an
        // empty, reassuring dashboard, which is the worst possible answer.
        if (cancelled) return
        setStorageFailure('load')
        setPhase('home')
      })
    return () => {
      cancelled = true
    }
  }, [scheduler])

  const start = useCallback(() => {
    setQueue(buildQueue(cards, { limit: DEFAULT_SESSION_LIMIT, seed: pinnedSeed ?? Date.now() }))
    setReviewedCount(0)
    setPhase('study')
  }, [cards, pinnedSeed])

  const goHome = useCallback(() => setPhase('home'), [])

  const handleReview = useCallback(
    (card: StudyCard, grade: ReviewGrade, note: string | undefined) => {
      const next = {
        cardId: card.content.id,
        fsrs: scheduler.review(card.progress.fsrs, grade),
        // Taken verbatim, so emptying the field clears the note. Falling back
        // to the previous value made a note impossible to delete.
        note,
        updatedAt: new Date(),
      }
      setCards((current) =>
        current.map((entry) =>
          entry.content.id === card.content.id ? { ...entry, progress: next } : entry,
        ),
      )
      setReviewedCount((count) => count + 1)
      saveProgress(next).catch(() => setStorageFailure('save'))
    },
    [scheduler],
  )

  return (
    <div className="bg-paper text-ink min-h-dvh">
      <header className="border-line border-b">
        <div className="max-w-reading mx-auto flex items-baseline justify-between gap-4 px-5 py-6 sm:px-8">
          <div>
            <h1 className="font-serif text-answer font-semibold">Repères</h1>
            {/* The tagline belongs to the dashboard. During a session the
                header competes with the question for the same 390 px, and one
                thing at a time is the rule. */}
            {phase !== 'study' && (
              <p className="text-muted text-note">Culture générale, par répétition espacée</p>
            )}
            {/* Shown only when a seed was pinned, so a capture carries the seed
                that produced it and a mistyped parameter is visibly ignored. */}
            {pinnedSeed !== null && <p className="text-muted text-note">graine {pinnedSeed}</p>}
          </div>
          {/* Always a way back. Nothing is lost by leaving: each graded card is
              persisted as it is answered. */}
          {phase !== 'home' && phase !== 'loading' && (
            <nav>
              <button
                type="button"
                onClick={goHome}
                className="border-muted rounded-button text-label min-h-12 shrink-0 border px-4 py-2 whitespace-nowrap"
              >
                Tableau de bord
              </button>
            </nav>
          )}
        </div>
      </header>

      <main>
        {/*
          An error must not look like a normal block — DESIGN.md forbids an
          error state dressed as a healthy one — and it must not be red either,
          which would be a second hue and would culpabilise. The accent fill is
          the loudest thing the palette can say with one colour.
        */}
        {storageFailure && (
          <div
            role="alert"
            className="bg-accent text-accent-text max-w-reading rounded-block mx-5 mt-6 p-4 sm:mx-auto"
          >
            <p className="text-label font-semibold">Problème d’enregistrement</p>
            <p className="text-body mt-2">{STORAGE_MESSAGE[storageFailure]}</p>
            <p className="text-note mt-2">
              Le stockage du navigateur est peut-être indisponible : navigation privée, espace
              saturé, ou données du site bloquées.
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <p className="max-w-reading text-body mx-auto px-5 py-8 sm:px-8" aria-live="polite">
            Chargement…
          </p>
        )}

        {phase === 'home' && (
          <Dashboard
            cards={cards}
            scheduler={scheduler}
            sessionLimit={DEFAULT_SESSION_LIMIT}
            onStart={start}
            storageHealthy={storageFailure === null}
          />
        )}

        {phase === 'study' && (
          <StudyView
            queue={queue}
            onReview={handleReview}
            onFinish={() => setPhase('done')}
            onExit={goHome}
          />
        )}

        {phase === 'done' && (
          <section className="max-w-reading mx-auto px-5 py-8 sm:px-8">
            <h2 className="font-serif text-question">Séance terminée</h2>
            <p className="text-body mt-4">
              {reviewedCount} carte{reviewedCount > 1 ? 's' : ''} revue
              {reviewedCount > 1 ? 's' : ''}. Les prochaines échéances sont déjà calculées.
            </p>
            <button
              type="button"
              onClick={goHome}
              className="border-muted rounded-button text-label mt-8 min-h-12 border px-5 py-2 font-semibold"
            >
              Retour au tableau de bord
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
