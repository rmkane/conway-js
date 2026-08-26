import { normalizeDegrees } from './math.ts'
import { floor, round, scale, sub, type Point, vec } from './vector.ts'

export type Rotation = 0 | 90 | 180 | 270
export type AnchorMode = 'center' | 'corner'

export type TransformOptions = {
  rotation?: Rotation
  flipX?: boolean
  flipY?: boolean
}

/** Inclusive width×height of a point list (bbox size as `{x:w, y:h}`). */
export function extentOf(points: readonly Point[]): Point {
  let maxX = 0
  let maxY = 0
  for (const p of points) {
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return vec(maxX + 1, maxY + 1)
}

/**
 * Rotate a local point inside a size box by 0/90/180/270° clockwise.
 * Coordinates are relative to the box's top-left (0,0); `size` is `{x:w, y:h}`.
 */
export function rotateInBox(p: Point, size: Point, degrees: number): Point {
  const rot = normalizeDegrees(degrees)
  if (rot === 90) return vec(size.y - 1 - p.y, p.x)
  if (rot === 180) return vec(size.x - 1 - p.x, size.y - 1 - p.y)
  if (rot === 270) return vec(p.y, size.x - 1 - p.x)
  return vec(p.x, p.y)
}

/** Rotate origin-relative points within their bbox. */
export function rotatePoints(
  points: readonly Point[],
  degrees: number,
): Point[] {
  const rot = normalizeDegrees(degrees)
  if (!points.length || rot === 0) {
    return points.map((p) => vec(p.x, p.y))
  }
  const size = extentOf(points)
  return points.map((p) => rotateInBox(p, size, rot))
}

/** Reflect origin-relative points within their bbox. */
export function flipPoints(
  points: readonly Point[],
  flipX = false,
  flipY = false,
): Point[] {
  if (!points.length || (!flipX && !flipY)) {
    return points.map((p) => vec(p.x, p.y))
  }
  const size = extentOf(points)
  return points.map((p) =>
    vec(flipX ? size.x - 1 - p.x : p.x, flipY ? size.y - 1 - p.y : p.y),
  )
}

/** Apply rotation, then flips, to origin-relative points. */
export function transformPoints(
  points: readonly Point[],
  options: TransformOptions = {},
): Point[] {
  const rotated = rotatePoints(points, options.rotation ?? 0)
  return flipPoints(rotated, Boolean(options.flipX), Boolean(options.flipY))
}

/**
 * Map an anchor to the top-left origin of a shape described by points.
 * `corner` places origin at the anchor; `center` centers the bbox on it.
 */
export function anchorToOrigin(
  anchor: Point,
  points: readonly Point[],
  mode: AnchorMode = 'corner',
): Point {
  const at = round(anchor)
  if (!points.length || mode === 'corner') return at

  return sub(at, floor(scale(sub(extentOf(points), vec(1, 1)), 0.5)))
}
