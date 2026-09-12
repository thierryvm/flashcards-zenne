import { describe, expect, it } from 'vitest'
import {
  gradeBlocks,
  punctuality,
  retentionWindows,
  rhythm,
  traceJournal,
  type ReviewTrace,
} from './analytics'
import { createScheduler, Rating, type ReviewGrade } from './scheduler'
import type { ReviewEvent } from './types'

const scheduler = createScheduler()
const T0 = new Date('2026-01-01T09:00:00Z')
const DAY = 86_400_000

function at(days: number, hour = 9): Date {
  const date = new Date(T0.getTime() + days * DAY)
  date.setHours(hour, 0, 0, 0)
  return date
}

function review(cardId: string, days: number, grade: ReviewGrade = Rating.Good): ReviewEvent {
  return { cardId, reviewedAt: at(days), grade }
}

/** A trace built by hand, for the functions that only read the trace. */
function traced(
  count: number,
  grade: (index: number) => ReviewGrade,
  options: { wasNew?: boolean; dueAt?: (index: number) => Date } = {},
): ReviewTrace[] {
  return Array.from({ length: count }, (_, index) => ({
    cardId: `carte-${index}`,
    reviewedAt: at(index),
    grade: grade(index),
    wasNew: options.wasNew ?? false,
    ...(options.dueAt ? { dueAt: options.dueAt(index) } : {}),
  }))
}

describe('traceJournal', () => {
  it('marks a first sighting as new and gives it no appointment', () => {
    const trace = traceJournal([review('a', 0)], scheduler)

    expect(trace).toHaveLength(1)
    expect(trace[0].wasNew).toBe(true)
    expect(trace[0].dueAt).toBeUndefined()
  })

  /*
   * The point of the whole module: the journal says "Correct on 3 January",
   * and only a replay can add "and the card had been due since 2 January".
   */
  it('recovers the appointment a card carried before each later review', () => {
    const trace = traceJournal([review('a', 0), review('a', 5)], scheduler)

    expect(trace[1].wasNew).toBe(false)
    expect(trace[1].dueAt).toBeInstanceOf(Date)
    expect(trace[1].dueAt!.getTime()).toBeGreaterThan(trace[0].reviewedAt.getTime())
  })

  it('replays in chronological order whatever order it is handed', () => {
    const forwards = traceJournal([review('a', 0), review('a', 5)], scheduler)
    const backwards = traceJournal([review('a', 5), review('a', 0)], scheduler)

    expect(backwards.map((entry) => entry.reviewedAt)).toEqual(
      forwards.map((entry) => entry.reviewedAt),
    )
    expect(backwards[1].dueAt).toEqual(forwards[1].dueAt)
  })

  it('keeps each card on its own timeline', () => {
    const trace = traceJournal([review('a', 0), review('b', 1)], scheduler)

    expect(trace.every((entry) => entry.wasNew)).toBe(true)
  })
})

describe('rhythm', () => {
  it('counts a day once however many reviews it held', () => {
    const result = rhythm([review('a', 0), review('b', 0), review('c', 3)], at(3))

    expect(result.studyDays).toBe(2)
    expect(result.totalReviews).toBe(3)
    expect(result.days.map((day) => day.reviews)).toEqual([2, 1])
  })

  /*
   * The constraint that shaped this: a day without reviews must not exist as an
   * object. A grid with a cell for every day draws the absence, and a drawn
   * absence is a reproach — the same mistake as colouring "À revoir" red.
   */
  it('lists only the days that happened, never the ones that did not', () => {
    const result = rhythm([review('a', 0), review('b', 30)], at(30))

    expect(result.days).toHaveLength(2)
    expect(result.days.map((day) => day.date.getDate())).toEqual([
      at(0).getDate(),
      at(30).getDate(),
    ])
  })

  // Cumulative by construction: an absence pauses it, nothing resets it.
  it('does not lose study days after a long absence', () => {
    const before = rhythm([review('a', 0), review('b', 1)], at(1))
    const after = rhythm([review('a', 0), review('b', 1)], at(60))

    expect(after.studyDays).toBe(before.studyDays)
    expect(after.totalReviews).toBe(before.totalReviews)
  })

  it('reports the gap since the last review', () => {
    const result = rhythm([review('a', 0)], at(12))

    expect(result.daysSinceLast).toBe(12)
  })

  it('reports no gap on a day that has been studied', () => {
    const result = rhythm([review('a', 4, Rating.Good)], at(4, 21))

    expect(result.daysSinceLast).toBe(0)
  })

  it('says nothing rather than zero on an empty journal', () => {
    const result = rhythm([], at(0))

    expect(result.studyDays).toBe(0)
    expect(result.lastStudiedAt).toBeNull()
    expect(result.daysSinceLast).toBeNull()
  })
})

