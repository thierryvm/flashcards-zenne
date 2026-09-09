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

/**
 * French writes large numbers in space-separated groups of three, so "8 849"
 * and "299 792 458" both contain digit runs that look like years. Removing the
 * grouped numbers first is what stops an altitude being announced as a date.
 */
const GROUPED_NUMBER = /\b\d{1,3}(?: \d{3})+\b/g
const YEAR = /\b\d{3,4}\b/

export function containsYear(answer: string): boolean {
  return YEAR.test(answer.replace(GROUPED_NUMBER, ' '))
}

const LEADING_DETERMINERS = new Set(['ce', 'la', 'le', 'les', 'un', 'une'])
/** Nobiliary and compound particles that stay lowercase inside a name. */
const NAME_PARTICLES = new Set(['d', 'de', 'del', 'della', 'der', 'di', 'du', 'van', 'von'])

const CAPITALISED = /^[A-ZÀ-Ý]/u
const SENTENCE_PUNCTUATION = /[.,;:!?]/

/**
 * True only when the answer *is* a person's name, not merely when it contains
 * capital letters.
 *
 * A looser rule — "capital, space, capital" — flags "Le Sahara", "La guerre de
 * Trente Ans" and "Non. C'est une légende tenace." Precision matters more than
 * recall here: a missed name costs the learner nothing, while a wrong one sends
 * them hunting for the wrong kind of answer, which is worse than no hint at all.
 */
export function looksLikeProperName(answer: string): boolean {
  const trimmed = answer.trim()
  if (SENTENCE_PUNCTUATION.test(trimmed)) return false

  const words = trimmed.split(/\s+/).filter(Boolean)
  const head = words[0]?.toLowerCase()
  const rest = head && LEADING_DETERMINERS.has(head) ? words.slice(1) : words
  if (rest.length < 2) return false

  return rest.every(
    (word) => CAPITALISED.test(word) || NAME_PARTICLES.has(word.toLowerCase().replace(/'$/, '')),
  )
}

export function framingFor(card: CardContent): string {
  const base = FRAMING_BY_THEME[card.theme]

  if (containsYear(card.answer)) return `${base} La réponse contient une année.`
  if (looksLikeProperName(card.answer)) return `${base} La réponse est un nom propre.`
  return base
}

/**
 * Above this share of visible letters the skeleton stops being a hint and
 * starts being the answer: "Le S·····" gives away the Sahara to anyone who has
 * read the question. Below this many letters there is nothing left to hide.
 */
export const MAX_SKELETON_LEAK = 0.2
export const MIN_SKELETON_LENGTH = 8

const ALPHANUMERIC = /[\p{L}\p{N}]/u
const WORD = /[\p{L}\p{N}''-]+/gu

/**
 * Words short enough that their initial *is* most of the word. Revealing them
 * costs more than it helps, so they are masked like everything else.
 */
function maskWord(word: string): string {
  const letters = [...word].filter((character) => ALPHANUMERIC.test(character))
  const structural = (character: string) => /['-]/.test(character)

  // Numbers keep no digit at all: a leading digit narrows a year to a decade.
  // Short words keep none either, since one letter out of two is a giveaway.
  const revealFirst = letters.length >= 3 && !/^\d/.test(word)

  return [...word]
    .map((character, index) => {
      if (structural(character)) return character
      if (index === 0 && revealFirst) return character
      return '·'
    })
    .join('')
}

function leakRatio(answer: string, skeleton: string): number {
  const answerChars = [...answer]
  const skeletonChars = [...skeleton]
  const letters = answerChars.filter((character) => ALPHANUMERIC.test(character))
  if (letters.length === 0) return 0

  const revealed = answerChars.filter(
    (character, index) => ALPHANUMERIC.test(character) && skeletonChars[index] === character,
  )
  return revealed.length / letters.length
}

/**
 * The shape of the answer: initials of the longer words, punctuation kept,
 * everything else hidden.
 *
 * Returns null when no safe skeleton exists — a very short answer, or one whose
 * skeleton would reveal too much. The rung is then simply not offered, which is
 * better than offering help that hands over the answer.
 *
 * What a skeleton does disclose, by construction: the number of words, their
 * lengths, the punctuation and the initials of the longer ones. That is the
 * point of the rung; the guard exists so it stops there.
 */
export function skeletonFor(card: CardContent): string | null {
  const answer = card.answer
  const letters = [...answer].filter((character) => ALPHANUMERIC.test(character))
  if (letters.length < MIN_SKELETON_LENGTH) return null

  const skeleton = answer.replace(WORD, maskWord)
  if (skeleton === answer) return null
  if (leakRatio(answer, skeleton) > MAX_SKELETON_LEAK) return null

  return skeleton
}

/**
 * A spoken description of the skeleton. A screen reader reads "j······" as a
 * letter followed by six middle dots, which is noise; this says the same thing
 * in words.
 *
 * It is derived from the answer rather than parsed back out of the skeleton:
 * middle dots are not word characters, so reading the masked string would find
 * only the few revealed initials and undercount the words.
 */
export function describeSkeleton(card: CardContent): string | null {
  if (skeletonFor(card) === null) return null

  const words = card.answer.match(WORD) ?? []
  const parts = words.map((word) => {
    const masked = maskWord(word)
    const length = [...word].filter((character) => ALPHANUMERIC.test(character)).length
    const size = `${length} lettre${length > 1 ? 's' : ''}`
    const initial = masked[0] !== '·' && ALPHANUMERIC.test(masked[0] ?? '') ? masked[0] : null
    return initial ? `${size}, commence par ${initial}` : size
  })

  return `${words.length} mot${words.length > 1 ? 's' : ''} : ${parts.join(' ; ')}.`
}

export function hintFor(card: CardContent, level: HintLevel): string {
  switch (level) {
    case 'framing':
      return framingFor(card)
    case 'cue':
      return card.hint ?? framingFor(card)
    case 'skeleton':
      return skeletonFor(card) ?? framingFor(card)
  }
}

/**
 * Rungs worth offering for a card. The cue rung needs an authored hint, and the
 * skeleton rung is dropped whenever no safe skeleton can be built.
 */
export function availableHintLevels(card: CardContent): HintLevel[] {
  return HINT_LEVELS.filter((level) => {
    if (level === 'cue') return Boolean(card.hint)
    if (level === 'skeleton') return skeletonFor(card) !== null
    return true
  })
}
