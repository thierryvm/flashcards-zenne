import { describe, expect, it } from 'vitest'
import { readSeed, SEED_PARAMETER } from './seed'

describe('readSeed', () => {
  it('returns null when no seed is asked for', () => {
    expect(readSeed('')).toBeNull()
    expect(readSeed('?autre=1')).toBeNull()
  })

  it('reads a seed from the query string', () => {
    expect(readSeed(`?${SEED_PARAMETER}=42`)).toBe(42)
    expect(readSeed(`?a=1&${SEED_PARAMETER}=7&b=2`)).toBe(7)
  })

  it('accepts a leading zero', () => {
    expect(readSeed(`?${SEED_PARAMETER}=007`)).toBe(7)
  })

  it('accepts zero itself', () => {
    expect(readSeed(`?${SEED_PARAMETER}=0`)).toBe(0)
  })

  // Anything that is not a plain non-negative integer is a typo. Falling back
  // to chance is the right behaviour, but the header is what makes it visible:
  // no "graine" line means the parameter was not understood.
  it.each(['', 'abc', '-1', '3.5', '4e2', ' 42', '42abc', '0x2a'])(
    'refuses %o as a seed',
    (value) => {
      expect(readSeed(`?${SEED_PARAMETER}=${encodeURIComponent(value)}`)).toBeNull()
    },
  )

  it('refuses a seed past the safe integer range', () => {
    expect(readSeed(`?${SEED_PARAMETER}=99999999999999999999`)).toBeNull()
  })
})
