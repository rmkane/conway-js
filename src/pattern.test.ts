import { describe, expect, it } from 'vitest'

import { anchorToOrigin, patternOffsets, rotateAlive } from '@/pattern.ts'

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

describe('patternOffsets', () => {
  it('normalizes seed cells to top-left origin', () => {
    expect(patternOffsets(['.#.', '###'])).toEqual([
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ])
  })

  it('applies rotation before returning offsets', () => {
    expect(patternOffsets(['##', '.#'], { rotation: 90 })).toEqual([
      [1, 0],
      [1, 1],
      [0, 1],
    ])
  })
})

describe('anchorToOrigin', () => {
  it('keeps corner anchors at the cursor cell', () => {
    expect(
      anchorToOrigin(
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
      anchorToOrigin(
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
