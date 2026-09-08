import type { Card as FsrsCard } from 'ts-fsrs'

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
