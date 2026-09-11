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

/**
 * A zero is worth showing and not worth shouting. On a fresh install the table
 * is thirty-two of them, and at full weight they were the loudest thing on the
 * first screen someone ever sees.
 */
function Count({ value }: { value: number }) {
  return (
    <td
      className={`text-body py-3 pr-4 text-right tabular-nums ${value === 0 ? 'text-muted' : ''}`}
    >
      {value}
    </td>
  )
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
  /** Nothing has left the "new" state yet, so every earned column reads zero. */
  const started = summary.reviewed > 0

  return (
    <section className="max-w-reading mx-auto px-5 py-8 sm:px-8">
      <h2 className="font-serif text-question">Votre progression</h2>

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

      <h3 className="font-serif text-answer mt-12">Par thème</h3>
      {/*
        Before the first session, "Acquises", "En cours" and "À revoir" can only
        be zero — twenty-four numbers that carry no information on the very
        first screen anyone sees. The column that does say something is how many
        cards each theme holds. The rest appears once there is something to put
        in it.
      */}
      <table className="mt-4 w-full border-collapse text-left">
        <caption className="sr-only">
          {started
            ? 'Répartition des cartes par thème : acquises, en cours, à revoir, non vues'
            : 'Nombre de cartes par thème'}
        </caption>
        <thead>
          <tr className="text-muted text-label">
            <th scope="col" className="py-3 pr-4 font-semibold">
              Thème
            </th>
            {started && (
              <>
                <th scope="col" className="py-3 pr-4 text-right font-semibold">
                  Acquises
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-semibold">
                  En cours
                </th>
                <th scope="col" className="py-3 pr-4 text-right font-semibold">
                  À revoir
                </th>
              </>
            )}
            <th scope="col" className="py-3 text-right font-semibold">
              {started ? 'Non vues' : 'Cartes'}
            </th>
          </tr>
        </thead>
        <tbody>
          {themes.map((row) => (
            <tr key={row.theme} className="border-line border-t">
              {/* The bar that used to sit here was a 155 px hairline, empty at
                  0 %, and read as a failed underline rather than a gauge. */}
              <th scope="row" className="text-body py-3 pr-4 font-normal">
                {THEME_LABELS[row.theme]}
                {started && (
                  <span className="sr-only">
                    {' '}
                    : {percent(row.mastered, row.total)} % acquises sur {row.total} cartes
                  </span>
                )}
              </th>
              {started && (
                <>
                  <Count value={row.mastered} />
                  <Count value={row.learning} />
                  <Count value={row.dueNow} />
                </>
              )}
              <td
                className={`text-body py-3 text-right tabular-nums ${row.unseen === 0 ? 'text-muted' : ''}`}
              >
                {started ? row.unseen : row.total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="font-serif text-answer mt-12">Les sept prochains jours</h3>
      <p className="text-muted text-note mt-2">
        Ce que la répétition espacée vous réserve. Un jour vide est un jour gagné, pas un oubli.
      </p>
      <ul className="mt-4">
        {upcoming.map((day, offset) => {
          const detail = dayDetail(day)
          return (
            <li
              key={day.date.toISOString()}
              className="border-line flex flex-wrap items-baseline justify-between gap-x-4 border-t py-3"
            >
              <span className="text-body">
                {offset === 0 ? "Aujourd'hui" : DAY_LABEL.format(day.date)}
              </span>
              <span className="text-body tabular-nums">
                {day.total}
                <span className="sr-only"> carte{day.total > 1 ? 's' : ''}</span>
                {/* Written once, so sighted and screen-reader users get the
                    same breakdown rather than two copies that can drift. */}
                {detail && <span className="text-muted text-note"> — {detail}</span>}
              </span>
            </li>
          )
        })}
      </ul>

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
    </section>
  )
}
