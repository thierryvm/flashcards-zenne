import type { Card as FsrsCard } from 'ts-fsrs'
import type { ReviewGrade } from './scheduler'

export const THEMES = [
  'histoire',
  'geographie',
  'sciences',
  'arts',
  'litterature',
  'idees',
  'techniques',
  'institutions',
] as const

export type ThemeId = (typeof THEMES)[number]

/** Human-readable theme labels. UI copy is French by convention. */
export const THEME_LABELS: Record<ThemeId, string> = {
  histoire: 'Histoire',
  geographie: 'Géographie',
  sciences: 'Sciences',
  arts: 'Arts',
  litterature: 'Littérature',
  idees: 'Idées',
  techniques: 'Techniques',
  institutions: 'Institutions',
}

/**
 * Reference article a learner can open to check the card.
 *
 * A source makes a card *verifiable*, which is not the same as proving it. It
 * is a different order of guarantee from an unchecked claim, not an absolute
 * one.
 */
export interface CardSource {
  title: string
  url: string
}

export interface CardContent {
  id: string
  theme: ThemeId
  question: string
  answer: string
  /**
   * Partial cue shown on demand. It narrows the search space without giving the
   * answer away, so retrieval stays effortful instead of failing outright.
   */
  hint?: string
  /**
   * Context that turns an isolated fact into something meaningful. Shown after
   * the answer to support elaborative interrogation.
   */
  elaboration?: string
  /**
   * Mandatory. The product rule is that no card ships without a reference the
   * learner can open: a spaced-repetition app drills whatever it is given, so
   * an unfalsifiable card is a liability. Making the field required puts that
   * rule in the compiler rather than in a review checklist.
   */
  source: CardSource
}

/**
 * One review, as it happened. Immutable by construction: a fact about the past,
 * never edited and never deleted.
 *
 * This is the only thing worth keeping if the schedule ever has to be rebuilt.
 * `CardProgress` below is *derived* — it is what FSRS computed from the reviews
 * so far, and each new review overwrites it, so the individual reviews are gone
 * the moment they are folded in. Two devices produce two disjoint journals;
 * merging them is the union of the lines, sorted by time, replayed. There is
 * nothing to arbitrate, because chronology decides. Merging two derived states,
 * on the other hand, has no correct answer.
 *
 * `reviewedAt` must be the very instant handed to the scheduler, not a second
 * one taken nearby: a replay that uses a different timestamp computes different
 * intervals and quietly stops reproducing the state it is supposed to rebuild.
 */
export interface ReviewEvent {
  /** Assigned by the database. Absent until the row is written. */
  id?: number
  cardId: string
  reviewedAt: Date
  grade: ReviewGrade
  /**
   * The learner's explanation as it stood at that review, or absent if they had
   * none. Journalled rather than kept only in `CardProgress`, so that replaying
   * rebuilds the whole of it: a note is something a person wrote, and an export
   * that carried the schedule but dropped the words would be a poor bargain.
   */
  note?: string
}

export interface CardProgress {
  cardId: string
  /** Scheduling state owned by ts-fsrs. Never hand-edited. */
  fsrs: FsrsCard
  /** The learner's own answer to "pourquoi ?", kept alongside the card. */
  note?: string
  updatedAt: Date
}

export interface StudyCard {
  content: CardContent
  progress: CardProgress
}
