import { describe, expect, it } from 'vitest'
import { hashFor, readRoute } from './route'

describe('readRoute', () => {
  it('reads the progress page', () => {
    expect(readRoute('#/progression')).toBe('progression')
  })

  it('accepts the same address with or without the trailing slash', () => {
    expect(readRoute('#/progression/')).toBe('progression')
  })

  it('reads an empty hash as home', () => {
    expect(readRoute('')).toBe('accueil')
    expect(readRoute('#')).toBe('accueil')
    expect(readRoute('#/')).toBe('accueil')
  })

  /*
   * A mistyped or stale address lands on the home page rather than an error.
   * There is nothing a learner could do with "page inconnue", and the home page
   * is always a correct answer to "where am I".
   */
  it('falls back to home rather than failing on an unknown address', () => {
    expect(readRoute('#/tableau')).toBe('accueil')
    expect(readRoute('#/progression/2024')).toBe('accueil')
    expect(readRoute('#/../../etc')).toBe('accueil')
  })
})

describe('hashFor', () => {
  it('round-trips every route', () => {
    expect(readRoute(hashFor('accueil'))).toBe('accueil')
    expect(readRoute(hashFor('progression'))).toBe('progression')
  })
})
