import {
  type AliveSet,
  bbox,
  cloneAlive,
  pack,
  parseShapeRows,
  unpack,
} from '@/life.ts'
import type {
  AnchorMode,
  CellCoord,
  Offset,
  PatternTransform,
} from '@/types.ts'

/** Rotate live cells by 0/90/180/270° clockwise around the pattern's top-left bbox. */
export function rotateAlive(alive: AliveSet, degrees: number): AliveSet {
  const rot = ((degrees % 360) + 360) % 360
  if (!alive.size || rot === 0) return cloneAlive(alive)

  const { minX, minY, maxX, maxY } = bbox(alive)
  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const next: AliveSet = new Set()

  for (const key of alive) {
    const [gx, gy] = unpack(key)
    const x = gx - minX
    const y = gy - minY
    let nx: number
    let ny: number
    if (rot === 90) {
      nx = h - 1 - y
      ny = x
    } else if (rot === 180) {
      nx = w - 1 - x
      ny = h - 1 - y
    } else if (rot === 270) {
      nx = y
      ny = w - 1 - x
    } else {
      nx = x
      ny = y
    }
    next.add(pack(minX + nx, minY + ny))
  }

  return next
}

/**
 * Relative cell offsets for a pattern (top-left of bbox at 0,0).
 * Applies rotation, then optional X/Y flips within the bbox.
 */
export function patternOffsets(
  rows: string[],
  options: PatternTransform = {},
): Offset[] {
  const rotation = options.rotation ?? 0
  const flipX = Boolean(options.flipX)
  const flipY = Boolean(options.flipY)

  let cells = rotateAlive(parseShapeRows(rows), rotation)
  if (!cells.size) return []

  if (flipX || flipY) {
    const { minX, minY, maxX, maxY } = bbox(cells)
    const flipped: AliveSet = new Set()
    for (const key of cells) {
      let [x, y] = unpack(key)
      if (flipX) x = maxX + minX - x
      if (flipY) y = maxY + minY - y
      flipped.add(pack(x, y))
    }
    cells = flipped
  }

  const { minX, minY } = bbox(cells)
  const offsets: Offset[] = []
  for (const key of cells) {
    const [cx, cy] = unpack(key)
    offsets.push([cx - minX, cy - minY])
  }
  return offsets
}

/** Convert an anchor cell (cursor / X,Y) into the pattern's top-left origin. */
export function anchorToOrigin(
  anchorX: number,
  anchorY: number,
  offsets: Offset[],
  anchor: AnchorMode = 'corner',
): CellCoord {
  if (!offsets.length || anchor === 'corner') {
    return { x: Math.round(anchorX), y: Math.round(anchorY) }
  }

  let maxDx = 0
  let maxDy = 0
  for (const [dx, dy] of offsets) {
    maxDx = Math.max(maxDx, dx)
    maxDy = Math.max(maxDy, dy)
  }

  return {
    x: Math.round(anchorX) - Math.floor(maxDx / 2),
    y: Math.round(anchorY) - Math.floor(maxDy / 2),
  }
}
