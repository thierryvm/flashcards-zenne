/**
 * Colour tokens, and the contrast guarantees they must hold.
 *
 * These values are mirrored in `src/index.css`. `tokens.test.ts` checks the
 * contrast ratios here and then compiles that stylesheet to confirm both
 * palettes reach the browser intact — one at the root, one behind
 * `prefers-color-scheme: dark`, with nothing extra.
 *
 * It used to check the *source* of `index.css` instead, which is why a light
 * theme that never compiled passed CI for four releases.
 */

export interface Palette {
  surface: string
  raised: string
  text: string
  muted: string
  accent: string
  accentText: string
  border: string
  danger: string
  ok: string
}

export const DARK: Palette = {
  surface: '#0b0f14',
  raised: '#161f29',
  text: '#e9eff6',
  muted: '#a9bacb',
  accent: '#7fb0ff',
  accentText: '#06203f',
  border: '#6d8296',
  danger: '#ff9d9d',
  ok: '#7ee0a8',
}

export const LIGHT: Palette = {
  surface: '#ffffff',
  raised: '#f2f5f9',
  text: '#111b25',
  muted: '#4c5c6d',
  accent: '#14509e',
  accentText: '#ffffff',
  border: '#6b7b8c',
  danger: '#a3161d',
  ok: '#106c3c',
}

/** WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and UI boundaries. */
export const TEXT_CONTRAST = 4.5
export const UI_CONTRAST = 3

type Requirement = { foreground: keyof Palette; background: keyof Palette; minimum: number }

export const CONTRAST_REQUIREMENTS: Requirement[] = [
  { foreground: 'text', background: 'surface', minimum: TEXT_CONTRAST },
  { foreground: 'text', background: 'raised', minimum: TEXT_CONTRAST },
  { foreground: 'muted', background: 'surface', minimum: TEXT_CONTRAST },
  { foreground: 'muted', background: 'raised', minimum: TEXT_CONTRAST },
  { foreground: 'accent', background: 'surface', minimum: TEXT_CONTRAST },
  { foreground: 'accentText', background: 'accent', minimum: TEXT_CONTRAST },
  { foreground: 'danger', background: 'surface', minimum: TEXT_CONTRAST },
  { foreground: 'ok', background: 'surface', minimum: TEXT_CONTRAST },
  { foreground: 'border', background: 'surface', minimum: UI_CONTRAST },
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
