import { describe, expect, it } from 'vitest'
import { CULTURE_GENERALE } from './culture-generale'
import { THEMES, type CardContent } from '../domain/types'

describe('culture générale deck', () => {
  it('ships the full sourced deck', () => {
    expect(CULTURE_GENERALE).toHaveLength(48)
  })

  it('gives every card a unique id', () => {
    const ids = CULTURE_GENERALE.map((card) => card.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only uses known themes', () => {
    for (const card of CULTURE_GENERALE) {
      expect(THEMES, `${card.id} has an unknown theme`).toContain(card.theme)
    }
  })

  it('covers every declared theme', () => {
    const used = new Set(CULTURE_GENERALE.map((card) => card.theme))

    expect([...THEMES].filter((theme) => !used.has(theme))).toEqual([])
  })

  /*
   * The type is what stops an unsourced card ever being written, and a compiler
   * rule nothing exercises is a comment. `@ts-expect-error` fails the typecheck
   * if the line below stops being an error, so the attempt that must fail is
   * kept permanently instead of being run once by hand.
   */
  it('refuses at compile time to describe a card without a source', () => {
    // @ts-expect-error `source` is required on CardContent.
    const unsourced: CardContent = {
      id: 'probe',
      theme: 'sciences',
      question: 'Question ?',
      answer: 'Réponse',
    }

    expect(unsourced.source).toBeUndefined()
  })

  // The product rule: no card ships without a reference a learner can open.
  // The type makes it mandatory; this makes it well-formed.
  it('points every card at a resolvable https reference', () => {
    for (const card of CULTURE_GENERALE) {
      expect(card.source.title.trim(), `${card.id} has an empty source title`).not.toBe('')

      const url = new URL(card.source.url)
      expect(url.protocol, `${card.id} does not use https`).toBe('https:')
      expect(url.hostname, `${card.id} points outside Wikipédia`).toBe('fr.wikipedia.org')
      expect(url.pathname, `${card.id} has an empty article path`).not.toBe('/wiki/')
    }
  })

  it('never asks a question without a question mark', () => {
    for (const card of CULTURE_GENERALE) {
      expect(card.question.trim(), `${card.id} is not phrased as a question`).toMatch(/\?$/)
    }
  })

  /*
   * The first sourced import arrived with its apostrophes replaced by spaces
   * ("L ete d une annee"), which reads as broken French in a French-language
   * product. Elided articles and pronouns are never standalone words, so a
   * lone one is a reliable signal that the typography was flattened again.
   */
  it('keeps elisions contracted rather than flattened into spaces', () => {
    const flattened = / (?:[cdjlmnst]|qu) /i

    for (const card of CULTURE_GENERALE) {
      const fields = [card.question, card.answer, card.hint, card.elaboration]
      for (const text of fields) {
        if (!text) continue
        expect(text, `${card.id} looks like it lost an apostrophe: "${text}"`).not.toMatch(
          flattened,
        )
      }
    }
  })
})
