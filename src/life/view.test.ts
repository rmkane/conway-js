import { describe, expect, it } from 'vitest'

import { MIN_CELL_SIZE, viewBounds, viewCellCounts } from '@/life/view.ts'

describe('viewCellCounts', () => {
  it('matches paint: ceil(size/cell) + 1', () => {
    expect(viewCellCounts(100, 50, 10)).toEqual({ cols: 11, rows: 6 })
    expect(viewCellCounts(101, 50, 10)).toEqual({ cols: 12, rows: 6 })
  })
})

describe('viewBounds', () => {
  it('centers a half-open window on the origin', () => {
    // cols=11, rows=6 → min = floor(origin - count/2)
    // floor(0 - 5.5) = -6, floor(0 - 3) = -3
    expect(viewBounds(0, 0, 100, 50, 10)).toEqual({
      minX: -6,
      minY: -3,
      maxX: 5,
      maxY: 3,
      cols: 11,
      rows: 6,
    })
  })

  it('shifts with the camera origin', () => {
    const b = viewBounds(10, 20, 100, 50, 10)
    expect(b).toEqual({
      minX: 4,
      minY: 17,
      maxX: 15,
      maxY: 23,
      cols: 11,
      rows: 6,
    })
  })

  it('min cell size covers a wider world window than a zoomed-in view', () => {
    const cull = viewBounds(0, 0, 100, 50, MIN_CELL_SIZE)
    const paint = viewBounds(0, 0, 100, 50, 10)
    expect(cull.cols).toBeGreaterThan(paint.cols)
    expect(cull.rows).toBeGreaterThan(paint.rows)
    expect(cull.minX).toBeLessThan(paint.minX)
    expect(cull.maxX).toBeGreaterThan(paint.maxX)
  })
})
