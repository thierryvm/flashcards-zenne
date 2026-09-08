import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card as FsrsCard,
  type FSRSParameters,
} from 'ts-fsrs'

/**
 * The four grades a learner can give. Rating.Manual exists in ts-fsrs but is not
 * a review outcome, so it is deliberately excluded.
 */
export const GRADES = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy] as const
export type ReviewGrade = (typeof GRADES)[number]

/** UI copy. Deliberately describes the learner's experience, not the algorithm. */
export const GRADE_LABELS: Record<ReviewGrade, string> = {
  [Rating.Again]: 'À revoir',
  [Rating.Hard]: 'Difficile',
  [Rating.Good]: 'Correct',
  [Rating.Easy]: 'Facile',
}

/**
 * Fuzz spreads due dates so reviews do not pile up on the same day. It is off in
 * v0 so that scheduling is reproducible and testable; turn it on once there is
 * enough content for pile-ups to be a real problem.
 */
const V0_PARAMETER_OVERRIDES: Partial<FSRSParameters> = { enable_fuzz: false }

/**
 * Weights, retention target and interval caps come from ts-fsrs itself. They are
 * never hardcoded here: the published defaults are the part of FSRS that is
 * fitted to real review data, and a guessed vector would silently degrade every
 * schedule in the app.
 */
export function createScheduler(overrides: Partial<FSRSParameters> = {}) {
  const parameters = generatorParameters({ ...V0_PARAMETER_OVERRIDES, ...overrides })
  const engine = fsrs(parameters)

  return {
    parameters,

    /** Scheduling state for a card that has never been reviewed. */
    create(now: Date = new Date()): FsrsCard {
      return createEmptyCard(now)
    },

    /** Applies a grade and returns the next scheduling state. */
    review(card: FsrsCard, grade: ReviewGrade, now: Date = new Date()): FsrsCard {
      return engine.next(card, now, grade).card
    },

    /** Probability the learner still recalls the card, in [0, 1]. */
    retrievability(card: FsrsCard, now: Date = new Date()): number {
      return engine.get_retrievability(card, now, false)
    },
  }
}

export type Scheduler = ReturnType<typeof createScheduler>

export function isDue(card: FsrsCard, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime()
}

export function isNew(card: FsrsCard): boolean {
  return card.state === State.New
}

export { Rating, State }
export type { FsrsCard }
