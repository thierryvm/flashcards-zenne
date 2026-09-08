import { describe, expect, it } from 'vitest'
import { averageRetention, statsByTheme, upcomingReviews } from './stats'
import { createScheduler, Rating, type ReviewGrade } from './scheduler'
import type { StudyCard, ThemeId } from './types'

const NOW = new Date('2026-01-01T09:00:00Z')
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

  it('keeps each theme in its own row', () => {
    const rows = statsByTheme([makeCard('a', 'arts'), makeCard('b', 'sciences')], NOW)

    expect(rows.map((row) => row.theme).sort()).toEqual(['arts', 'sciences'])
  })
})

describe('upcomingReviews', () => {
  it('returns one bucket per requested day', () => {
    expect(upcomingReviews([], NOW, 7)).toHaveLength(7)
  })

  it('ignores cards that have never been seen', () => {
    const days = upcomingReviews([makeCard('a')], NOW, 7)

    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(0)
  })

  it('places a reviewed card on the day it falls due', () => {
    const card = reviewed(makeCard('a'), Rating.Easy)
    const days = upcomingReviews([card], NOW, 30)

    const scheduled = days.reduce((sum, day) => sum + day.count, 0)
    expect(scheduled).toBe(1)
  })

  it('folds overdue cards into today rather than losing them', () => {
    const card = reviewed(makeCard('a'), Rating.Again)
    const muchLater = new Date(NOW.getTime() + 400 * 86_400_000)

    const days = upcomingReviews([card], muchLater, 7)

    expect(days[0].count).toBe(1)
  })
})

describe('averageRetention', () => {
  it('returns null when nothing has been reviewed', () => {
    expect(averageRetention([makeCard('a')], scheduler, NOW)).toBeNull()
  })

  it('returns a probability once cards have been reviewed', () => {
    const value = averageRetention([reviewed(makeCard('a'))], scheduler, NOW)

    expect(value).toBeGreaterThanOrEqual(0)
    expect(value).toBeLessThanOrEqual(1)
  })

  it('decays as time passes without review', () => {
    const card = reviewed(makeCard('a'))
    const soon = averageRetention([card], scheduler, NOW) ?? 0
    const later =
      averageRetention([card], scheduler, new Date(NOW.getTime() + 60 * 86_400_000)) ?? 0

    expect(later).toBeLessThan(soon)
  })
})
