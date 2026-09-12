import { Rating, State, type ReviewGrade, type Scheduler } from './scheduler'
import type { ReviewEvent } from './types'

/**
 * What the journal can be asked, once it is replayed.
 *
 * The journal holds facts — a card, an instant, a grade — and nothing about the
 * schedule those facts produced. Everything here therefore goes through a
 * replay: it is the only way to know what the card's state was *at the moment*
 * of each review, which is what separates "you graded Correct" from "you
 * recalled it when it was due".
 *
 * Every figure below is deliberately monotonic or windowed by review count,
 * never by calendar week. Spaced repetition makes reviews rarer as it works, so
 * a weekly series would thin out exactly when the learner is succeeding, and
 * the thinning would read as decline.
 */

const DAY = 86_400_000

export interface ReviewTrace extends ReviewEvent {
  /** True when this was the card's first sighting: nothing was scheduled yet. */
  wasNew: boolean
  /**
   * When the card was due, as scheduled before this review. Absent on a first
   * sighting — an unseen card has no appointment to keep.
   */
  dueAt?: Date
}

/** Chronological, because a replay in any other order rebuilds another state. */
function byChronology(a: ReviewEvent, b: ReviewEvent): number {
  return a.reviewedAt.getTime() - b.reviewedAt.getTime()
}

/**
 * Replays the journal and records, for each review, the state the card was in
 * just before it. This is `replayJournal` with the intermediate states kept
 * instead of discarded.
 */
export function traceJournal(reviews: readonly ReviewEvent[], scheduler: Scheduler): ReviewTrace[] {
  const byCard = new Map<string, ReturnType<Scheduler['create']>>()
  const trace: ReviewTrace[] = []

  for (const review of [...reviews].sort(byChronology)) {
    const before = byCard.get(review.cardId) ?? scheduler.create(review.reviewedAt)
    const wasNew = before.state === State.New
    trace.push({ ...review, wasNew, ...(wasNew ? {} : { dueAt: before.due }) })
    byCard.set(review.cardId, scheduler.review(before, review.grade, review.reviewedAt))
  }

  return trace
}

function startOfDay(date: Date): number {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day.getTime()
}

export interface StudyDay {
  /** Local midnight of a day that actually had reviews. */
  date: Date
  reviews: number
}

export interface Rhythm {
  /**
   * Days that had at least one review, in order. Days without reviews are
   * absent rather than present-and-empty: a grid with a slot for every day
   * turns an absence into a drawn object, and the drawing is a reproach.
   */
  days: StudyDay[]
  /** Cumulative, so coming back after a month adds to it and never resets. */
  studyDays: number
  totalReviews: number
  lastStudiedAt: Date | null
  /** Whole days since the last review, 0 when the learner studied today. */
  daysSinceLast: number | null
}

export function rhythm(reviews: readonly ReviewEvent[], now: Date = new Date()): Rhythm {
  const counts = new Map<number, number>()
  for (const review of reviews) {
    const day = startOfDay(review.reviewedAt)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  const days = [...counts.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, count]) => ({ date: new Date(time), reviews: count }))

  const lastStudiedAt = days.length === 0 ? null : days[days.length - 1].date

  return {
    days,
    studyDays: days.length,
    totalReviews: reviews.length,
    lastStudiedAt,
    daysSinceLast:
      lastStudiedAt === null
        ? null
        : Math.max(0, Math.round((startOfDay(now) - startOfDay(lastStudiedAt)) / DAY)),
  }
}

/**
 * The smallest window that says anything. At fifty reviews a success rate
 * carries about ±8 points at 95 % confidence — assuming a rate near 90 %, which
 * is where a working schedule sits. At twenty it is ±13, wider than any trend
 * worth reading, and a lower true rate widens it further.
 */
export const RETENTION_WINDOW = 50

export interface RetentionWindow {
  from: Date
  to: Date
  reviews: number
  recalled: number
  rate: number
}

function wasRecalled(grade: ReviewGrade): boolean {
  return grade !== Rating.Again
}

