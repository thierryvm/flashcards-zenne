import { useCallback, useEffect, useMemo, useState } from 'react'
import { StudyView } from './ui/StudyView'
import { buildQueue, summarise } from './domain/queue'
import { createScheduler, type ReviewGrade } from './domain/scheduler'
import { loadStudyCards, saveProgress } from './data/repository'
import type { StudyCard } from './domain/types'

const SESSION_LIMIT = 12

type Phase = 'loading' | 'home' | 'study' | 'done'

export default function App() {
  const scheduler = useMemo(() => createScheduler(), [])
  const [cards, setCards] = useState<StudyCard[]>([])
  const [queue, setQueue] = useState<StudyCard[]>([])
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

  const summary = useMemo(() => summarise(cards), [cards])

  const start = useCallback(() => {
    setQueue(buildQueue(cards, { limit: SESSION_LIMIT, seed: Date.now() }))
    setPhase('study')
  }, [cards])

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
      void saveProgress(next)
    },
    [scheduler],
  )

  return (
    <div className="min-h-dvh bg-surface text-text">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-baseline gap-3 px-4 py-4">
          <h1 className="text-xl font-semibold">Repères</h1>
          <p className="text-muted text-sm">Culture générale, par répétition espacée</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl">
        {phase === 'loading' && (
          <p className="px-4 py-6" aria-live="polite">
            Chargement…
          </p>
        )}

        {phase === 'home' && (
          <section className="px-4 py-6">
            <h2 className="text-2xl font-semibold">Votre séance</h2>
            <dl className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-raised p-3">
                <dt className="text-muted text-sm">À revoir</dt>
                <dd className="text-2xl font-semibold">{summary.dueNow}</dd>
              </div>
              <div className="rounded-lg border border-border bg-raised p-3">
                <dt className="text-muted text-sm">Nouvelles</dt>
                <dd className="text-2xl font-semibold">{summary.unseen}</dd>
              </div>
              <div className="rounded-lg border border-border bg-raised p-3">
                <dt className="text-muted text-sm">Total</dt>
                <dd className="text-2xl font-semibold">{summary.total}</dd>
              </div>
            </dl>

            <p className="text-muted mt-4">
              Une séance courte, {SESSION_LIMIT} cartes au maximum, sans chronomètre. Les thèmes
              sont mélangés&nbsp;: c&apos;est ce qui rend le rappel efficace.
            </p>

            <button
              type="button"
              onClick={start}
              disabled={summary.dueNow + summary.unseen === 0}
              className="mt-5 min-h-11 rounded-lg bg-accent px-5 py-2 font-semibold text-accent-text disabled:opacity-60"
            >
              Commencer
            </button>

            {summary.dueNow + summary.unseen === 0 && (
              <p className="mt-3" aria-live="polite">
                Rien à réviser pour le moment. Revenez plus tard&nbsp;: c&apos;est le principe.
              </p>
            )}
          </section>
        )}

        {phase === 'study' && (
          <StudyView queue={queue} onReview={handleReview} onFinish={() => setPhase('done')} />
        )}

        {phase === 'done' && (
          <section className="px-4 py-6">
            <h2 className="text-2xl font-semibold">Séance terminée</h2>
            <p className="text-muted mt-3">
              {queue.length} carte{queue.length > 1 ? 's' : ''} revue
              {queue.length > 1 ? 's' : ''}. Les prochaines échéances sont déjà calculées.
            </p>
            <button
              type="button"
              onClick={() => setPhase('home')}
              className="mt-5 min-h-11 rounded-lg border border-border bg-raised px-5 py-2"
            >
              Retour
            </button>
          </section>
        )}
      </main>
    </div>
  )
}
