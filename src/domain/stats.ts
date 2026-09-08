import { State } from 'ts-fsrs'
import { isDue, isNew, type Scheduler } from './scheduler'
import { THEMES, type StudyCard, type ThemeId } from './types'

/**
 * Stability, in days, above which a card counts as settled. FSRS has no notion
 * of "mastered": this is a product threshold, chosen so that a card the learner
 * will not see again for three weeks reads as acquired. It is deliberately
 * explicit rather than hidden in a magic number.
 */
export const MASTERY_STABILITY_DAYS = 21

export interface ThemeStats {
  theme: ThemeId
  total: number
  unseen: number
  dueNow: number
  learning: number
  mastered: number
}

export function statsByTheme(cards: readonly StudyCard[], now: Date = new Date()): ThemeStats[] {
  const empty = (theme: ThemeId): ThemeStats => ({
    theme,
    total: 0,
    unseen: 0,
    dueNow: 0,
    learning: 0,
    mastered: 0,
  })
  const rows = new Map<ThemeId, ThemeStats>(THEMES.map((theme) => [theme, empty(theme)]))

  for (const card of cards) {
    const row = rows.get(card.content.theme)
    if (!row) continue

    row.total += 1
    const fsrs = card.progress.fsrs

    if (isNew(fsrs)) {
      row.unseen += 1
      continue
    }
    if (isDue(fsrs, now)) row.dueNow += 1
    if (fsrs.state === State.Review && fsrs.stability >= MASTERY_STABILITY_DAYS) row.mastered += 1
    else row.learning += 1
  }

  return [...rows.values()].filter((row) => row.total > 0)
}

export interface UpcomingDay {
  date: Date
  count: number
}

function atMidnight(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/**
 * How many cards fall due on each of the coming days. Seeing the load ahead is
 * what makes spacing legible: it turns "come back later" into something the
 * learner can plan around.
 */
export function upcomingReviews(
  cards: readonly StudyCard[],
  now: Date = new Date(),
  days = 7,
): UpcomingDay[] {
  const start = atMidnight(now)
  const buckets: UpcomingDay[] = Array.from({ length: days }, (_, offset) => {
    const date = new Date(start)
    date.setDate(start.getDate() + offset)
    return { date, count: 0 }
  })

  for (const card of cards) {
    if (isNew(card.progress.fsrs)) continue

    const due = atMidnight(card.progress.fsrs.due)
    const offset = Math.round((due.getTime() - start.getTime()) / 86_400_000)
    if (offset < 0) buckets[0].count += 1
    else if (offset < days) buckets[offset].count += 1
  }

  return buckets
}

/**
 * Mean probability of recall across cards already seen, as FSRS estimates it.
 * Returns null when nothing has been reviewed, rather than a misleading zero.
 */
export function averageRetention(
  cards: readonly StudyCard[],
  scheduler: Scheduler,
  now: Date = new Date(),
): number | null {
  const seen = cards.filter((card) => !isNew(card.progress.fsrs))
  if (seen.length === 0) return null

  const total = seen.reduce(
    (sum, card) => sum + scheduler.retrievability(card.progress.fsrs, now),
    0,
  )
  return total / seen.length
}
