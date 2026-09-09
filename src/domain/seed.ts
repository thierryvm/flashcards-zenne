/**
 * A session seed pinned from the address bar: `?graine=42`.
 *
 * Screenshots are how this project checks its own interface, and `buildQueue`
 * is seeded with `Date.now()`, so every capture lands on a different card. Two
 * such captures cannot be compared, which makes "before and after" a matter of
 * opinion again. Pinning the seed is what puts the same card on both sides.
 *
 * This is a tool, not a feature: nothing invites a learner to use it. It is
 * still surfaced when it is on — a screenshot that does not say which seed
 * produced it is only slightly better than a random one, and a mistyped
 * parameter that silently reverted to chance would waste a whole comparison.
 */

export const SEED_PARAMETER = 'graine'

/** Only digits: a negative or fractional seed is a typo, not an intention. */
const DIGITS = /^\d+$/

/**
 * Returns the pinned seed, or null when none was asked for — or when what was
 * asked for is not a seed. Callers fall back to a fresh random session.
 */
export function readSeed(search: string): number | null {
  const raw = new URLSearchParams(search).get(SEED_PARAMETER)
  if (raw === null || !DIGITS.test(raw)) return null

  const seed = Number.parseInt(raw, 10)
  return Number.isSafeInteger(seed) ? seed : null
}
