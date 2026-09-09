// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { compiledStylesheet } from '../test/stylesheet'
import { CONTRAST_REQUIREMENTS, contrastRatio, DARK, LIGHT, type Palette } from './tokens'

const PALETTES: Array<[string, Palette]> = [
  ['dark', DARK],
  ['light', LIGHT],
]

/** The custom-property names the palette compiles to, in CSS spelling. */
function customProperties(palette: Palette): Record<string, string> {
  return {
    surface: palette.surface,
    raised: palette.raised,
    text: palette.text,
    muted: palette.muted,
    accent: palette.accent,
    'accent-text': palette.accentText,
    border: palette.border,
    danger: palette.danger,
    ok: palette.ok,
  }
}

const DARK_QUERY = /@media\s*\(\s*prefers-color-scheme:\s*dark\s*\)\s*\{/g
const COLOUR_DECLARATION = /--color-([a-z-]+)\s*:\s*(#[0-9a-f]{3,8})/gi

/**
 * Splits the stylesheet into what applies by default and what applies only in
 * dark mode. Both halves must describe the same colour names, or the interface
 * has a palette in one scheme and holes in the other.
 */
function splitByColourScheme(css: string): { root: string; dark: string } {
  let root = ''
  let dark = ''
  let cursor = 0

  DARK_QUERY.lastIndex = 0
  for (let match = DARK_QUERY.exec(css); match; match = DARK_QUERY.exec(css)) {
    const open = match.index + match[0].length
    const close = closingBrace(css, open)
    root += css.slice(cursor, match.index)
    dark += css.slice(open, close)
    cursor = close + 1
    DARK_QUERY.lastIndex = cursor
  }

  return { root: root + css.slice(cursor), dark }
}

function closingBrace(css: string, from: number): number {
  let depth = 1
  for (let index = from; index < css.length; index += 1) {
    if (css[index] === '{') depth += 1
    else if (css[index] === '}' && (depth -= 1) === 0) return index
  }
  throw new Error('unbalanced braces in the compiled stylesheet')
}

/** Last declaration wins, as it would in the browser. */
function declaredColours(css: string): Record<string, string> {
  const found: Record<string, string> = {}
  for (const [, name, value] of css.matchAll(COLOUR_DECLARATION)) {
    found[name] = expandHex(value)
  }
  return found
}

/** The minifier shortens `#ffffff` to `#fff`; the palette does not. */
function expandHex(hex: string): string {
  const digits = hex.slice(1).toLowerCase()
  if (digits.length !== 3) return `#${digits}`
  return `#${digits.replace(/./g, (digit) => digit + digit)}`
}

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

  it('gives the two schemes a different value for every colour', () => {
    for (const [name, value] of Object.entries(customProperties(LIGHT))) {
      expect(customProperties(DARK)[name], `${name} is identical in both schemes`).not.toBe(value)
    }
  })
})

describe('the compiled stylesheet', () => {
  // These compare the whole set, not just the nine names we expect to find: a
  // tenth `--color-*` in the output means a component reached past the palette,
  // which DESIGN.md does not allow either.
  it('serves the light palette by default', async () => {
    const { root } = splitByColourScheme(await compiledStylesheet())
    expect(declaredColours(root)).toEqual(customProperties(LIGHT))
  })

  it('serves the dark palette behind prefers-color-scheme', async () => {
    const { dark } = splitByColourScheme(await compiledStylesheet())
    expect(declaredColours(dark)).toEqual(customProperties(DARK))
  })
})
