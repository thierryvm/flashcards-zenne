import { describe, expect, it } from 'vitest'
import stylesheet from '../index.css?raw'
import { CONTRAST_REQUIREMENTS, contrastRatio, DARK, LIGHT, type Palette } from './tokens'

const PALETTES: Array<[string, Palette]> = [
  ['dark', DARK],
  ['light', LIGHT],
]

describe('colour tokens', () => {
  for (const [name, palette] of PALETTES) {
    describe(`${name} palette`, () => {
      for (const requirement of CONTRAST_REQUIREMENTS) {
        it(`${requirement.foreground} on ${requirement.background} meets ${requirement.minimum}:1`, () => {
          const ratio = contrastRatio(
            palette[requirement.foreground],
            palette[requirement.background],
          )
          expect(ratio).toBeGreaterThanOrEqual(requirement.minimum)
        })
      }
    })
  }

  it('keeps the stylesheet in step with the palette', () => {
    for (const [, palette] of PALETTES) {
      for (const value of Object.values(palette)) {
        expect(
          stylesheet,
          `${value} is declared in tokens.ts but missing from index.css`,
        ).toContain(value)
      }
    }
  })
})
