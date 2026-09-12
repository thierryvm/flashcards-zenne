import type { ReactNode } from 'react'
import type { StudyCard } from '../domain/types'
import { summarise } from '../domain/queue'
import { averageRetention } from '../domain/stats'
import type { Scheduler } from '../domain/scheduler'
import { hashFor } from '../domain/route'

export interface HomeProps {
  cards: readonly StudyCard[]
  scheduler: Scheduler
  sessionLimit: number
  onStart: () => void
  /** False when storage failed: an empty deck must not read as a finished one. */
  storageHealthy?: boolean
  now?: Date
  /**
   * Backup controls, passed in rather than imported. The view is handed its
   * cards; giving it its own database access would make every test of it a test
   * of IndexedDB too.
   */
  backup?: ReactNode
}

/**
 * The page the app opens on. It answers one question — is there something to
 * do right now — and hands everything that looks backwards to the progress
 * page. Reading the week ahead and eight themes worth of counts before being
 * allowed to start was the whole of the "tout est sur la même page" complaint.
 */
export function Home({
  cards,
  scheduler,
  sessionLimit,
  onStart,
  storageHealthy = true,
  now = new Date(),
  backup,
}: HomeProps) {
  const summary = summarise(cards, now)
  const retention = averageRetention(cards, scheduler, now)
  const available = summary.dueNow + summary.unseen

  return (
    <section className="max-w-reading mx-auto px-5 py-8 sm:px-8">
      <h2 className="font-serif text-question">Aujourd’hui</h2>

      {/* Four figures on the paper. They were four bordered boxes, which made
          the emptiest part of the screen look like the most structured one. */}
      <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4">
        <div>
          <dt className="text-muted text-label">À revoir</dt>
          <dd className="font-serif text-answer tabular-nums">{summary.dueNow}</dd>
        </div>
        <div>
          <dt className="text-muted text-label">Nouvelles</dt>
          <dd className="font-serif text-answer tabular-nums">{summary.unseen}</dd>
        </div>
        <div>
          <dt className="text-muted text-label">Déjà vues</dt>
          <dd className="font-serif text-answer tabular-nums">{summary.reviewed}</dd>
        </div>
        <div>
          <dt className="text-muted text-label">Rétention</dt>
          <dd className="font-serif text-answer tabular-nums">
            {retention === null ? '—' : `${Math.round(retention.mean * 100)} %`}
          </dd>
          {/* A bare "100 %" after one easy card says nothing. The denominator
              is part of the figure, not a footnote. */}
          {retention !== null && (
            <dd className="text-muted text-note">
              sur {retention.sampleSize} carte{retention.sampleSize > 1 ? 's' : ''}
            </dd>
          )}
        </div>
      </dl>

      {retention === null && storageHealthy && (
        <p className="text-muted text-note mt-4">
          La rétention apparaîtra après votre première séance.
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={available === 0}
        className="bg-accent text-accent-text rounded-button text-label min-h-12 mt-8 border border-accent px-5 py-2 font-semibold disabled:opacity-60"
      >
        Commencer une séance
      </button>
      <p className="text-muted text-note mt-3">
        {available > 0
          ? `${Math.min(available, sessionLimit)} cartes, thèmes mélangés, sans chronomètre.`
          : storageHealthy
            ? 'Rien à réviser pour le moment. Revenez plus tard : espacer, c’est le principe.'
            : 'Rien à afficher tant que le problème d’enregistrement n’est pas résolu.'}
      </p>

      {/* A link, not a button: it is navigation, it has an address, and it
          should work with a middle click and a bookmark like any other. */}
      <p className="mt-12">
        <a
          href={hashFor('progression')}
          className="border-muted rounded-button text-label inline-flex min-h-12 items-center border px-5 py-2 font-semibold"
        >
          Voir ma progression
        </a>
      </p>

      {/*
        Where the data lives, and what that means. The second sentence is the
        point: "stockage local" is not something a learner translates into
        consequences on their own, and finding out by opening the app on another
        device — where everything reads as untouched — is the worst way to learn
        it. Stated calmly and once, not as an alert: nothing is broken.
      */}
      <p className="border-line text-muted text-note mt-12 border-t pt-6">
        Votre progression reste sur cet appareil, dans ce navigateur. Elle ne vous suivra pas sur un
        autre téléphone ou un autre ordinateur, et effacer les données du site l’efface aussi.
      </p>

      {backup}
    </section>
  )
}
