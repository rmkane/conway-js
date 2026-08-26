import {
  add,
  type Bounds,
  boundsOf,
  contains,
  floor,
  type Point,
  scale,
  sizeOf,
  sub,
  vec,
  ZERO,
} from '@conway/geom'

/** Shared B3/S23 set helpers used by the canvas engine and gallery. */

export type CellKey = string
export type AliveSet = Set<CellKey>

/** 8-neighbor offsets (no center). */
export const NEIGHBOR_OFFSETS: readonly Point[] = [
  vec(-1, -1),
  vec(0, -1),
  vec(1, -1),
  vec(-1, 0),
  vec(1, 0),
  vec(-1, 1),
  vec(0, 1),
  vec(1, 1),
]

export function pack(x: number, y: number): CellKey {
  return `${x},${y}`
}

export function packPoint(p: Point): CellKey {
  return pack(p.x, p.y)
}

export function unpack(key: CellKey): Point {
  const i = key.indexOf(',')
  return vec(Number(key.slice(0, i)), Number(key.slice(i + 1)))
}

export function cloneAlive(alive: AliveSet): AliveSet {
  return new Set(alive)
}

function tallyNeighbors(counts: Map<CellKey, number>, cell: Point): void {
  for (const d of NEIGHBOR_OFFSETS) {
    const k = packPoint(add(cell, d))
    counts.set(k, (counts.get(k) || 0) + 1)
  }
}

export function stepAlive(alive: AliveSet): AliveSet {
  const counts = new Map<CellKey, number>()
  for (const key of alive) {
    tallyNeighbors(counts, unpack(key))
  }

  const next: AliveSet = new Set()
  for (const [key, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(key))) next.add(key)
  }
  return next
}

/**
 * Keep only cells inside half-open `bounds`.
 * Used to drop patterns that have left the visible board.
 */
export function clipAlive(alive: AliveSet, bounds: Bounds): AliveSet {
  const next: AliveSet = new Set()
  for (const key of alive) {
    if (contains(bounds, unpack(key))) next.add(key)
  }
  return next
}

/** Half-open bbox of live cells (`max` is one past the last occupied cell). */
export function bbox(alive: AliveSet): Bounds {
  if (!alive.size) return { min: ZERO, max: ZERO }
  const points: Point[] = []
  for (const key of alive) points.push(unpack(key))
  return boundsOf(points)
}

export function shiftAlive(alive: AliveSet, delta: Point): AliveSet {
  if (delta.x === 0 && delta.y === 0) return alive
  const next: AliveSet = new Set()
  for (const key of alive) {
    next.add(packPoint(add(unpack(key), delta)))
  }
  return next
}

/** Translate `alive` so its bbox is centered in a cols×rows board. */
export function homeAlive(
  alive: AliveSet,
  cols: number,
  rows: number,
): AliveSet {
  if (!alive.size) return alive
  const box = bbox(alive)
  const target = floor(scale(sub(vec(cols, rows), sizeOf(box)), 0.5))
  return shiftAlive(alive, sub(target, box.min))
}
