/**
 * Colour tokens, and the contrast guarantees they must hold.
 *
 * The palette comes from `DESIGN.md`, which has authority over visual choices.
 * These values are mirrored in `src/index.css`. `tokens.test.ts` checks the
 * contrast ratios here and then compiles that stylesheet to confirm both
 * palettes reach the browser intact — one at the root, one behind
 * `prefers-color-scheme: dark`, with nothing extra.
 *
 * It used to check the *source* of `index.css` instead, which is why a light
 * theme that never compiled passed CI for four releases.
 */

export interface Palette {
  /** The page itself. Warm, never pure white: a paper, not a form. */
  paper: string
  /** A surface lifted off the page. Used sparingly — not everything is a card. */
  raised: string
  ink: string
  muted: string
  /**
   * Separators only, and deliberately faint. This is the one token below 3:1,
   * which is fine for a decorative rule and wrong for anything a person can
   * operate: a control boundary uses `accent` or `muted`, never this.
   */
  line: string
  /** The single accent. Main action, links, focus ring. Rare by design. */
  accent: string
  /** Text on an accent fill. */
  accentText: string
  /**
   * The two middle grades, as one hue at decreasing intensity. Precomputed
   * rather than an opacity, so their contrast can be asserted like any other
   * colour.
   */
  gradeHard: string
  gradeGood: string
}

export const LIGHT: Palette = {
  paper: '#fbf9f5',
  raised: '#ffffff',
  ink: '#1a1a17',
  muted: '#6b665c',
  line: '#e2ddd2',
  accent: '#1d5c63',
  accentText: '#ffffff',
  gradeHard: '#97b2b3',
  gradeGood: '#cfdad8',
}

export const DARK: Palette = {
  paper: '#14161a',
  raised: '#1c1f25',
  ink: '#e8e6e1',
  muted: '#9a958a',
  line: '#2c3038',
  accent: '#6fb3ba',
  accentText: '#14161a',
  gradeHard: '#3d5d62',
  gradeGood: '#26353a',
}

/** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const TEXT_CONTRAST = 4.5
export const UI_CONTRAST = 3

type Requirement = { foreground: keyof Palette; background: keyof Palette; minimum: number }

export const CONTRAST_REQUIREMENTS: Requirement[] = [
  { foreground: 'ink', background: 'paper', minimum: TEXT_CONTRAST },
  { foreground: 'ink', background: 'raised', minimum: TEXT_CONTRAST },
  { foreground: 'muted', background: 'paper', minimum: TEXT_CONTRAST },
  { foreground: 'muted', background: 'raised', minimum: TEXT_CONTRAST },
  { foreground: 'accent', background: 'paper', minimum: TEXT_CONTRAST },
  { foreground: 'accent', background: 'raised', minimum: TEXT_CONTRAST },
  { foreground: 'accentText', background: 'accent', minimum: TEXT_CONTRAST },
  // The four grade buttons carry the same label colour across three fills.
  { foreground: 'ink', background: 'gradeHard', minimum: TEXT_CONTRAST },
  { foreground: 'ink', background: 'gradeGood', minimum: TEXT_CONTRAST },
  // Control boundaries, which is what `line` is not allowed to be.
  { foreground: 'accent', background: 'paper', minimum: UI_CONTRAST },
  { foreground: 'muted', background: 'paper', minimum: UI_CONTRAST },
]

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance(hex: string): number {
  const normalised = hex.replace('#', '')
  const r = Number.parseInt(normalised.slice(0, 2), 16)
  const g = Number.parseInt(normalised.slice(2, 4), 16)
  const b = Number.parseInt(normalised.slice(4, 6), 16)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const lighter = Math.max(la, lb)
  const darker = Math.min(la, lb)
  return (lighter + 0.05) / (darker + 0.05)
}
