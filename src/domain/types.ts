import type { Card as FsrsCard } from 'ts-fsrs'

export const THEMES = [
  'histoire',
  'geographie',
  'sciences',
  'arts',
  'litterature',
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
  institutions: 'Institutions',
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
   * True until a human has checked the fact against a source. Surfaced in the
   * UI: a spaced-repetition app that drills an error engraves it.
   */
  unverified: boolean
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