describe('retentionWindows', () => {
  it('returns nothing until a whole window exists', () => {
    expect(retentionWindows(traced(49, () => Rating.Good))).toEqual([])
    expect(retentionWindows(traced(50, () => Rating.Good))).toHaveLength(1)
  })

  it('counts anything but "À revoir" as recalled', () => {
    const grades: ReviewGrade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]
    const [window] = retentionWindows(traced(50, (index) => grades[index % 4]))

    expect(window.reviews).toBe(50)
    // 13 of the 50 land on Again with this rotation.
    expect(window.recalled).toBe(50 - 13)
    expect(window.rate).toBeCloseTo(37 / 50)
  })

  /*
   * Anchored at the most recent review. With 60 reviews the first ten are
   * dropped rather than the last ten: the window a learner is living in is the
   * one that must not be the one discarded.
   */
  it('drops the oldest remainder, never the newest reviews', () => {
    const trace = traced(60, (index) => (index < 10 ? Rating.Again : Rating.Good))
    const [window] = retentionWindows(trace)

    expect(window.reviews).toBe(50)
    expect(window.rate).toBe(1)
    expect(window.to).toEqual(trace[59].reviewedAt)
  })

  it('reads oldest window first when there are several', () => {
    const trace = traced(100, (index) => (index < 50 ? Rating.Again : Rating.Good))
    const windows = retentionWindows(trace)

    expect(windows).toHaveLength(2)
    expect(windows[0].rate).toBe(0)
    expect(windows[1].rate).toBe(1)
  })

  /*
   * Grading a card seen for the first time says nothing about recall. Counting
   * it would push the rate down exactly when someone opens a new deck — the
   * moment they most need encouragement to be honest.
   */
  it('ignores first sightings entirely', () => {
    const trace = [
      ...traced(50, () => Rating.Again, { wasNew: true }),
      ...traced(50, () => Rating.Good),
    ]

    const windows = retentionWindows(trace)
    expect(windows).toHaveLength(1)
    expect(windows[0].rate).toBe(1)
  })
})

describe('gradeBlocks', () => {
  it('says nothing below twenty reviews', () => {
    expect(gradeBlocks(traced(19, () => Rating.Good))).toEqual([])
  })

  it('gives one block until there is enough for two', () => {
    const blocks = gradeBlocks(traced(60, () => Rating.Good))

    expect(blocks).toHaveLength(1)
    expect(blocks[0].total).toBe(60)
  })

  it('compares the first and the last window once both are whole', () => {
    const trace = traced(100, (index) => (index < 50 ? Rating.Again : Rating.Easy))
    const blocks = gradeBlocks(trace)

    expect(blocks).toHaveLength(2)
    expect(blocks[0].counts[Rating.Again]).toBe(50)
    expect(blocks[1].counts[Rating.Easy]).toBe(50)
  })

  it('counts every grade, including the ones that never happened', () => {
    const [block] = gradeBlocks(traced(20, () => Rating.Good))

    expect(block.counts[Rating.Good]).toBe(20)
    expect(block.counts[Rating.Hard]).toBe(0)
  })
})

describe('punctuality', () => {
  it('says nothing below twenty appointments', () => {
    expect(punctuality(traced(19, () => Rating.Good, { dueAt: (index) => at(index) }))).toBeNull()
  })

  it('counts a card reviewed the day it came due as on time', () => {
    // Due at 09:00, reviewed the same day: on time by any human reading.
    const trace = traced(20, () => Rating.Good, { dueAt: (index) => at(index, 6) })
    const result = punctuality(trace)!

    expect(result.due).toBe(20)
    expect(result.onTime).toBe(20)
    expect(result.rate).toBe(1)
    expect(result.medianDelay).toBe(0)
  })

  it('measures lateness in whole days', () => {
    const trace = traced(20, () => Rating.Good, { dueAt: (index) => at(index - 4) })
    const result = punctuality(trace)!

    expect(result.onTime).toBe(0)
    expect(result.medianDelay).toBe(4)
  })

  it('never counts an early review as negative lateness', () => {
    const trace = traced(20, () => Rating.Good, { dueAt: (index) => at(index + 3) })
    const result = punctuality(trace)!

    expect(result.medianDelay).toBe(0)
    expect(result.onTime).toBe(20)
  })

  it('ignores first sightings, which had no appointment to keep', () => {
    const trace = [
      ...traced(20, () => Rating.Good, { wasNew: true }),
      ...traced(20, () => Rating.Good, { dueAt: (index) => at(index - 2) }),
    ]
    const result = punctuality(trace)!

    expect(result.due).toBe(20)
  })
})

/*
 * End to end on a real replay rather than a hand-built trace: the functions
 * above are only as good as what `traceJournal` hands them.
 */
describe('analytics over a real journal', () => {
  it('reads a journal the app could have written', () => {
    const journal: ReviewEvent[] = []
    for (let day = 0; day < 30; day += 1) {
      for (let card = 0; card < 4; card += 1) {
        journal.push(review(`carte-${card}`, day, day % 5 === 0 ? Rating.Again : Rating.Good))
      }
    }

    const trace = traceJournal(journal, scheduler)
    const pace = rhythm(journal, at(30))

    expect(pace.studyDays).toBe(30)
    expect(pace.totalReviews).toBe(120)
    // Four cards seen on day 0, so 116 reviews had a card behind them.
    expect(trace.filter((entry) => entry.wasNew)).toHaveLength(4)
    expect(retentionWindows(trace).length).toBeGreaterThanOrEqual(2)
    expect(gradeBlocks(trace)).toHaveLength(2)
    expect(punctuality(trace)).not.toBeNull()
  })
})
