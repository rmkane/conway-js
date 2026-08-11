import { describe, expect, it } from 'vitest'

import { hashSeed, mulberry32, randomSoup } from '@/rng.ts'

describe('hashSeed', () => {
  it('is deterministic for the same input', () => {
    expect(hashSeed('life')).toBe(hashSeed('life'))
    expect(hashSeed('life')).not.toBe(hashSeed('death'))
  })
})

describe('mulberry32', () => {
  it('returns a stable sequence for a seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('randomSoup', () => {
  it('builds the same soup for the same seed key', () => {
    const a = [...randomSoup('abc', { width: 8, height: 6 })].toSorted()
    const b = [...randomSoup('abc', { width: 8, height: 6 })].toSorted()
    expect(a).toEqual(b)
    expect(a.length).toBeGreaterThan(0)
  })
})
