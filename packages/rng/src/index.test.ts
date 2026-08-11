import { hashSeed, mulberry32 } from '@conway/rng'
import { describe, expect, it } from 'vitest'

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
