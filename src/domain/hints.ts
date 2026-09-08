import type { CardContent, ThemeId } from './types'

/**
 * A hint ladder, from the vaguest nudge to the strongest scaffold.
 *
 * A single cue only helps someone who almost knows the answer. A learner who
 * genuinely does not know needs to be told what *kind* of thing is being asked
 * before a cue means anything, and sometimes needs the shape of the answer to
 * recognise it. Each rung is opened deliberately, so the learner controls how
 * much support they take.
 */
export type HintLevel = 'framing' | 'cue' | 'skeleton'

export const HINT_LEVELS: readonly HintLevel[] = ['framing', 'cue', 'skeleton']

export const HINT_LABELS: Record<HintLevel, string> = {
  framing: 'De quoi parle-t-on ?',
  cue: 'Un indice',
  skeleton: 'La forme de la réponse',
}

/** What the learner is being asked to retrieve, inferred from the answer. */
const FRAMING_BY_THEME: Record<ThemeId, string> = {
  histoire: 'Un fait historique : un événement, une date ou une personne.',
  geographie: 'Un élément de géographie : un lieu, un relief ou une étendue.',
  sciences: 'Une notion scientifique : un phénomène, une grandeur ou une personne.',
  arts: 'Une œuvre ou son auteur.',
  litterature: 'Une œuvre littéraire, son auteur ou un de ses personnages.',
  idees: 'Une idée philosophique ou son auteur.',
  techniques: 'Une technique, une invention ou son principe.',
  institutions: 'Une institution, un texte fondateur ou une règle.',
}

const YEAR = /\b\d{3,4}\b/
const PERSON = /^[A-ZÀ-Ý][\wÀ-ÿ'’-]+ [A-ZÀ-Ý]/u

/**
 * The first rung. Says what sort of answer is expected, which is what an
 * unfamiliar learner is missing before any cue can land.
 */
export function framingFor(card: CardContent): string {
  const base = FRAMING_BY_THEME[card.theme]

  if (YEAR.test(card.answer)) return `${base} La réponse contient une année.`
  if (PERSON.test(card.answer)) return `${base} La réponse est un nom propre.`
  return base
}

/**
 * Small words carry no retrieval load, so revealing them costs nothing and
 * makes the skeleton readable instead of cryptic.
 */
const TRANSPARENT = new Set([
  'a',
  'à',
  'au',
  'aux',
  'ce',
  'de',
  'des',
  'du',
  'en',
  'et',
  'la',
  'le',
  'les',
  'ne',
  'ou',
  'par',
  'pas',
  'pour',
  'se',
  'son',
  'sur',
  'un',
  'une',
])

function maskWord(word: string): string {
  if (word.length === 0) return word
  if (TRANSPARENT.has(word.toLowerCase())) return word
  if (/^\d+$/.test(word)) return '·'.repeat(word.length)

  // Apostrophes and hyphens are structural in French: keeping them visible
  // makes the shape readable instead of cryptic, without revealing a letter.
  const [first, ...rest] = [...word]
  return first + rest.map((character) => (/[''-]/.test(character) ? character : '·')).join('')
}

/**
 * The last rung. Keeps the first letter of each meaningful word and the overall
 * shape, which is often enough to turn "no idea" into recognition — the point
 * being to make retrieval hard but possible, not to hand over the answer.
 */
export function skeletonFor(card: CardContent): string {
  return card.answer.replace(/[\p{L}\p{N}'’-]+/gu, maskWord)
}

export function hintFor(card: CardContent, level: HintLevel): string {
  switch (level) {
    case 'framing':
      return framingFor(card)
    case 'cue':
      return card.hint ?? framingFor(card)
    case 'skeleton':
      return skeletonFor(card)
  }
}

/** Levels worth offering for a card: the cue rung needs an authored hint. */
export function availableHintLevels(card: CardContent): HintLevel[] {
  return HINT_LEVELS.filter((level) => level !== 'cue' || Boolean(card.hint))
}
