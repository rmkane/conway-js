/** Integer 2D point. */
export type Point = { x: number; y: number }

/** Relative displacement from an origin. */
export type Offset = [number, number]

export type Rotation = 0 | 90 | 180 | 270
export type AnchorMode = 'center' | 'corner'

export type TransformOptions = {
  rotation?: Rotation
  flipX?: boolean
  flipY?: boolean
}

/** Normalize degrees to [0, 360). */
function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

/** Inclusive width/height of an offset list (bbox size). */
export function offsetExtent(offsets: Offset[]): {
  width: number
  height: number
} {
  let maxDx = 0
  let maxDy = 0
  for (const [dx, dy] of offsets) {
    maxDx = Math.max(maxDx, dx)
    maxDy = Math.max(maxDy, dy)
  }
  return { width: maxDx + 1, height: maxDy + 1 }
}

/**
 * Rotate a local point inside a width×height box by 0/90/180/270° clockwise.
 * Coordinates are relative to the box's top-left (0,0).
 */
export function rotateInBox(
  x: number,
  y: number,
  width: number,
  height: number,
  degrees: number,
): Point {
  const rot = normalizeRotation(degrees)
  if (rot === 90) return { x: height - 1 - y, y: x }
  if (rot === 180) return { x: width - 1 - x, y: height - 1 - y }
  if (rot === 270) return { x: y, y: width - 1 - x }
  return { x, y }
}

/** Rotate origin-relative offsets within their bbox. */
export function rotateOffsets(offsets: Offset[], degrees: number): Offset[] {
  const rot = normalizeRotation(degrees)
  if (!offsets.length || rot === 0) {
    return offsets.map(([x, y]) => [x, y])
  }
  const { width, height } = offsetExtent(offsets)
  return offsets.map(([x, y]) => {
    const p = rotateInBox(x, y, width, height, rot)
    return [p.x, p.y]
  })
}

/** Reflect origin-relative offsets within their bbox. */
export function flipOffsets(
  offsets: Offset[],
  flipX = false,
  flipY = false,
): Offset[] {
  if (!offsets.length || (!flipX && !flipY)) {
    return offsets.map(([x, y]) => [x, y])
  }
  const { width, height } = offsetExtent(offsets)
  return offsets.map(([x, y]) => [
    flipX ? width - 1 - x : x,
    flipY ? height - 1 - y : y,
  ])
}

/** Apply rotation, then flips, to origin-relative offsets. */
export function transformOffsets(
  offsets: Offset[],
  options: TransformOptions = {},
): Offset[] {
  const rotated = rotateOffsets(offsets, options.rotation ?? 0)
  return flipOffsets(rotated, Boolean(options.flipX), Boolean(options.flipY))
}

/**
 * Map an anchor point to the top-left origin of a shape described by offsets.
 * `corner` places origin at the anchor; `center` centers the offset bbox on it.
 */
export function anchorToOrigin(
  anchorX: number,
  anchorY: number,
  offsets: Offset[],
  anchor: AnchorMode = 'corner',
): Point {
  const x = Math.round(anchorX)
  const y = Math.round(anchorY)
  if (!offsets.length || anchor === 'corner') return { x, y }

  const { width, height } = offsetExtent(offsets)
  return {
    x: x - Math.floor((width - 1) / 2),
    y: y - Math.floor((height - 1) / 2),
  }
}
