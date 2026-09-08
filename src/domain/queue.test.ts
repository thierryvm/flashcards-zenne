import { describe, expect, it } from 'vitest'
import { buildQueue, mulberry32, summarise } from './queue'
import { createScheduler, Rating } from './scheduler'
import type { CardContent, StudyCard, ThemeId } from './types'

const NOW = new Date('2026-01-01T09:00:00Z')
const scheduler = createScheduler()

function makeCard(id: string, theme: ThemeId, overrides: Partial<StudyCard> = {}): StudyCard {
  const content: CardContent = {
    id,
    theme,
    question: `Question ${id}`,
    answer: `Réponse ${id}`,
    unverified: true,
  }
  return {
    content,
    progress: { cardId: id, fsrs: scheduler.create(NOW), updatedAt: NOW },
    ...overrides,
  }
}

describe('mulberry32', () => {
  it('produces the same sequence for the same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)

    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('buildQueue', () => {
  it('returns nothing when no card is due', () => {
    const reviewed = makeCard('a', 'histoire')
    reviewed.progress.fsrs = scheduler.review(reviewed.progress.fsrs, Rating.Easy, NOW)

    expect(buildQueue([reviewed], { now: NOW })).toEqual([])
  })

  it('includes cards that have never been seen', () => {
    const queue = buildQueue([makeCard('a', 'histoire')], { now: NOW })

    expect(queue).toHaveLength(1)
  })

  it('alternates themes instead of grouping them', () => {
    const cards = [
      makeCard('h1', 'histoire'),
      makeCard('h2', 'histoire'),
      makeCard('h3', 'histoire'),
      makeCard('s1', 'sciences'),
      makeCard('s2', 'sciences'),
      makeCard('s3', 'sciences'),
    ]

    const themes = buildQueue(cards, { now: NOW, seed: 7 }).map((card) => card.content.theme)

    expect(themes).toHaveLength(6)
    for (let i = 1; i < themes.length; i++) {
      expect(themes[i]).not.toBe(themes[i - 1])
    }
  })

  it('falls back to the remaining theme once the others run out', () => {
    const cards = [
      makeCard('h1', 'histoire'),
      makeCard('s1', 'sciences'),
      makeCard('s2', 'sciences'),
    ]

    const queue = buildQueue(cards, { now: NOW, seed: 3 })

    expect(queue).toHaveLength(3)
    expect(queue.filter((card) => card.content.theme === 'sciences')).toHaveLength(2)
  })

  it('caps the session at the requested limit', () => {
    const cards = Array.from({ length: 30 }, (_, i) =>
      makeCard(`c${i}`, i % 2 === 0 ? 'histoire' : 'arts'),
    )

    expect(buildQueue(cards, { now: NOW, limit: 8 })).toHaveLength(8)
  })

  it('is reproducible for a given seed', () => {
    const cards = Array.from({ length: 12 }, (_, i) =>
      makeCard(`c${i}`, i % 3 === 0 ? 'histoire' : i % 3 === 1 ? 'arts' : 'sciences'),
    )

    const first = buildQueue(cards, { now: NOW, seed: 99 }).map((c) => c.content.id)
    const second = buildQueue(cards, { now: NOW, seed: 99 }).map((c) => c.content.id)

    expect(first).toEqual(second)
  })
})

describe('summarise', () => {
  it('separates unseen cards from those already reviewed', () => {
    const unseen = makeCard('a', 'histoire')
    const reviewed = makeCard('b', 'arts')
    reviewed.progress.fsrs = scheduler.review(reviewed.progress.fsrs, Rating.Easy, NOW)

    expect(summarise([unseen, reviewed], NOW)).toEqual({
      total: 2,
      dueNow: 0,
      unseen: 1,
      reviewed: 1,
    })
  })
})
