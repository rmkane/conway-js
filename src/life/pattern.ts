import {
  type Point,
  type TransformOptions,
  sub,
  transformPoints,
} from '@conway/geom'

import { type AliveSet, bbox, unpack } from '@/life/cells.ts'
import { parseShapeRows } from '@/life/shape.ts'

/** Normalize live cells to top-left origin offsets. */
export function aliveToOffsets(alive: AliveSet): Point[] {
  if (!alive.size) return []
  const origin = bbox(alive).min
  const offsets: Point[] = []
  for (const key of alive) {
    offsets.push(sub(unpack(key), origin))
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
): Point[] {
  return transformPoints(aliveToOffsets(parseShapeRows(rows)), options)
}
