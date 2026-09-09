import { describe, expect, it } from 'vitest'
import {
  availableHintLevels,
  containsYear,
  describeSkeleton,
  framingFor,
  hintFor,
  looksLikeProperName,
  MAX_SKELETON_LEAK,
  skeletonFor,
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

const ALPHANUMERIC = /[\p{L}\p{N}]/u

function leakRatio(answer: string, skeleton: string): number {
  const answerChars = [...answer]
  const skeletonChars = [...skeleton]
  const letters = answerChars.filter((character) => ALPHANUMERIC.test(character))
  const revealed = answerChars.filter(
    (character, index) => ALPHANUMERIC.test(character) && skeletonChars[index] === character,
  )
  return letters.length === 0 ? 0 : revealed.length / letters.length
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

describe('skeletonFor', () => {
  it('hides small words instead of handing them over', () => {
    expect(skeletonFor(card({ answer: 'Le Sacre du printemps' }))).toBe('·· S···· ·· p········')
  })

  it('masks digits entirely rather than narrowing a year to its decade', () => {
    expect(skeletonFor(card({ answer: 'Le 10 décembre 1948' }))).toBe('·· ·· d······· ····')
  })

  it('keeps apostrophes and hyphens so the shape stays readable', () => {
    // An elided article and its noun form one token, so the revealed initial is
    // the article's. The aggregate leak ceiling is what keeps that honest.
    expect(skeletonFor(card({ answer: "L'imprimerie à caractères mobiles" }))).toBe(
      "L'·········· · c········· m······",
    )
  })

  it('keeps hyphens visible but hides the second half of a compound', () => {
    expect(skeletonFor(card({ answer: 'La Porte de Saint-Rémy' }))).toBe('·· P···· ·· S····-····')
  })

  it('refuses a skeleton for an answer too short to hide anything', () => {
    expect(skeletonFor(card({ answer: 'Au' }))).toBeNull()
    expect(skeletonFor(card({ answer: 'En 1917' }))).toBeNull()
  })

  /*
   * The previous version exempted small words from masking, so "Au" came back
   * as "Au" and "Le Sahara" as "Le S·····" — the answer, for anyone who had
   * read the question. These two properties are checked across the real deck
   * rather than on one favourable example.
   */
  it('never returns any deck answer unchanged', () => {
    for (const deckCard of CULTURE_GENERALE) {
      const skeleton = skeletonFor(deckCard)
      if (skeleton === null) continue
      expect(skeleton, `${deckCard.id} leaked its answer verbatim`).not.toBe(deckCard.answer)
    }
  })

  it('keeps every deck skeleton under the leak ceiling', () => {
    for (const deckCard of CULTURE_GENERALE) {
      const skeleton = skeletonFor(deckCard)
      if (skeleton === null) continue
      const ratio = leakRatio(deckCard.answer, skeleton)
      expect(
        ratio,
        `${deckCard.id} reveals ${Math.round(ratio * 100)}% of its answer`,
      ).toBeLessThanOrEqual(MAX_SKELETON_LEAK)
    }
  })

  it('never reveals a whole word of any deck answer', () => {
    for (const deckCard of CULTURE_GENERALE) {
      const skeleton = skeletonFor(deckCard)
      if (skeleton === null) continue
      const answerWords = deckCard.answer.match(/[\p{L}\p{N}]{2,}/gu) ?? []
      const skeletonWords = new Set(skeleton.match(/[\p{L}\p{N}]{2,}/gu) ?? [])
      for (const word of answerWords) {
        expect(skeletonWords.has(word), `${deckCard.id} left "${word}" in the clear`).toBe(false)
      }
    }
  })
})

describe('describeSkeleton', () => {
  it('counts every word, including the fully masked ones', () => {
    expect(describeSkeleton(card({ answer: 'Le 14 juillet 1789' }))).toBe(
      '4 mots : 2 lettres ; 2 lettres ; 7 lettres, commence par j ; 4 lettres.',
    )
  })

  it('says nothing when there is no skeleton to describe', () => {
    expect(describeSkeleton(card({ answer: 'Au' }))).toBeNull()
  })

  it('describes every deck card that offers a skeleton', () => {
    for (const deckCard of CULTURE_GENERALE) {
      if (skeletonFor(deckCard) === null) continue
      expect(describeSkeleton(deckCard), `${deckCard.id} has no spoken form`).toMatch(/^\d+ mots?/)
    }
  })
})

describe('availableHintLevels', () => {
  it('offers all three rungs when the card has a cue and a safe skeleton', () => {
    expect(
      availableHintLevels(card({ answer: 'Dmitri Mendeleïev', hint: 'Un chimiste.' })),
    ).toEqual(['framing', 'cue', 'skeleton'])
  })

  it('drops the cue rung when the card has none', () => {
    expect(availableHintLevels(card({ answer: 'Dmitri Mendeleïev' }))).toEqual([
      'framing',
      'skeleton',
    ])
  })

  it('drops the skeleton rung when no safe skeleton exists', () => {
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
