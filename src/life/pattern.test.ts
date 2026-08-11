import { describe, expect, it } from 'vitest'

import { patternOffsets } from '@/life/pattern.ts'

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

  it('applies flips after rotation', () => {
    expect(patternOffsets(['##', '.#'], { flipX: true })).toEqual([
      [1, 0],
      [0, 0],
      [0, 1],
    ])
  })
})
