import { CULTURE_GENERALE } from '../content/culture-generale'
import type { CardContent, CardProgress, StudyCard } from '../domain/types'
import type { Scheduler } from '../domain/scheduler'
import { db } from './db'

/**
 * Joins static card content with the scheduling state held in IndexedDB. Cards
 * the learner has never seen get a fresh FSRS state that is not persisted until
 * they are actually reviewed, so an untouched deck leaves no trace.
 */
export async function loadStudyCards(
  scheduler: Scheduler,
  content: readonly CardContent[] = CULTURE_GENERALE,
  now: Date = new Date(),
): Promise<StudyCard[]> {
  const stored = await db.progress.toArray()
  const byId = new Map(stored.map((entry) => [entry.cardId, entry]))

  return content.map((card) => ({
    content: card,
    progress: byId.get(card.id) ?? {
      cardId: card.id,
      fsrs: scheduler.create(now),
      updatedAt: now,
    },
  }))
}

export async function saveProgress(progress: CardProgress): Promise<void> {
  await db.progress.put(progress)
}

/** Wipes local scheduling state. The learner owns their data and can drop it. */
export async function resetProgress(): Promise<void> {
  await db.progress.clear()
}
