import { describe, expect, it } from 'vitest'

import { parseShape, parseShapeRows } from '@/life/shape.ts'

describe('parseShapeRows', () => {
  it('collects live cells from # marks', () => {
    expect([...parseShapeRows(['.#', '##'])].toSorted()).toEqual([
      '0,1',
      '1,0',
      '1,1',
    ])
  })
})

describe('parseShape', () => {
  it('returns dimensions alongside the live set', () => {
    const parsed = parseShape(['.##.', '#..#'])
    expect(parsed.cols).toBe(4)
    expect(parsed.rows).toBe(2)
    expect(parsed.alive.size).toBe(4)
  })
})
