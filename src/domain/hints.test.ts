import { describe, expect, it } from 'vitest'
import {
  availableHintLevels,
  containsYear,
  framingFor,
  hintFor,
  looksLikeProperName,
  MAX_SHAPE_LEAK,
  shapeFor,
  shapeLeak,
} from './hints'
import { CULTURE_GENERALE } from '../content/culture-generale'
import type { CardContent } from './types'

function card(overrides: Partial<CardContent> = {}): CardContent {
  return {
    id: 'test',
    theme: 'sciences',
    question: 'Question ?',
    answer: 'Réponse',
    source: { title: 'Article', url: 'https://fr.wikipedia.org/wiki/Article' },
    ...overrides,
  }
}

describe('containsYear', () => {
  it.each(['Le 14 juillet 1789', 'En 1917', 'Le 10 décembre 1948, à Paris'])(
    'recognises a year in %j',
    (answer) => {
      expect(containsYear(answer)).toBe(true)
    },
  )

  // French groups large numbers in threes, so a naive \d{3,4} match turned an
  // altitude and a speed into dates.
  it.each([
    'Environ 8 849 mètres',
    '299 792 458 mètres par seconde, exactement',
    'Plus de 1 600 mètres de profondeur',
    'Son point le plus bas approche les 11 000 mètres',
  ])('does not mistake the grouped number in %j for a year', (answer) => {
    expect(containsYear(answer)).toBe(false)
  })
})

describe('looksLikeProperName', () => {
  it.each([
    'Dmitri Mendeleïev',
    'Alfred Wegener',
    'Vincent van Gogh',
    'Miguel de Cervantès',
    'René Descartes',
  ])('recognises %j as a name', (answer) => {
    expect(looksLikeProperName(answer)).toBe(true)
  })

  // Every one of these was flagged as a person by an earlier, looser rule.
  it.each([
    'Le Sahara',
    'Le Sacre du printemps',
    'La Communauté économique européenne',
    'La guerre de Trente Ans',
    "Non. C'est une légende tenace.",
    'Le lac Baïkal, en Sibérie',
  ])('does not mistake %j for a name', (answer) => {
    expect(looksLikeProperName(answer)).toBe(false)
  })
})

describe('framingFor', () => {
  it('says what kind of answer is expected', () => {
    expect(framingFor(card({ theme: 'litterature' }))).toContain('littéraire')
  })

  it('stays generic when the answer has no obvious shape', () => {
    const framing = framingFor(card({ answer: 'une double hélice' }))

    expect(framing).not.toContain('année')
    expect(framing).not.toContain('nom propre')
  })

  it('never claims a year for any answer in the deck that has none', () => {
    for (const deckCard of CULTURE_GENERALE) {
      if (!framingFor(deckCard).includes('année')) continue
      expect(deckCard.answer, `${deckCard.id} announced a year`).toMatch(
        /\b(6\d{2}|1\d{3}|20\d{2})\b/,
      )
    }
  })
})

/*
 * This rung used to render a masked string — "L'·········· ·" — in a monospace
 * face. It read as a broken field rather than a hint, so it now says the same
 * thing in words, which is what a screen reader was already getting. The
 * disclosure is unchanged, and so is the ceiling on it.
 */
describe('shapeFor', () => {
  it('counts every word, including the fully hidden ones', () => {
    expect(shapeFor(card({ answer: 'Le 14 juillet 1789' }))).toBe(
      '4 mots : 2 lettres, 2 lettres, 7 lettres commençant par j, 4 lettres.',
    )
  })

  it('hides small words instead of handing them over', () => {
    expect(shapeFor(card({ answer: 'Le Sacre du printemps' }))).toBe(
      '4 mots : 2 lettres, 5 lettres commençant par S, 2 lettres, 9 lettres commençant par p.',
    )
  })

  it('never gives a digit away, which would narrow a year to its decade', () => {
    const shape = shapeFor(card({ answer: 'Le 10 décembre 1948' }))

    expect(shape).not.toMatch(/commençant par \d/)
  })

  it('speaks of a single word in the singular', () => {
    expect(shapeFor(card({ answer: 'photosynthèse' }))).toBe(
      'Un seul mot : 13 lettres commençant par p.',
    )
  })

  it('refuses a shape for an answer too short to hide anything', () => {
    expect(shapeFor(card({ answer: 'Au' }))).toBeNull()
    expect(shapeFor(card({ answer: 'En 1917' }))).toBeNull()
  })

  /*
   * An earlier version exempted small words from masking, so "Au" came back as
   * "Au" and "Le Sahara" as "Le S·····" — the answer, for anyone who had read
   * the question. These properties are checked across the real deck rather than
   * on one favourable example.
   */
  it('keeps every deck card under the leak ceiling', () => {
    for (const deckCard of CULTURE_GENERALE) {
      if (shapeFor(deckCard) === null) continue
      const leak = shapeLeak(deckCard.answer) ?? 0
      expect(
        leak,
        `${deckCard.id} reveals ${Math.round(leak * 100)}% of its answer`,
      ).toBeLessThanOrEqual(MAX_SHAPE_LEAK)
    }
  })

  /*
   * An initial is half of a two-letter word and all of a one-letter word, which
   * is how "Au" once came back as "Au". Asserting on the prose is what proves
   * the rule survived the rewrite; comparing whole words would not, since the
   * sentence legitimately contains French vocabulary of its own.
   */
  it('never announces an initial for a word too short to spare one', () => {
    for (const deckCard of CULTURE_GENERALE) {
      const shape = shapeFor(deckCard)
      if (shape === null) continue
      expect(shape, `${deckCard.id} gave away a short word`).not.toMatch(
        /\b[12] lettres? commençant/,
      )
    }
  })

  it('describes every deck card that offers the rung', () => {
    for (const deckCard of CULTURE_GENERALE) {
      if (!availableHintLevels(deckCard).includes('shape')) continue
      expect(shapeFor(deckCard), `${deckCard.id} has no shape`).toMatch(/^(\d+ mots|Un seul mot)/)
    }
  })
})

describe('availableHintLevels', () => {
  it('offers all three rungs when the card has a cue and a safe shape', () => {
    expect(
      availableHintLevels(card({ answer: 'Dmitri Mendeleïev', hint: 'Un chimiste.' })),
    ).toEqual(['framing', 'cue', 'shape'])
  })

  it('drops the cue rung when the card has none', () => {
    expect(availableHintLevels(card({ answer: 'Dmitri Mendeleïev' }))).toEqual(['framing', 'shape'])
  })

  it('drops the shape rung when no safe shape exists', () => {
    expect(availableHintLevels(card({ answer: 'Au', hint: 'Du latin.' }))).toEqual([
      'framing',
      'cue',
    ])
  })

  it('always leaves at least the framing rung', () => {
    for (const deckCard of CULTURE_GENERALE) {
      expect(availableHintLevels(deckCard)).toContain('framing')
    }
  })
})

describe('hintFor', () => {
  it('returns the authored cue for the middle rung', () => {
    expect(hintFor(card({ hint: 'Un chimiste russe.' }), 'cue')).toBe('Un chimiste russe.')
  })

  it('falls back to framing when a cue is missing', () => {
    expect(hintFor(card(), 'cue')).toBe(framingFor(card()))
  })
})
