import {
  type Offset,
  type TransformOptions,
  transformOffsets,
} from '@conway/geom'

import { type AliveSet, bbox, unpack } from '@/life/cells.ts'
import { parseShapeRows } from '@/life/shape.ts'

/** Normalize live cells to top-left origin offsets. */
export function aliveToOffsets(alive: AliveSet): Offset[] {
  if (!alive.size) return []
  const { minX, minY } = bbox(alive)
  const offsets: Offset[] = []
  for (const key of alive) {
    const [x, y] = unpack(key)
    offsets.push([x - minX, y - minY])
  }
  return offsets
}

/**
 * Relative cell offsets for a pattern (top-left of bbox at 0,0).
 * Applies rotation, then optional X/Y flips within the bbox.
 */
export function patternOffsets(
  rows: string[],
  options: TransformOptions = {},
): Offset[] {
  return transformOffsets(aliveToOffsets(parseShapeRows(rows)), options)
}
