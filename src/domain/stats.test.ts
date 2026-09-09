import { describe, expect, it } from 'vitest'
import { averageRetention, statsByTheme, upcomingReviews } from './stats'
import { createScheduler, Rating, type ReviewGrade } from './scheduler'
import type { StudyCard, ThemeId } from './types'

const NOW = new Date('2026-01-01T09:00:00Z')
const DAY = 86_400_000
const scheduler = createScheduler()

function makeCard(id: string, theme: ThemeId = 'histoire'): StudyCard {
  return {
    content: {
      id,
      theme,
      question: `Question ${id} ?`,
      answer: `Réponse ${id}`,
      source: { title: id, url: `https://fr.wikipedia.org/wiki/${id}` },
    },
    progress: { cardId: id, fsrs: scheduler.create(NOW), updatedAt: NOW },
  }
}

function reviewed(card: StudyCard, grade: ReviewGrade = Rating.Good, at = NOW): StudyCard {
  return {
    ...card,
    progress: { ...card.progress, fsrs: scheduler.review(card.progress.fsrs, grade, at) },
  }
}

function atMidnight(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

describe('statsByTheme', () => {
  it('omits themes with no cards at all', () => {
    const rows = statsByTheme([makeCard('a', 'arts')], NOW)

    expect(rows).toHaveLength(1)
    expect(rows[0].theme).toBe('arts')
  })

  it('counts unseen cards apart from reviewed ones', () => {
    const rows = statsByTheme([makeCard('a'), reviewed(makeCard('b'))], NOW)

    expect(rows[0]).toMatchObject({ total: 2, unseen: 1 })
  })

  it('splits reviewed cards between learning and mastered', () => {
    const rows = statsByTheme([reviewed(makeCard('a'))], NOW)

    expect(rows[0].learning + rows[0].mastered).toBe(1)
  })

  it('attributes each card to its own theme rather than pooling them', () => {
    const rows = statsByTheme(
      [makeCard('a', 'arts'), makeCard('b', 'arts'), reviewed(makeCard('c', 'sciences'))],
      NOW,
    )

    const arts = rows.find((row) => row.theme === 'arts')
    const sciences = rows.find((row) => row.theme === 'sciences')

    expect(arts).toMatchObject({ total: 2, unseen: 2, learning: 0, mastered: 0 })
    expect(sciences).toMatchObject({ total: 1, unseen: 0 })
  })

  it('counts a card that has come due again', () => {
    const card = reviewed(makeCard('a'), Rating.Again)
    const wellAfterDue = new Date(card.progress.fsrs.due.getTime() + 10 * DAY)

    expect(statsByTheme([card], wellAfterDue)[0].dueNow).toBe(1)
  })
})

describe('upcomingReviews', () => {
  it('returns one bucket per requested day', () => {
    expect(upcomingReviews([], NOW, 7)).toHaveLength(7)
  })

  /*
   * A brand-new deck used to show "48 nouvelles" on the counters and seven
   * empty days underneath, because unseen cards were skipped entirely.
   */
  it('counts never-seen cards as available today', () => {
    const days = upcomingReviews([makeCard('a'), makeCard('b')], NOW, 7)

    expect(days[0].newCards).toBe(2)
    expect(days[0].total).toBe(2)
    expect(days.slice(1).every((day) => day.total === 0)).toBe(true)
  })

  it('places a reviewed card on the exact day its due date falls', () => {
    const card = reviewed(makeCard('a'), Rating.Easy)
    const offset = Math.round(
      (atMidnight(card.progress.fsrs.due).getTime() - atMidnight(NOW).getTime()) / DAY,
    )
    const days = upcomingReviews([card], NOW, offset + 3)

    expect(days[offset].due).toBe(1)
    expect(days.filter((day) => day.due > 0)).toHaveLength(1)
  })

  it('reports overdue cards separately instead of folding them into today', () => {
    const card = reviewed(makeCard('a'), Rating.Again)
    const muchLater = new Date(NOW.getTime() + 400 * DAY)

    const days = upcomingReviews([card], muchLater, 7)

    expect(days[0]).toMatchObject({ overdue: 1, due: 0, total: 1 })
  })

  it('keeps the total equal to the sum of its parts', () => {
    const cards = [makeCard('new'), reviewed(makeCard('a'), Rating.Again)]
    const later = new Date(NOW.getTime() + 400 * DAY)

    for (const day of upcomingReviews(cards, later, 7)) {
      expect(day.total).toBe(day.due + day.overdue + day.newCards)
    }
  })
})

describe('averageRetention', () => {
  it('returns null when nothing has been reviewed', () => {
    expect(averageRetention([makeCard('a')], scheduler, NOW)).toBeNull()
  })

  it('returns a probability once cards have been reviewed', () => {
    const retention = averageRetention([reviewed(makeCard('a'))], scheduler, NOW)

    expect(retention?.mean).toBeGreaterThanOrEqual(0)
    expect(retention?.mean).toBeLessThanOrEqual(1)
  })

  it('carries the sample size, so a percentage is never shown bare', () => {
    const retention = averageRetention(
      [reviewed(makeCard('a')), reviewed(makeCard('b')), makeCard('c')],
      scheduler,
      NOW,
    )

    expect(retention?.sampleSize).toBe(2)
  })

  it('decays as time passes without review', () => {
    const card = reviewed(makeCard('a'))
    const soon = averageRetention([card], scheduler, NOW)?.mean ?? 0
    const later = averageRetention([card], scheduler, new Date(NOW.getTime() + 60 * DAY))?.mean ?? 0

    expect(later).toBeLessThan(soon)
  })
})
