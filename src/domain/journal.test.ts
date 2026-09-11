import { describe, expect, it } from 'vitest'
import {
  JOURNAL_FORMAT,
  JOURNAL_VERSION,
  JournalFileError,
  mergeJournals,
  parseJournal,
  replayJournal,
  serialiseJournal,
} from './journal'
import { createScheduler, Rating } from './scheduler'
import type { ReviewEvent } from './types'

const scheduler = createScheduler()
const T0 = new Date('2026-04-01T08:00:00Z')
const minutes = (n: number) => new Date(T0.getTime() + n * 60_000)

function review(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return { cardId: 'carte-a', reviewedAt: minutes(1), grade: Rating.Good, ...overrides }
}

describe('serialiseJournal', () => {
  it('writes the reviews and nothing derived from them', () => {
    const file = JSON.parse(serialiseJournal([review()], T0))

    expect(file.format).toBe(JOURNAL_FORMAT)
    expect(file.version).toBe(JOURNAL_VERSION)
    expect(file.reviews).toEqual([
      { cardId: 'carte-a', reviewedAt: minutes(1).toISOString(), grade: Rating.Good },
    ])
    // A schedule is an opinion about the future; it is recomputed, not carried.
    expect(JSON.stringify(file)).not.toContain('stability')
    expect(JSON.stringify(file)).not.toContain('difficulty')
  })

  it('carries the learner’s own words', () => {
    const file = JSON.parse(serialiseJournal([review({ note: 'Parce que 1789.' })], T0))

    expect(file.reviews[0].note).toBe('Parce que 1789.')
  })

  it('round-trips through the file without changing anything', () => {
    const reviews = [
      review({ reviewedAt: minutes(1), grade: Rating.Again }),
      review({ cardId: 'carte-b', reviewedAt: minutes(9), note: 'Un moyen mnémotechnique.' }),
    ]

    expect(parseJournal(serialiseJournal(reviews, T0))).toEqual(reviews)
  })
})

describe('parseJournal', () => {
  /*
   * Strict on purpose. A file that is almost right would write plausible
   * nonsense into a schedule, and nothing downstream would notice. Every
   * message has to be readable by the person holding the wrong file.
   */
  it.each([
    ['du texte qui n’est pas du JSON', 'pas du tout du json', /n'est pas lisible/],
    ['un JSON qui ne vient pas d’ici', '{"autre":"appli"}', /ne vient pas de Repères/],
    [
      'un format connu mais une version inconnue',
      JSON.stringify({ format: JOURNAL_FORMAT, version: 99, reviews: [] }),
      /autre version/,
    ],
    [
      'un fichier sans révisions',
      JSON.stringify({ format: JOURNAL_FORMAT, version: JOURNAL_VERSION }),
      /incomplet/,
    ],
  ])('refuses %s', (_, text, message) => {
    expect(() => parseJournal(text)).toThrow(JournalFileError)
    expect(() => parseJournal(text)).toThrow(message)
  })

  it.each([
    ['sans carte', { reviewedAt: T0.toISOString(), grade: Rating.Good }, /n'indique pas de carte/],
    ['avec une date invalide', { cardId: 'a', reviewedAt: 'hier', grade: Rating.Good }, /date/],
    ['avec une note inconnue', { cardId: 'a', reviewedAt: T0.toISOString(), grade: 9 }, /note/],
  ])('refuses a review %s, and says which one', (_, entry, message) => {
    const text = JSON.stringify({
      format: JOURNAL_FORMAT,
      version: JOURNAL_VERSION,
      reviews: [entry],
    })

    expect(() => parseJournal(text)).toThrow(message)
    expect(() => parseJournal(text)).toThrow(/révision 1/)
  })
})

describe('mergeJournals', () => {
  it('keeps every review once and sorts by time', () => {
    const a = [review({ reviewedAt: minutes(30) }), review({ reviewedAt: minutes(1) })]
    const b = [review({ reviewedAt: minutes(10) })]

    const merged = mergeJournals(a, b)

    expect(merged.map((entry) => entry.reviewedAt)).toEqual([minutes(1), minutes(10), minutes(30)])
  })

  /*
   * The property that makes this a merge rather than a restore: a file already
   * folded in adds nothing the second time.
   */
  it('is idempotent', () => {
    const journal = [review({ reviewedAt: minutes(1) }), review({ reviewedAt: minutes(5) })]

    const once = mergeJournals(journal, journal)
    const twice = mergeJournals(once, journal)

    expect(once).toHaveLength(2)
    expect(twice).toEqual(once)
  })

  it('does not care which side a review arrives from', () => {
    const a = [review({ reviewedAt: minutes(1) })]
    const b = [review({ reviewedAt: minutes(7), grade: Rating.Again })]

    expect(mergeJournals(a, b)).toEqual(mergeJournals(b, a))
  })

  it('leaves the database row identifiers behind', () => {
    const merged = mergeJournals([{ ...review(), id: 17 }], [])

    expect(merged[0].id).toBeUndefined()
  })

  it('treats two different grades at the same instant as two reviews', () => {
    const merged = mergeJournals(
      [review({ grade: Rating.Good })],
      [review({ grade: Rating.Again })],
    )

    expect(merged).toHaveLength(2)
  })
})

describe('replayJournal', () => {
  it('rebuilds one schedule per card, whatever the number of reviews', () => {
    const progress = replayJournal(
      [
        review({ cardId: 'carte-a', reviewedAt: minutes(1) }),
        review({ cardId: 'carte-b', reviewedAt: minutes(2) }),
        review({ cardId: 'carte-a', reviewedAt: minutes(40) }),
      ],
      scheduler,
    )

    expect(progress.map((entry) => entry.cardId).sort()).toEqual(['carte-a', 'carte-b'])
    expect(progress.find((entry) => entry.cardId === 'carte-a')?.fsrs.reps).toBe(2)
  })

  it('replays in chronological order whatever order it is given', () => {
    const ordered = replayJournal(
      [
        review({ reviewedAt: minutes(1), grade: Rating.Again }),
        review({ reviewedAt: minutes(9), grade: Rating.Good }),
        review({ reviewedAt: minutes(60), grade: Rating.Easy }),
      ],
      scheduler,
    )
    const shuffled = replayJournal(
      [
        review({ reviewedAt: minutes(60), grade: Rating.Easy }),
        review({ reviewedAt: minutes(1), grade: Rating.Again }),
        review({ reviewedAt: minutes(9), grade: Rating.Good }),
      ],
      scheduler,
    )

    expect(shuffled).toEqual(ordered)
  })

  it('restores the note that stood at the last review', () => {
    const [progress] = replayJournal(
      [
        review({ reviewedAt: minutes(1), note: 'Première idée.' }),
        review({ reviewedAt: minutes(9), note: 'Mieux formulé.' }),
      ],
      scheduler,
    )

    expect(progress.note).toBe('Mieux formulé.')
  })

  it('lets a cleared note stay cleared', () => {
    const [progress] = replayJournal(
      [review({ reviewedAt: minutes(1), note: 'À effacer.' }), review({ reviewedAt: minutes(9) })],
      scheduler,
    )

    expect(progress.note).toBeUndefined()
  })

  it('keeps reviews of cards the deck no longer holds', () => {
    // They are facts. `loadStudyCards` ignores progress it cannot join, so a
    // card that comes back brings its history with it.
    const progress = replayJournal([review({ cardId: 'carte-disparue' })], scheduler)

    expect(progress).toHaveLength(1)
  })
})
