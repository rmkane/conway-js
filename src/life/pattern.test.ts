import { describe, expect, it } from 'vitest'

import { patternOffsets } from '@/life/pattern.ts'

describe('patternOffsets', () => {
  it('normalizes seed cells to top-left origin', () => {
    expect(patternOffsets(['.#.', '###'])).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ])
  })

  it('applies rotation before returning offsets', () => {
    expect(patternOffsets(['##', '.#'], { rotation: 90 })).toEqual([
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 },
    ])
  })

  it('applies flips after rotation', () => {
    expect(patternOffsets(['##', '.#'], { flipX: true })).toEqual([
      { x: 1, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ])
  })
})
