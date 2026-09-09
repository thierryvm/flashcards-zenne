import { THEME_LABELS, type StudyCard } from '../domain/types'
import { summarise } from '../domain/queue'
import { averageRetention, statsByTheme, upcomingReviews, type UpcomingDay } from '../domain/stats'
import type { Scheduler } from '../domain/scheduler'

export interface DashboardProps {
  cards: readonly StudyCard[]
  scheduler: Scheduler
  sessionLimit: number
  onStart: () => void
  /** False when storage failed: an empty deck must not read as a finished one. */
  storageHealthy?: boolean
  now?: Date
}

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

function dayDetail(day: UpcomingDay): string {
  const parts: string[] = []
  if (day.overdue > 0) parts.push(`${day.overdue} en retard`)
  if (day.newCards > 0) parts.push(`${day.newCards} nouvelle${day.newCards > 1 ? 's' : ''}`)
  if (day.due > 0) parts.push(`${day.due} à revoir`)
  return parts.join(', ')
}

export function Dashboard({
  cards,
  scheduler,
  sessionLimit,
  onStart,
  storageHealthy = true,
  now = new Date(),
}: DashboardProps) {
  const summary = summarise(cards, now)
  const themes = statsByTheme(cards, now)
  const upcoming = upcomingReviews(cards, now, 7)
  const retention = averageRetention(cards, scheduler, now)
  const available = summary.dueNow + summary.unseen
  const busiest = Math.max(1, ...upcoming.map((day) => day.total))

  return (
    <section className="px-4 py-6">
      <h2 className="text-2xl font-semibold">Votre progression</h2>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="border-border bg-raised rounded-lg border p-3">
          <dt className="text-muted text-sm">À revoir</dt>
          <dd className="text-2xl font-semibold">{summary.dueNow}</dd>
        </div>
        <div className="border-border bg-raised rounded-lg border p-3">
          <dt className="text-muted text-sm">Nouvelles</dt>
          <dd className="text-2xl font-semibold">{summary.unseen}</dd>
        </div>
        <div className="border-border bg-raised rounded-lg border p-3">
          <dt className="text-muted text-sm">Déjà vues</dt>
          <dd className="text-2xl font-semibold">{summary.reviewed}</dd>
        </div>
        <div className="border-border bg-raised rounded-lg border p-3">
          <dt className="text-muted text-sm">Rétention</dt>
          <dd className="text-2xl font-semibold">
            {retention === null ? '—' : `${Math.round(retention.mean * 100)} %`}
          </dd>
          {/* A bare "100 %" after one easy card says nothing. The denominator
              is part of the figure, not a footnote. */}
          {retention !== null && (
            <dd className="text-muted text-sm">
              sur {retention.sampleSize} carte{retention.sampleSize > 1 ? 's' : ''}
            </dd>
          )}
        </div>
      </dl>

      {retention === null && storageHealthy && (
        <p className="text-muted mt-2 text-sm">
          La rétention apparaîtra après votre première séance.
        </p>
      )}

      <button
        type="button"
        onClick={onStart}
        disabled={available === 0}
        className="bg-accent text-accent-text mt-5 min-h-11 rounded-lg px-5 py-2 font-semibold disabled:opacity-60"
      >
        Commencer une séance
      </button>
      <p className="text-muted mt-2 text-sm">
        {available > 0
          ? `${Math.min(available, sessionLimit)} cartes, thèmes mélangés, sans chronomètre.`
          : storageHealthy
            ? 'Rien à réviser pour le moment. Revenez plus tard : espacer, c’est le principe.'
            : 'Rien à afficher tant que le problème d’enregistrement n’est pas résolu.'}
      </p>

      <h3 className="mt-8 text-xl font-semibold">Par thème</h3>
      <table className="mt-3 w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          Répartition des cartes par thème : acquises, en cours, à revoir, non vues
        </caption>
        <thead>
          <tr className="text-muted">
            <th scope="col" className="py-2 pr-2 font-medium">
              Thème
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              Acquises
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              En cours
            </th>
            <th scope="col" className="py-2 pr-2 text-right font-medium">
              À revoir
            </th>
            <th scope="col" className="py-2 text-right font-medium">
              Non vues
            </th>
          </tr>
        </thead>
        <tbody>
          {themes.map((row) => (
            <tr key={row.theme} className="border-border border-t">
              <th scope="row" className="py-2 pr-2 font-normal">
                {THEME_LABELS[row.theme]}
                <span className="sr-only">
                  {' '}
                  : {percent(row.mastered, row.total)} % acquises sur {row.total} cartes
                </span>
                <div
                  aria-hidden="true"
                  className="border-border mt-1 h-1.5 w-full overflow-hidden rounded-full border"
                >
                  <div
                    className="bg-accent h-full"
                    style={{ width: `${percent(row.mastered, row.total)}%` }}
                  />
                </div>
              </th>
              <td className="py-2 pr-2 text-right tabular-nums">{row.mastered}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{row.learning}</td>
              <td className="py-2 pr-2 text-right tabular-nums">{row.dueNow}</td>
              <td className="py-2 text-right tabular-nums">{row.unseen}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-8 text-xl font-semibold">Les sept prochains jours</h3>
      <p className="text-muted mt-1 text-sm">
        Ce que la répétition espacée vous réserve. Un jour vide est un jour gagné, pas un oubli.
      </p>
      <ul className="mt-3 space-y-1">
        {upcoming.map((day, offset) => {
          const detail = dayDetail(day)
          return (
            <li key={day.date.toISOString()} className="flex items-center gap-3">
              <span className="text-muted w-24 shrink-0 text-sm">
                {offset === 0 ? "Aujourd'hui" : DAY_LABEL.format(day.date)}
              </span>
              <span
                aria-hidden="true"
                className="bg-accent h-3 rounded-sm"
                style={{ width: `${(day.total / busiest) * 100}%` }}
              />
              <span className="text-sm tabular-nums">
                {day.total}
                <span className="sr-only"> carte{day.total > 1 ? 's' : ''}</span>
              </span>
              {/* Written once, so sighted and screen-reader users get the same
                  breakdown rather than two copies that can drift apart. */}
              {detail && <span className="text-muted text-sm">({detail})</span>}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
