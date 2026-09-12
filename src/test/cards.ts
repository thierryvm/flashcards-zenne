import { createScheduler, Rating } from '../domain/scheduler'
import type { StudyCard, ThemeId } from '../domain/types'

/**
 * Card fixtures shared by the view tests. Two files building their own decks
 * drift apart, and a "reviewed" card that means something different in each is
 * the kind of difference nothing fails on.
 */
export const NOW = new Date('2026-01-01T09:00:00Z')
export const testScheduler = createScheduler()

export function makeCard(id: string, theme: ThemeId = 'histoire'): StudyCard {
  return {
    content: {
      id,
      theme,
      question: `Question ${id} ?`,
      answer: `Réponse ${id}`,
      source: { title: id, url: `https://fr.wikipedia.org/wiki/${id}` },
    },
    progress: { cardId: id, fsrs: testScheduler.create(NOW), updatedAt: NOW },
  }
}

export function reviewed(card: StudyCard): StudyCard {
  return {
    ...card,
    progress: {
      ...card.progress,
      fsrs: testScheduler.review(card.progress.fsrs, Rating.Good, NOW),
    },
  }
}