/**
 * Success rate over fixed windows of reviews, anchored at the most recent one.
 *
 * Anchored at the end, not the start: the newest window is the one the learner
 * is in, and it would be the one dropped if the remainder fell at the end. Only
 * whole windows are returned — a trailing window of nine reviews is the noisy
 * point this whole design refuses to draw.
 *
 * First sightings are excluded throughout. Grading a card you have never seen
 * says nothing about recall, and counting it would drag the rate down exactly
 * when a learner opens a new deck.
 */
export function retentionWindows(
  trace: readonly ReviewTrace[],
  size: number = RETENTION_WINDOW,
): RetentionWindow[] {
  const mature = trace.filter((review) => !review.wasNew)
  const windows: RetentionWindow[] = []

  for (let end = mature.length; end - size >= 0; end -= size) {
    const slice = mature.slice(end - size, end)
    const recalled = slice.filter((review) => wasRecalled(review.grade)).length
    windows.unshift({
      from: slice[0].reviewedAt,
      to: slice[slice.length - 1].reviewedAt,
      reviews: slice.length,
      recalled,
      rate: recalled / slice.length,
    })
  }

  return windows
}

export interface GradeBlock {
  label: string
  from: Date
  to: Date
  total: number
  counts: Record<ReviewGrade, number>
}

function countGrades(slice: readonly ReviewTrace[], label: string): GradeBlock {
  const counts = {
    [Rating.Again]: 0,
    [Rating.Hard]: 0,
    [Rating.Good]: 0,
    [Rating.Easy]: 0,
  } as Record<ReviewGrade, number>
  for (const review of slice) counts[review.grade] += 1
  return {
    label,
    from: slice[0].reviewedAt,
    to: slice[slice.length - 1].reviewedAt,
    total: slice.length,
    counts,
  }
}

/** Below this, a distribution is four numbers pretending to be a shape. */
export const GRADE_BLOCK_MINIMUM = 20

/**
 * The distribution of grades, as one block or as two compared ones.
 *
 * Two blocks rather than a weekly series: past the second month a week holds
 * eleven to twenty reviews, which spread over four grades is three to five per
 * bar. Comparing the first fifty reviews with the last fifty answers the same
 * question — has this got easier — without inventing a granularity the data
 * does not have.
 */
export function gradeBlocks(
  trace: readonly ReviewTrace[],
  size: number = RETENTION_WINDOW,
): GradeBlock[] {
  const mature = trace.filter((review) => !review.wasNew)
  if (mature.length < GRADE_BLOCK_MINIMUM) return []
  if (mature.length < size * 2) return [countGrades(mature, 'Depuis le début')]
  return [
    countGrades(mature.slice(0, size), `Les ${size} premières`),
    countGrades(mature.slice(-size), `Les ${size} dernières`),
  ]
}

/** Below this, "honoré / dû" is a handful of appointments, not a habit. */
export const PUNCTUALITY_MINIMUM = 20

export interface Punctuality {
  /** Reviews of cards that had an appointment to keep. */
  due: number
  /** Those reviewed on the day they came due, or before it. */
  onTime: number
  rate: number
  /** Median whole days late, counting on-time reviews as zero. */
  medianDelay: number
}

/**
 * Of the cards that came due, how many were reviewed the day they did.
 *
 * Compared by calendar day rather than by instant: a card due at 09:00 and
 * reviewed at 20:00 was reviewed on time by any human reading, and counting it
 * late would make the figure measure the hour of day someone studies.
 */
export function punctuality(trace: readonly ReviewTrace[]): Punctuality | null {
  const appointments = trace.filter((review) => review.dueAt !== undefined)
  if (appointments.length < PUNCTUALITY_MINIMUM) return null

  const delays = appointments
    .map((review) =>
      Math.max(0, Math.round((startOfDay(review.reviewedAt) - startOfDay(review.dueAt!)) / DAY)),
    )
    .sort((a, b) => a - b)

  const onTime = delays.filter((delay) => delay === 0).length
  const middle = Math.floor(delays.length / 2)

  return {
    due: delays.length,
    onTime,
    rate: onTime / delays.length,
    medianDelay:
      delays.length % 2 === 0 ? (delays[middle - 1] + delays[middle]) / 2 : delays[middle],
  }
}
