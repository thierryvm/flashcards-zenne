import { describe, expect, it } from 'vitest'
import { availableHintLevels, framingFor, hintFor, skeletonFor } from './hints'
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

describe('framingFor', () => {
  it('says what kind of answer is expected', () => {
    expect(framingFor(card({ theme: 'litterature' }))).toContain('littéraire')
  })

  it('flags an answer that contains a year', () => {
    expect(framingFor(card({ answer: 'En 1815, le 18 juin' }))).toContain('année')
  })

  it('flags an answer that is a proper name', () => {
    expect(framingFor(card({ answer: 'Alfred Wegener' }))).toContain('nom propre')
  })

  it('stays generic when the answer has no obvious shape', () => {
    const framing = framingFor(card({ answer: 'une double hélice' }))

    expect(framing).not.toContain('année')
    expect(framing).not.toContain('nom propre')
  })
})

describe('skeletonFor', () => {
  it('keeps the first letter of each meaningful word', () => {
    expect(skeletonFor(card({ answer: 'Alfred Wegener' }))).toBe('A····· W······')
  })

  it('leaves small words visible so the shape stays readable', () => {
    expect(skeletonFor(card({ answer: 'Le Sacre du printemps' }))).toBe('Le S···· du p········')
  })

  it('masks digits entirely rather than half-revealing a number', () => {
    expect(skeletonFor(card({ answer: 'En 1917' }))).toBe('En ····')
  })

  it('preserves punctuation and spacing', () => {
    expect(skeletonFor(card({ answer: "Non. C'est une légende tenace." }))).toBe(
      "N··. C'··· une l······ t·····.",
    )
  })

  it('never returns the answer itself', () => {
    const answer = 'La guerre de Trente Ans'

    expect(skeletonFor(card({ answer }))).not.toBe(answer)
  })

  it('handles accented initials', () => {
    expect(skeletonFor(card({ answer: 'Égypte' }))).toBe('É·····')
  })
})

describe('availableHintLevels', () => {
  it('offers all three rungs when the card has an authored cue', () => {
    expect(availableHintLevels(card({ hint: 'Un chimiste russe.' }))).toEqual([
      'framing',
      'cue',
      'skeleton',
    ])
  })

  it('drops the cue rung when the card has none', () => {
    expect(availableHintLevels(card())).toEqual(['framing', 'skeleton'])
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
