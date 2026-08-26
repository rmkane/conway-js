import {
  add,
  floor,
  max as maxPoint,
  min as minPoint,
  type Point,
  scale,
  sub,
  vec,
  ZERO,
} from './vector.ts'

/**
 * Half-open axis-aligned bounds: `[min, max)`.
 * Prefer this over loose minX/maxX fields so corners stay `Point`s.
 */
export type Bounds = {
  min: Point
  max: Point
}

/** Bounds plus integer cell counts (view / stage windows). */
export type GridBounds = Bounds & {
  cols: number
  rows: number
}

/** Camera / stage cell window (alias of {@link GridBounds}). */
export type ViewBounds = GridBounds

/** Width/height as `{x, y}`. */
export function sizeOf(b: Bounds): Point {
  return sub(b.max, b.min)
}

/** Geometric center of the rectangle. */
export function centerOf(b: Bounds): Point {
  return scale(add(b.min, b.max), 0.5)
}

/** True if `p` lies in the half-open interval `[min, max)`. */
export function contains(b: Bounds, p: Point): boolean {
  return p.x >= b.min.x && p.y >= b.min.y && p.x < b.max.x && p.y < b.max.y
}

/** True if the two half-open rectangles overlap. */
export function overlaps(a: Bounds, b: Bounds): boolean {
  return (
    a.min.x < b.max.x &&
    a.max.x > b.min.x &&
    a.min.y < b.max.y &&
    a.max.y > b.min.y
  )
}

/** Inclusive point cloud → half-open bounds (`max` is one past the last cell). */
export function boundsOf(points: readonly Point[]): Bounds {
  const first = points[0]
  if (!first) return { min: ZERO, max: ZERO }
  let lo = first
  let hi = first
  for (let i = 1; i < points.length; i++) {
    const p = points[i]
    if (!p) continue
    lo = minPoint(lo, p)
    hi = maxPoint(hi, p)
  }
  return { min: lo, max: add(hi, vec(1, 1)) }
}

/** Build bounds from a min corner and size. */
export function boundsFrom(corner: Point, size: Point): Bounds {
  return { min: corner, max: add(corner, size) }
}

/** Grid window: min corner + integer cell counts. */
export function gridBounds(
  corner: Point,
  cols: number,
  rows: number,
): GridBounds {
  return {
    min: corner,
    max: add(corner, vec(cols, rows)),
    cols,
    rows,
  }
}

/**
 * Smallest cell size the life simulator allows (UI zoom floor).
 * The fixed world footprint is canvas coverage at this size.
 */
export const MIN_CELL_SIZE = 2

/** How many world cells fit a CSS canvas at `cellSize` (matches paint). */
export function viewCellCounts(
  cssSize: Point,
  cellSize: number,
): { cols: number; rows: number } {
  return {
    cols: Math.ceil(cssSize.x / cellSize) + 1,
    rows: Math.ceil(cssSize.y / cellSize) + 1,
  }
}

/**
 * World-cell bounds for a view whose origin sits at the CSS canvas center.
 * `min` is continuous so zoom-to-cursor can keep a focus point stable.
 */
export function viewBounds(
  origin: Point,
  cssSize: Point,
  cellSize: number,
): GridBounds {
  const { cols, rows } = viewCellCounts(cssSize, cellSize)
  const half = scale(cssSize, 1 / (2 * cellSize))
  return gridBounds(sub(origin, half), cols, rows)
}

/**
 * Fixed integer stage centered on the world origin at `cellSize`
 * (defaults to {@link MIN_CELL_SIZE}).
 */
export function worldFromCanvas(
  cssSize: Point,
  cellSize: number = MIN_CELL_SIZE,
): GridBounds {
  const { cols, rows } = viewCellCounts(cssSize, cellSize)
  const corner = floor(scale(cssSize, -1 / (2 * cellSize)))
  return gridBounds(corner, cols, rows)
}

/**
 * Keep a camera origin so the zoom window stays over `world`.
 * If the view is larger than the world on an axis, center that axis.
 */
export function clampOrigin(
  origin: Point,
  world: GridBounds,
  cssSize: Point,
  cellSize: number,
): Point {
  const view = viewBounds(origin, cssSize, cellSize)
  const worldSize = sizeOf(world)
  const worldCenter = centerOf(world)

  let x = origin.x
  let y = origin.y

  if (view.cols >= worldSize.x) {
    x = worldCenter.x
  } else if (view.min.x < world.min.x) {
    x += world.min.x - view.min.x
  } else if (view.max.x > world.max.x) {
    x -= view.max.x - world.max.x
  }

  if (view.rows >= worldSize.y) {
    y = worldCenter.y
  } else if (view.min.y < world.min.y) {
    y += world.min.y - view.min.y
  } else if (view.max.y > world.max.y) {
    y -= view.max.y - world.max.y
  }

  return vec(x, y)
}
