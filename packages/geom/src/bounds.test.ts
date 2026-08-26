import {
  boundsFrom,
  boundsOf,
  centerOf,
  clampOrigin,
  contains,
  gridBounds,
  MIN_CELL_SIZE,
  overlaps,
  sizeOf,
  vec,
  viewBounds,
  viewCellCounts,
  worldFromCanvas,
  ZERO,
} from '@conway/geom'
import { describe, expect, it } from 'vitest'

describe('bounds helpers', () => {
  const box = boundsFrom(vec(1, 2), vec(4, 6))

  it('tracks size and center', () => {
    expect(sizeOf(box)).toEqual({ x: 4, y: 6 })
    expect(centerOf(box)).toEqual({ x: 3, y: 5 })
  })

  it('uses half-open containment', () => {
    expect(contains(box, vec(1, 2))).toBe(true)
    expect(contains(box, vec(4.9, 7.9))).toBe(true)
    expect(contains(box, vec(5, 2))).toBe(false)
    expect(contains(box, vec(1, 8))).toBe(false)
  })

  it('detects rectangle overlap', () => {
    expect(overlaps(box, boundsFrom(vec(4, 7), vec(2, 2)))).toBe(true)
    expect(overlaps(box, boundsFrom(vec(5, 2), vec(1, 1)))).toBe(false)
  })

  it('builds half-open bounds from inclusive points', () => {
    expect(boundsOf([ZERO, vec(2, 1)])).toEqual({
      min: { x: 0, y: 0 },
      max: { x: 3, y: 2 },
    })
  })

  it('builds grid windows from min + counts', () => {
    expect(gridBounds(vec(-2, -1), 5, 3)).toEqual({
      min: { x: -2, y: -1 },
      max: { x: 3, y: 2 },
      cols: 5,
      rows: 3,
    })
  })
})

describe('viewCellCounts', () => {
  it('matches paint: ceil(size/cell) + 1', () => {
    expect(viewCellCounts(vec(100, 50), 10)).toEqual({ cols: 11, rows: 6 })
    expect(viewCellCounts(vec(101, 50), 10)).toEqual({ cols: 12, rows: 6 })
  })
})

describe('viewBounds', () => {
  it('puts the camera origin at the CSS canvas center', () => {
    expect(viewBounds(ZERO, vec(100, 50), 10)).toEqual({
      min: { x: -5, y: -2.5 },
      max: { x: 6, y: 3.5 },
      cols: 11,
      rows: 6,
    })
  })

  it('shifts with the camera origin', () => {
    expect(viewBounds(vec(10, 20), vec(100, 50), 10)).toEqual({
      min: { x: 5, y: 17.5 },
      max: { x: 16, y: 23.5 },
      cols: 11,
      rows: 6,
    })
  })
})

describe('worldFromCanvas', () => {
  it('is an integer min-zoom window centered on the origin', () => {
    const { cols, rows } = viewCellCounts(vec(100, 50), MIN_CELL_SIZE)
    expect(worldFromCanvas(vec(100, 50))).toEqual({
      min: {
        x: Math.floor(-100 / (2 * MIN_CELL_SIZE)),
        y: Math.floor(-50 / (2 * MIN_CELL_SIZE)),
      },
      max: {
        x: Math.floor(-100 / (2 * MIN_CELL_SIZE)) + cols,
        y: Math.floor(-50 / (2 * MIN_CELL_SIZE)) + rows,
      },
      cols,
      rows,
    })
  })

  it('is larger than a zoomed-in paint window', () => {
    const world = worldFromCanvas(vec(100, 50))
    const paint = viewBounds(ZERO, vec(100, 50), 10)
    expect(world.cols).toBeGreaterThan(paint.cols)
    expect(world.rows).toBeGreaterThan(paint.rows)
  })
})

describe('clampOrigin', () => {
  const world = worldFromCanvas(vec(100, 50))
  const css = vec(100, 50)

  it('leaves a centered camera alone when the view fits', () => {
    expect(clampOrigin(ZERO, world, css, 10)).toEqual({ x: 0, y: 0 })
  })

  it('pulls the camera back when the view would leave the world', () => {
    const clamped = clampOrigin(vec(1000, -1000), world, css, 10)
    const view = viewBounds(clamped, css, 10)
    expect(view.min.x).toBeGreaterThanOrEqual(world.min.x)
    expect(view.min.y).toBeGreaterThanOrEqual(world.min.y)
    expect(view.max.x).toBeLessThanOrEqual(world.max.x)
    expect(view.max.y).toBeLessThanOrEqual(world.max.y)
  })

  it('centers when the view is larger than the world', () => {
    const clamped = clampOrigin(vec(20, 20), world, css, 1)
    expect(clamped.x).toBeCloseTo(centerOf(world).x)
    expect(clamped.y).toBeCloseTo(centerOf(world).y)
  })
})
