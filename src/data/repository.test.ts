import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  importJournal,
  loadReviews,
  loadStudyCards,
  recordReview,
  resetProgress,
} from './repository'
import { db } from './db'
import { replayJournal } from '../domain/journal'
import { createScheduler, Rating, type ReviewGrade } from '../domain/scheduler'
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
 */
describe('replaying the journal', () => {
  it('rebuilds exactly the state the reviews produced', async () => {
    let live = fresh(T0)
    live = await review(live, Rating.Again, minutes(1))
    live = await review(live, Rating.Hard, minutes(4))
    live = await review(live, Rating.Good, minutes(30))
    live = await review(live, Rating.Easy, minutes(90))

    const rebuilt = replayJournal(await loadReviews(), scheduler)

    expect(rebuilt).toEqual([live])
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
    expect(replayJournal(merged, scheduler)).toEqual([together])
  })
})

/*
 * Folding another device's reviews into this one. The property that matters is
 * that this is a merge and not a restore: nothing is overwritten, and a file
 * already imported adds nothing the second time.
 */
describe('importJournal', () => {
  function elsewhere(at: Date, grade: ReviewGrade, cardId = 'carte-b'): ReviewEvent {
    return { cardId, reviewedAt: at, grade }
  }

  it('adds the reviews this device did not have', async () => {
    await review(fresh(T0), Rating.Good, minutes(1))

    const outcome = await importJournal(
      [elsewhere(minutes(5), Rating.Again), elsewhere(minutes(6), Rating.Good)],
      scheduler,
    )

    expect(outcome).toEqual({ added: 2, total: 3 })
    expect(await loadReviews()).toHaveLength(3)
  })

  it('changes nothing when the same file is imported twice', async () => {
    const file = [elsewhere(minutes(5), Rating.Again), elsewhere(minutes(6), Rating.Good)]

    const first = await importJournal(file, scheduler)
    const before = await db.progress.get('carte-b')

    const second = await importJournal(file, scheduler)

    expect(first).toEqual({ added: 2, total: 2 })
    expect(second).toEqual({ added: 0, total: 2 })
    expect(await loadReviews()).toHaveLength(2)
    expect(await db.progress.get('carte-b')).toEqual(before)
  })

  it('never loses a review this device already held', async () => {
    let progress = fresh(T0)
    progress = await review(progress, Rating.Good, minutes(1))
    await review(progress, Rating.Hard, minutes(20))

    await importJournal([elsewhere(minutes(10), Rating.Good, CARD.id)], scheduler)

    const journal = await loadReviews()
    expect(journal.map((entry) => entry.reviewedAt)).toEqual([minutes(1), minutes(10), minutes(20)])
  })

  /*
   * The whole point: a review that happened *between* two local ones is not
   * appended at the end, it takes its place in the story and the schedule is
   * recomputed as if it had always been there.
   */
  it('rebuilds the schedule a single device would have reached', async () => {
    let together = fresh(T0)
    together = await review(together, Rating.Good, minutes(1))
    together = await review(together, Rating.Again, minutes(7))
    together = await review(together, Rating.Good, minutes(20))
    const expected = await db.progress.get(CARD.id)
    await resetProgress()

    // Same facts, split across two devices, arriving in the wrong order.
    let here = fresh(T0)
    here = await review(here, Rating.Good, minutes(1))
    await review(here, Rating.Good, minutes(20))
    await importJournal([elsewhere(minutes(7), Rating.Again, CARD.id)], scheduler)

    expect(await db.progress.get(CARD.id)).toEqual(expected)
  })

  it('brings the learner’s notes along', async () => {
    await importJournal(
      [{ cardId: 'carte-b', reviewedAt: minutes(5), grade: Rating.Good, note: 'Retenu ainsi.' }],
      scheduler,
    )

    expect((await db.progress.get('carte-b'))?.note).toBe('Retenu ainsi.')
  })

  it('leaves cards absent from the file untouched', async () => {
    const mine = await review(fresh(T0), Rating.Good, minutes(1))

    await importJournal([elsewhere(minutes(5), Rating.Good)], scheduler)

    expect(await db.progress.get(CARD.id)).toEqual(mine)
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
