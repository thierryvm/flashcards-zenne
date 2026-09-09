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
    <div className="bg-surface text-text min-h-dvh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-2xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4">
          <h1 className="text-xl font-semibold">Repères</h1>
          <p className="text-muted text-sm">Culture générale, par répétition espacée</p>
          {/* Shown only when a seed was pinned, so a capture carries the seed
              that produced it and a mistyped parameter is visibly ignored. */}
          {pinnedSeed !== null && <p className="text-muted text-xs">graine {pinnedSeed}</p>}
          {/* Always a way back. Nothing is lost by leaving: each graded card is
              persisted as it is answered. */}
          {phase !== 'home' && phase !== 'loading' && (
            <nav className="ml-auto">
              <button
                type="button"
                onClick={goHome}
                className="border-border bg-raised min-h-11 rounded-lg border px-3 py-1 text-sm"
              >
                Tableau de bord
              </button>
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        {storageFailure && (
          <div
            role="alert"
            className="border-danger text-danger mx-4 mt-4 rounded-lg border-l-4 p-3"
          >
            <p className="font-semibold">Problème d’enregistrement</p>
            <p className="mt-1 text-sm">{STORAGE_MESSAGE[storageFailure]}</p>
            <p className="text-muted mt-1 text-sm">
              Le stockage du navigateur est peut-être indisponible : navigation privée, espace
              saturé, ou données du site bloquées.
            </p>
          </div>
        )}

        {phase === 'loading' && (
          <p className="px-4 py-6" aria-live="polite">
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
          <section className="px-4 py-6">
            <h2 className="text-2xl font-semibold">Séance terminée</h2>
            <p className="text-muted mt-3">
              {reviewedCount} carte{reviewedCount > 1 ? 's' : ''} revue
              {reviewedCount > 1 ? 's' : ''}. Les prochaines échéances sont déjà calculées.
            </p>
            <button
              type="button"
              onClick={goHome}
              className="border-border bg-raised mt-5 min-h-11 rounded-lg border px-5 py-2"
            >
              Retour au tableau de bord
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
