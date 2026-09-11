import { CULTURE_GENERALE } from '../content/culture-generale'
import type { CardContent, CardProgress, ReviewEvent, StudyCard } from '../domain/types'
import type { Scheduler } from '../domain/scheduler'
import { mergeJournals, replayJournal, reviewKey } from '../domain/journal'
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

/**
 * Records one review: the fact in the journal, the state it produced in
 * `progress`.
 *
 * Both in a single transaction, deliberately. A journal that can silently miss
 * an entry is worse than no journal at all: it would look replayable and
 * rebuild the wrong schedule. Either the review is remembered on both sides or
 * the caller is told it failed.
 */
export async function recordReview(progress: CardProgress, review: ReviewEvent): Promise<void> {
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.reviews.add(review)
    await db.progress.put(progress)
  })
}

/** Every review ever recorded, oldest first. The order is what makes it replayable. */
export async function loadReviews(): Promise<ReviewEvent[]> {
  return db.reviews.orderBy('reviewedAt').toArray()
}

export interface ImportOutcome {
  /** Reviews this device did not already have. */
  added: number
  /** Reviews it holds afterwards. */
  total: number
}

/**
 * Folds reviews from another device into this one.
 *
 * Union and replay, never overwrite. Reviews already held are recognised by
 * `reviewKey` and skipped, so importing the same file twice changes nothing —
 * which is the difference between a merge and a restore.
 *
 * The journal stays append-only: only genuinely new reviews are written. The
 * schedule is then recomputed from the whole journal rather than patched,
 * because a schedule folded from reviews arriving out of order is not the
 * schedule those reviews describe.
 *
 * One limit, and it fades as the journal fills: a card reviewed *before* the
 * journal existed has state but no facts behind it. If the journal also holds
 * later reviews of that card, the replay rebuilds it from those alone, and the
 * earlier history is not accounted for. Cards absent from the journal are left
 * untouched.
 */
export async function importJournal(
  incoming: readonly ReviewEvent[],
  scheduler: Scheduler,
): Promise<ImportOutcome> {
  return db.transaction('rw', db.progress, db.reviews, async () => {
    const kept = await db.reviews.orderBy('reviewedAt').toArray()
    const known = new Set(kept.map(reviewKey))
    const merged = mergeJournals(kept, incoming)
    const fresh = merged.filter((review) => !known.has(reviewKey(review)))

    if (fresh.length > 0) {
      await db.reviews.bulkAdd(fresh)
      await db.progress.bulkPut(replayJournal(merged, scheduler))
    }

    return { added: fresh.length, total: merged.length }
  })
}

/**
 * Wipes local scheduling state. The learner owns their data and can drop it.
 *
 * The journal goes too. Leaving it would mean a "reset" that a later replay
 * could undo, which is not what anyone asking to erase their data means.
 */
export async function resetProgress(): Promise<void> {
  await db.transaction('rw', db.progress, db.reviews, async () => {
    await db.progress.clear()
    await db.reviews.clear()
  })
}
