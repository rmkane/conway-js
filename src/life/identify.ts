import type { Offset, Point, Rotation } from '@conway/geom'

import { type AliveSet, pack, unpack } from '@/life/cells.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import { aliveToOffsets, patternOffsets } from '@/life/pattern.ts'

export type PatternHit = {
  id: string
  name: string
  /** Absolute world cells of the matched connected component. */
  cells: Point[]
}

/** Fingerprint → catalog entry (all rotations / flips of seed shapes). */
export type PatternIndex = Map<string, { id: string; name: string }>

const ROTATIONS: Rotation[] = [0, 90, 180, 270]

/** Stable key for an origin-normalized offset set. */
export function fingerprint(offsets: Offset[]): string {
  return offsets
    .map(([x, y]) => `${x},${y}`)
    .toSorted()
    .join(';')
}

/** Index every rotation/flip of each catalog seed shape. */
export function buildPatternIndex(
  patterns: Record<string, { name: string; shape: string[] }>,
): PatternIndex {
  const index: PatternIndex = new Map()
  for (const [id, pattern] of Object.entries(patterns)) {
    for (const rotation of ROTATIONS) {
      for (const flipX of [false, true]) {
        for (const flipY of [false, true]) {
          const offsets = patternOffsets(pattern.shape, {
            rotation,
            flipX,
            flipY,
          })
          if (!offsets.length) continue
          const key = fingerprint(offsets)
          if (!index.has(key)) index.set(key, { id, name: pattern.name })
        }
      }
    }
  }
  return index
}

/** 8-connected live component containing (x, y), or null if that cell is dead. */
function connectedComponent(
  alive: AliveSet,
  x: number,
  y: number,
): AliveSet | null {
  const start = pack(x, y)
  if (!alive.has(start)) return null

  const found: AliveSet = new Set([start])
  const queue = [start]
  while (queue.length) {
    const key = queue.pop()!
    const [cx, cy] = unpack(key)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const next = pack(cx + dx, cy + dy)
        if (!alive.has(next) || found.has(next)) continue
        found.add(next)
        queue.push(next)
      }
    }
  }
  return found
}

/**
 * If the connected live cluster under (x, y) matches a catalog seed
 * (any rotation/flip), return that hit. Evolved oscillator/gun phases
 * only match when they still equal a seed geometry.
 */
export function identifyAt(
  alive: AliveSet,
  x: number,
  y: number,
  index: PatternIndex,
): PatternHit | null {
  const component = connectedComponent(alive, x, y)
  if (!component?.size) return null

  const hit = index.get(fingerprint(aliveToOffsets(component)))
  if (!hit) return null

  const cells: Point[] = []
  for (const key of component) {
    const [cx, cy] = unpack(key)
    cells.push({ x: cx, y: cy })
  }
  return { id: hit.id, name: hit.name, cells }
}

/** Precomputed fingerprints for the built-in catalog. */
export const CATALOG_INDEX: PatternIndex = buildPatternIndex(LIFE_PATTERNS)
