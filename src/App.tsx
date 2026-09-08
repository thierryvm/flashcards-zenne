import { useCallback, useEffect, useMemo, useState } from 'react'
import { StudyView } from './ui/StudyView'
import { Dashboard } from './ui/Dashboard'
import { buildQueue } from './domain/queue'
import { createScheduler, type ReviewGrade } from './domain/scheduler'
import { loadStudyCards, saveProgress } from './data/repository'
import type { StudyCard } from './domain/types'

const SESSION_LIMIT = 12

type Phase = 'loading' | 'home' | 'study' | 'done'

export default function App() {
  const scheduler = useMemo(() => createScheduler(), [])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [queue, setQueue] = useState<StudyCard[]>([])
  const [reviewedCount, setReviewedCount] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')

  useEffect(() => {
    let cancelled = false
    loadStudyCards(scheduler)
      .then((loaded) => {
        if (cancelled) return
        setCards(loaded)
        setPhase('home')
      })
      .catch(() => {
        if (!cancelled) setPhase('home')
      })
    return () => {
      cancelled = true
    }
  }, [scheduler])

  const start = useCallback(() => {
    setQueue(buildQueue(cards, { limit: SESSION_LIMIT, seed: Date.now() }))
    setReviewedCount(0)
    setPhase('study')
  }, [cards])

  const goHome = useCallback(() => setPhase('home'), [])

  const handleReview = useCallback(
    (card: StudyCard, grade: ReviewGrade, note?: string) => {
      const next = {
        cardId: card.content.id,
        fsrs: scheduler.review(card.progress.fsrs, grade),
        note: note ?? card.progress.note,
        updatedAt: new Date(),
      }
      setCards((current) =>
        current.map((entry) =>
          entry.content.id === card.content.id ? { ...entry, progress: next } : entry,
        ),
      )
      setReviewedCount((count) => count + 1)
      void saveProgress(next)
    },
    [scheduler],
  )

  return (
    <div className="bg-surface text-text min-h-dvh">
      <header className="border-border border-b">
        <div className="mx-auto flex max-w-2xl flex-wrap items-baseline gap-x-3 gap-y-1 px-4 py-4">
          <h1 className="text-xl font-semibold">Repères</h1>
          <p className="text-muted text-sm">Culture générale, par répétition espacée</p>
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
        {phase === 'loading' && (
          <p className="px-4 py-6" aria-live="polite">
            Chargement…
          </p>
        )}

        {phase === 'home' && (
          <Dashboard
            cards={cards}
            scheduler={scheduler}
            sessionLimit={SESSION_LIMIT}
            onStart={start}
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
