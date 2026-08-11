import { describe, expect, it } from 'vitest'

import { pack, unpack } from '@/life/cells.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import { buildPatternIndex, fingerprint, identifyAt } from '@/life/identify.ts'
import { patternOffsets } from '@/life/pattern.ts'
import { parseShapeRows } from '@/life/shape.ts'

describe('identifyAt', () => {
  const index = buildPatternIndex(LIFE_PATTERNS)

  it('recognizes a glider including after rotation', () => {
    const offsets = patternOffsets(LIFE_PATTERNS.glider.shape, {
      rotation: 90,
    })
    const alive = new Set(offsets.map(([x, y]) => pack(x + 10, y + 20)))
    const first = [...alive][0]
    if (first === undefined) throw new Error('expected a live cell')
    const [x, y] = unpack(first)
    const hit = identifyAt(alive, x, y, index)
    expect(hit?.id).toBe('glider')
    expect(hit?.name).toBe('Glider')
    expect(hit?.cells).toHaveLength(5)
  })

  it('recognizes a block', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.block.shape)
    expect(identifyAt(alive, 0, 0, index)?.id).toBe('block')
  })

  it('returns null for an unknown cluster', () => {
    const alive = new Set([pack(0, 0), pack(1, 0), pack(2, 0), pack(3, 0)])
    expect(identifyAt(alive, 1, 0, index)).toBeNull()
  })

  it('returns null on a dead cell', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.block.shape)
    expect(identifyAt(alive, 5, 5, index)).toBeNull()
  })
})

describe('fingerprint', () => {
  it('is order-independent', () => {
    expect(
      fingerprint([
        [0, 0],
        [1, 0],
      ]),
    ).toBe(
      fingerprint([
        [1, 0],
        [0, 0],
      ]),
    )
  })
})
