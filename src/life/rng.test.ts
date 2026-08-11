import { describe, expect, it } from 'vitest'

import { randomSoup } from '@/life/rng.ts'

describe('randomSoup', () => {
  it('builds the same soup for the same seed key', () => {
    const a = [...randomSoup('abc', { width: 8, height: 6 })].toSorted()
    const b = [...randomSoup('abc', { width: 8, height: 6 })].toSorted()
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
  })
})
