import { THEME_LABELS, type StudyCard } from '../domain/types'
import { summarise } from '../domain/queue'
import { statsByTheme, upcomingReviews, type UpcomingDay } from '../domain/stats'

export interface ProgressProps {
  cards: readonly StudyCard[]
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

/**
 * The progress page. Eight themes and a week of dates are more classes than a
 * chart can carry, and both were already in their right form — a table and a
 * list. They move here unchanged rather than being redrawn as curves.
 */
export function Progress({ cards, now = new Date() }: ProgressProps) {
  const summary = summarise(cards, now)
  const themes = statsByTheme(cards, now)
  const upcoming = upcomingReviews(cards, now, 7)
  /** Nothing has left the "new" state yet, so every earned column reads zero. */
  const started = summary.reviewed > 0

  return (
    <section className="max-w-reading mx-auto px-5 py-8 sm:px-8">
      <h2 className="font-serif text-question">Votre progression</h2>

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
        {/*
          À 390 px, « En cours », « À revoir » et « Non vues » passent sur deux
          lignes tandis que « Thème » et « Acquises » tiennent sur une. Centrés
          par défaut, les courts flottaient entre les deux lignes des longs et
          la rangée d'en-têtes se lisait de travers. Posés sur la même ligne de
          base, les cinq libellés s'alignent.

          Le nom de l'utilitaire n'est pas épelé ici : Tailwind lit les
          commentaires comme du texte brut, et le mentionner suffirait à faire
          émettre la règle que `tokens.test.ts` cherche dans le CSS produit.
          Le test resterait vert après que ces classes aient disparu.
        */}
        <thead className="align-bottom">
          <tr className="text-muted text-label">
            <th scope="col" className="py-3 pr-4 align-bottom font-semibold">
              Thème
            </th>
            {started && (
              <>
                <th scope="col" className="py-3 pr-4 text-right align-bottom font-semibold">
                  Acquises
                </th>
                <th scope="col" className="py-3 pr-4 text-right align-bottom font-semibold">
                  En cours
                </th>
                <th scope="col" className="py-3 pr-4 text-right align-bottom font-semibold">
                  À revoir
                </th>
              </>
            )}
            <th scope="col" className="py-3 text-right align-bottom font-semibold">
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
    </section>
  )
}
