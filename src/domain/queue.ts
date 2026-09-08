import type { StudyCard, ThemeId } from './types'
import { isDue, isNew } from './scheduler'

/**
 * Deterministic PRNG. Session order must be reproducible so tests can assert on
 * it and so a reloaded session does not reshuffle under the learner.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export interface QueueOptions {
  now?: Date
  /** Hard stop on session length. Short sessions with a visible end beat open-ended ones. */
  limit?: number
  seed?: number
}

/**
 * Builds a study session from the cards that are actually due.
 *
 * Cards are interleaved across themes rather than grouped by theme: mixing
 * topics within a session is what makes retrieval effortful, which is the whole
 * point of the exercise. Blocked practice feels easier and retains worse.
 */
export function buildQueue(cards: readonly StudyCard[], options: QueueOptions = {}): StudyCard[] {
  const { now = new Date(), limit = 20, seed = 1 } = options
  const random = mulberry32(seed)

  const due = cards.filter((card) => isNew(card.progress.fsrs) || isDue(card.progress.fsrs, now))
  if (due.length === 0) return []

  const byTheme = new Map<ThemeId, StudyCard[]>()
  for (const card of shuffle(due, random)) {
    const bucket = byTheme.get(card.content.theme)
    if (bucket) bucket.push(card)
    else byTheme.set(card.content.theme, [card])
  }

  // Round-robin across themes: consecutive cards come from different themes for
  // as long as more than one theme still has cards left.
  const queue: StudyCard[] = []
  const themes = shuffle([...byTheme.keys()], random)
  let exhausted = false
  while (!exhausted && queue.length < limit) {
    exhausted = true
    for (const theme of themes) {
      const bucket = byTheme.get(theme)
      const next = bucket?.shift()
      if (!next) continue
      exhausted = false
      queue.push(next)
      if (queue.length >= limit) break
    }
  }

  return queue
}

/** Counts used by the progress view. */
export function summarise(cards: readonly StudyCard[], now: Date = new Date()) {
  let dueNow = 0
  let unseen = 0
  for (const card of cards) {
    if (isNew(card.progress.fsrs)) unseen += 1
    else if (isDue(card.progress.fsrs, now)) dueNow += 1
  }
  return { total: cards.length, dueNow, unseen, reviewed: cards.length - unseen }
}
