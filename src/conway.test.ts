import { describe, expect, it } from 'vitest'

import { Conway, hashSeed, mulberry32, rotateAlive } from '@/conway.ts'

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

describe('rotateAlive', () => {
  it('rotates a pattern 90° clockwise around its bbox', () => {
    const alive = new Set(['0,0', '1,0', '0,1'])
    const rotated = rotateAlive(alive, 90)
    expect([...rotated].toSorted()).toEqual(['0,0', '1,0', '1,1'])
  })

  it('returns a clone for 0°', () => {
    const alive = new Set(['2,3'])
    const rotated = rotateAlive(alive, 0)
    expect(rotated).toEqual(alive)
    expect(rotated).not.toBe(alive)
  })
})

describe('Conway.patternOffsets', () => {
  it('normalizes seed cells to top-left origin', () => {
    const offsets = Conway.patternOffsets(['.#.', '###'])
    expect(offsets).toEqual([
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ])
  })

  it('applies rotation before returning offsets', () => {
    const offsets = Conway.patternOffsets(['##', '.#'], { rotation: 90 })
    expect(offsets).toEqual([
      [1, 0],
      [1, 1],
      [0, 1],
    ])
  })
})

describe('Conway.anchorToOrigin', () => {
  it('keeps corner anchors at the cursor cell', () => {
    expect(
      Conway.anchorToOrigin(
        5,
        7,
        [
          [0, 0],
          [2, 2],
        ],
        'corner',
      ),
    ).toEqual({ x: 5, y: 7 })
  })

  it('centers the pattern bbox on the cursor', () => {
    expect(
      Conway.anchorToOrigin(
        5,
        7,
        [
          [0, 0],
          [2, 2],
        ],
        'center',
      ),
    ).toEqual({ x: 4, y: 6 })
  })
})
