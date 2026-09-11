import Dexie, { type EntityTable } from 'dexie'
import type { CardProgress, ReviewEvent } from '../domain/types'

/**
 * Everything lives in the browser. v0 has no account, no server and no personal
 * data leaving the device — which is also why it needs no privacy design review
 * to ship. Sync is a later phase with its own decision.
 *
 * Two stores, and the distinction between them is the important part:
 *
 * - `progress` holds one row per card, replaced on every review. It is derived
 *   state: whatever FSRS computed last.
 * - `reviews` is append-only. Nothing in the app updates or deletes a row in
 *   it, apart from the wipe the learner asks for.
 *
 * The journal exists because derived state cannot be merged. Measured on
 * 2026-09-11, before it existed: two real reviews of the same card left exactly
 * one row, `reps` going from 1 to 2, and the first review's time and grade
 * present nowhere. Any device-to-device merge would have had to invent which
 * schedule wins. With the journal there is nothing to invent — the union of two
 * disjoint journals, sorted by time, replays into the right state.
 *
 * Keeping it costs one row per review and commits to nothing: it is a storage
 * decision, not a product one. Not keeping it silently forecloses the option,
 * because only what was written down can be replayed.
 */
class ReperesDatabase extends Dexie {
  progress!: EntityTable<CardProgress, 'cardId'>
  reviews!: EntityTable<ReviewEvent, 'id'>

  constructor() {
    super('reperes')
    this.version(1).stores({ progress: 'cardId, updatedAt' })
    // Existing rows in `progress` are kept as they are. The journal starts
    // empty, so a deck reviewed before this version has state that cannot be
    // rebuilt — that history was never written down.
    this.version(2).stores({
      progress: 'cardId, updatedAt',
      reviews: '++id, cardId, reviewedAt',
    })
  }
}

export const db = new ReperesDatabase()
