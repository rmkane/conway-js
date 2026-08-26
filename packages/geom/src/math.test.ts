import {
  approxEqual,
  clamp,
  lerp,
  mod,
  normalizeDegrees,
  snap,
} from '@conway/geom'
import { describe, expect, it } from 'vitest'

describe('math', () => {
  it('clamps and lerps scalars', () => {
    expect(clamp(5, 0, 3)).toBe(3)
    expect(clamp(-1, 0, 3)).toBe(0)
    expect(lerp(0, 10, 0.25)).toBe(2.5)
  })

  it('normalizes angles and moduli', () => {
    expect(mod(-1, 4)).toBe(3)
    expect(normalizeDegrees(370)).toBe(10)
    expect(normalizeDegrees(-90)).toBe(270)
  })

  it('snaps and compares approximately', () => {
    expect(snap(13, 5)).toBe(15)
    expect(approxEqual(0.1 + 0.2, 0.3)).toBe(true)
  })
})
