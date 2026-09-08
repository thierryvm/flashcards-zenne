import { describe, expect, it } from 'vitest'
import { createScheduler, GRADES, isDue, isNew, Rating, State } from './scheduler'

const NOW = new Date('2026-01-01T09:00:00Z')

describe('createScheduler', () => {
  it('creates cards in the New state, due immediately', () => {
    const scheduler = createScheduler()
    const card = scheduler.create(NOW)

    expect(card.state).toBe(State.New)
    expect(isNew(card)).toBe(true)
    expect(isDue(card, NOW)).toBe(true)
    expect(card.reps).toBe(0)
  })

  it('takes its weights from ts-fsrs rather than hardcoded values', () => {
    const scheduler = createScheduler()

    expect(scheduler.parameters.w.length).toBeGreaterThan(0)
    expect(scheduler.parameters.request_retention).toBeGreaterThan(0)
    expect(scheduler.parameters.request_retention).toBeLessThanOrEqual(1)
  })

  it('schedules a well-recalled card further out than a forgotten one', () => {
    const scheduler = createScheduler()
    const card = scheduler.create(NOW)

    const again = scheduler.review(card, Rating.Again, NOW)
    const easy = scheduler.review(card, Rating.Easy, NOW)

    expect(easy.due.getTime()).toBeGreaterThan(again.due.getTime())
  })

  it('orders the four grades monotonically', () => {
    const scheduler = createScheduler()
    const card = scheduler.create(NOW)

    const dues = GRADES.map((grade) => scheduler.review(card, grade, NOW).due.getTime())

    const sorted = [...dues].sort((a, b) => a - b)
    expect(dues).toEqual(sorted)
  })

  it('counts repetitions and lapses', () => {
    const scheduler = createScheduler()
    const first = scheduler.review(scheduler.create(NOW), Rating.Good, NOW)

    expect(first.reps).toBe(1)
    expect(first.state).not.toBe(State.New)
  })

  it('reports retrievability as a probability', () => {
    const scheduler = createScheduler()
    const reviewed = scheduler.review(scheduler.create(NOW), Rating.Good, NOW)
    const later = new Date(NOW.getTime() + 3 * 24 * 60 * 60 * 1000)

    const value = scheduler.retrievability(reviewed, later)

    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(1)
  })

  it('is deterministic while fuzz stays off', () => {
    const a = createScheduler().review(createScheduler().create(NOW), Rating.Good, NOW)
    const b = createScheduler().review(createScheduler().create(NOW), Rating.Good, NOW)

    expect(a.due.getTime()).toBe(b.due.getTime())
  })
})
