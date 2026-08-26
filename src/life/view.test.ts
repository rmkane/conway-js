import { describe, expect, it } from 'vitest'

import {
  clampOrigin,
  MIN_CELL_SIZE,
  viewBounds,
  viewCellCounts,
  worldFromCanvas,
} from '@/life/view.ts'

describe('viewCellCounts', () => {
  it('matches paint: ceil(size/cell) + 1', () => {
    expect(viewCellCounts(100, 50, 10)).toEqual({ cols: 11, rows: 6 })
    expect(viewCellCounts(101, 50, 10)).toEqual({ cols: 12, rows: 6 })
  })
})

describe('viewBounds', () => {
  it('puts the camera origin at the CSS canvas center', () => {
    // min = origin - css/(2*cell); world (0,0) → screen (cssW/2, cssH/2)
    expect(viewBounds(0, 0, 100, 50, 10)).toEqual({
      minX: -5,
      minY: -2.5,
      maxX: 6,
      maxY: 3.5,
      cols: 11,
      rows: 6,
    })
  })

  it('shifts with the camera origin', () => {
    const b = viewBounds(10, 20, 100, 50, 10)
    expect(b).toEqual({
      minX: 5,
      minY: 17.5,
      maxX: 16,
      maxY: 23.5,
      cols: 11,
      rows: 6,
    })
  })
})

describe('worldFromCanvas', () => {
  it('is an integer min-zoom window centered on the origin', () => {
    const { cols, rows } = viewCellCounts(100, 50, MIN_CELL_SIZE)
    expect(worldFromCanvas(100, 50)).toEqual({
      minX: Math.floor(-100 / (2 * MIN_CELL_SIZE)),
      minY: Math.floor(-50 / (2 * MIN_CELL_SIZE)),
      maxX: Math.floor(-100 / (2 * MIN_CELL_SIZE)) + cols,
      maxY: Math.floor(-50 / (2 * MIN_CELL_SIZE)) + rows,
      cols,
      rows,
    })
  })

  it('is larger than a zoomed-in paint window', () => {
    const world = worldFromCanvas(100, 50)
    const paint = viewBounds(0, 0, 100, 50, 10)
    expect(world.cols).toBeGreaterThan(paint.cols)
    expect(world.rows).toBeGreaterThan(paint.rows)
  })
})

describe('clampOrigin', () => {
  const world = worldFromCanvas(100, 50)

  it('leaves a centered camera alone when the view fits', () => {
    expect(clampOrigin(0, 0, world, 100, 50, 10)).toEqual({
      originX: 0,
      originY: 0,
    })
  })

  it('pulls the camera back when the view would leave the world', () => {
    const clamped = clampOrigin(1000, -1000, world, 100, 50, 10)
    const view = viewBounds(clamped.originX, clamped.originY, 100, 50, 10)
    expect(view.minX).toBeGreaterThanOrEqual(world.minX)
    expect(view.minY).toBeGreaterThanOrEqual(world.minY)
    expect(view.maxX).toBeLessThanOrEqual(world.maxX)
    expect(view.maxY).toBeLessThanOrEqual(world.maxY)
  })

  it('centers when the view is larger than the world', () => {
    // cellSize 1 → more cells than min-zoom world on this canvas
    const clamped = clampOrigin(20, 20, world, 100, 50, 1)
    expect(clamped.originX).toBeCloseTo((world.minX + world.maxX) / 2)
    expect(clamped.originY).toBeCloseTo((world.minY + world.maxY) / 2)
  })
})
