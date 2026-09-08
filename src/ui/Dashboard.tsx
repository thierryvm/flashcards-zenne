import { THEME_LABELS, type StudyCard } from '../domain/types'
import { summarise } from '../domain/queue'
import { averageRetention, statsByTheme, upcomingReviews } from '../domain/stats'
import type { Scheduler } from '../domain/scheduler'

export interface DashboardProps {
  cards: readonly StudyCard[]
  scheduler: Scheduler
  sessionLimit: number
  onStart: () => void
  now?: Date
}

const DAY_LABEL = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric' })

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

export function Dashboard({
  cards,
  scheduler,
  sessionLimit,
  onStart,
  now = new Date(),
}: DashboardProps) {
  const summary = summarise(cards, now)
  const themes = statsByTheme(cards, now)
  const upcoming = upcomingReviews(cards, now, 7)
  const retention = averageRetention(cards, scheduler, now)
  const available = summary.dueNow + summary.unseen
  const busiest = Math.max(1, ...upcoming.map((day) => day.count))

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
            {retention === null ? '—' : `${Math.round(retention * 100)} %`}
          </dd>
        </div>
      </dl>

      {retention === null && (
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
        {available === 0
          ? 'Rien à réviser pour le moment. Revenez plus tard : espacer, c’est le principe.'
          : `${Math.min(available, sessionLimit)} cartes, thèmes mélangés, sans chronomètre.`}
      </p>

      <h3 className="mt-8 text-xl font-semibold">Par thème</h3>
      <table className="mt-3 w-full border-collapse text-left text-sm">
        <caption className="sr-only">
          Répartition des cartes par thème : acquises, en cours, non vues
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
        {upcoming.map((day) => (
          <li key={day.date.toISOString()} className="flex items-center gap-3">
            <span className="text-muted w-20 shrink-0 text-sm">{DAY_LABEL.format(day.date)}</span>
            <span
              aria-hidden="true"
              className="bg-accent h-3 rounded-sm"
              style={{ width: `${(day.count / busiest) * 100}%` }}
            />
            <span className="text-sm tabular-nums">
              {day.count}
              <span className="sr-only"> carte{day.count > 1 ? 's' : ''} à revoir</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
