import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { loadReviews, loadStudyCards, recordReview, resetProgress } from './repository'
import { db } from './db'
import { createScheduler, Rating, type FsrsCard, type ReviewGrade } from '../domain/scheduler'
import type { CardContent, CardProgress, ReviewEvent } from '../domain/types'

const scheduler = createScheduler()

const CARD: CardContent = {
  id: 'carte-a',
  theme: 'sciences',
  question: 'Question ?',
  answer: 'Réponse',
  source: { title: 'Article', url: 'https://fr.wikipedia.org/wiki/Article' },
}

/** Applies one review the way the app does, and writes both sides of it. */
async function review(
  progress: CardProgress,
  grade: ReviewGrade,
  reviewedAt: Date,
): Promise<CardProgress> {
  const next: CardProgress = {
    cardId: progress.cardId,
    fsrs: scheduler.review(progress.fsrs, grade, reviewedAt),
    updatedAt: reviewedAt,
  }
  await recordReview(next, { cardId: progress.cardId, reviewedAt, grade })
  return next
}

function fresh(at: Date): CardProgress {
  return { cardId: CARD.id, fsrs: scheduler.create(at), updatedAt: at }
}

const T0 = new Date('2026-03-01T09:00:00Z')
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000)

beforeEach(async () => {
  await resetProgress()
})

describe('recordReview', () => {
  /*
   * Measured in a real browser on 2026-09-11, before the journal existed: two
   * reviews of the same card left exactly one row, `reps` going 1 to 2, and the
   * first review's time and grade present nowhere. That is what this asserts
   * cannot happen again.
   */
  it('appends every review instead of folding it into the last one', async () => {
    let progress = fresh(T0)
    progress = await review(progress, Rating.Again, minutes(1))
    progress = await review(progress, Rating.Good, minutes(2))
    await review(progress, Rating.Easy, minutes(3))

    const journal = await loadReviews()

    expect(journal).toHaveLength(3)
    expect(journal.map((entry) => entry.grade)).toEqual([Rating.Again, Rating.Good, Rating.Easy])
  })

  it('keeps one row of derived state per card, as before', async () => {
    let progress = fresh(T0)
    progress = await review(progress, Rating.Good, minutes(1))
    await review(progress, Rating.Good, minutes(2))

    expect(await db.progress.count()).toBe(1)
  })

  it('returns the journal oldest first, which is what makes it replayable', async () => {
    let progress = fresh(T0)
    progress = await review(progress, Rating.Again, minutes(5))
    await review(progress, Rating.Good, minutes(9))

    const times = (await loadReviews()).map((entry) => entry.reviewedAt.getTime())

    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it('leaves nothing behind when the learner erases their data', async () => {
    await review(fresh(T0), Rating.Good, minutes(1))

    await resetProgress()

    // A reset that a replay could undo is not a reset.
    expect(await loadReviews()).toEqual([])
    expect(await db.progress.count()).toBe(0)
  })
})

/*
 * The claim the journal is there to support: the derived state can be thrown
 * away and rebuilt from the recorded facts alone.
 *
 * The replay lives here rather than in `domain/`, because nothing in the app
 * calls it yet and an exported function with no caller is dead code. When sync
 * or import is built, it moves — this test is what says the data is sufficient
 * for it to exist at all.
 */
function replay(journal: readonly ReviewEvent[]): CardProgress | null {
  let progress: CardProgress | null = null

  for (const entry of journal) {
    const previous: FsrsCard = progress?.fsrs ?? scheduler.create(entry.reviewedAt)
    progress = {
      cardId: entry.cardId,
      fsrs: scheduler.review(previous, entry.grade, entry.reviewedAt),
      updatedAt: entry.reviewedAt,
    }
  }

  return progress
}

describe('replaying the journal', () => {
  it('rebuilds exactly the state the reviews produced', async () => {
    let live = fresh(T0)
    live = await review(live, Rating.Again, minutes(1))
    live = await review(live, Rating.Hard, minutes(4))
    live = await review(live, Rating.Good, minutes(30))
    live = await review(live, Rating.Easy, minutes(90))

    const rebuilt = replay(await loadReviews())

    expect(rebuilt).toEqual(live)
  })

  /*
   * The point of a journal rather than a merged state: two devices produce two
   * disjoint sets of facts, and the union sorted by time replays into the
   * schedule that a single device would have reached. No arbitration, because
   * chronology decides.
   */
  it('merges two disjoint journals by chronology alone', async () => {
    // What one device would have seen, had it seen everything.
    let together = fresh(T0)
    together = await review(together, Rating.Good, minutes(1))
    together = await review(together, Rating.Again, minutes(7))
    together = await review(together, Rating.Good, minutes(20))
    together = await review(together, Rating.Hard, minutes(50))
    const expected = await loadReviews()
    await resetProgress()

    // Split the same facts across two devices, each unaware of the other.
    const appareilA: ReviewEvent[] = [
      { cardId: CARD.id, reviewedAt: minutes(1), grade: Rating.Good },
      { cardId: CARD.id, reviewedAt: minutes(20), grade: Rating.Good },
    ]
    const appareilB: ReviewEvent[] = [
      { cardId: CARD.id, reviewedAt: minutes(7), grade: Rating.Again },
      { cardId: CARD.id, reviewedAt: minutes(50), grade: Rating.Hard },
    ]

    const merged = [...appareilA, ...appareilB].sort(
      (a, b) => a.reviewedAt.getTime() - b.reviewedAt.getTime(),
    )

    expect(merged.map((entry) => entry.reviewedAt)).toEqual(
      expected.map((entry) => entry.reviewedAt),
    )
    expect(replay(merged)).toEqual(together)
  })
})

describe('loadStudyCards', () => {
  it('leaves an untouched deck with no stored state at all', async () => {
    const cards = await loadStudyCards(scheduler, [CARD], T0)

    expect(cards).toHaveLength(1)
    expect(await db.progress.count()).toBe(0)
    expect(await loadReviews()).toEqual([])
  })

  it('joins stored progress back onto its card', async () => {
    const saved = await review(fresh(T0), Rating.Good, minutes(1))

    const [card] = await loadStudyCards(scheduler, [CARD], minutes(2))

    expect(card.progress).toEqual(saved)
  })
})
