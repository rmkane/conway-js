import { add, type Point, type Rotation } from '@conway/geom'

import {
  type AliveSet,
  NEIGHBOR_OFFSETS,
  packPoint,
  unpack,
} from '@/life/cells.ts'
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
export function fingerprint(offsets: readonly Point[]): string {
  return offsets
    .map((p) => `${p.x},${p.y}`)
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

/** 8-connected live component containing `at`, or null if that cell is dead. */
function connectedComponent(alive: AliveSet, at: Point): AliveSet | null {
  const start = packPoint(at)
  if (!alive.has(start)) return null

  const found: AliveSet = new Set([start])
  const queue = [start]
  while (queue.length) {
    const key = queue.pop()!
    const cell = unpack(key)
    for (const d of NEIGHBOR_OFFSETS) {
      const next = packPoint(add(cell, d))
      if (!alive.has(next) || found.has(next)) continue
      found.add(next)
      queue.push(next)
    }
  }
  return found
}

/**
 * If the connected live cluster under `at` matches a catalog seed
 * (any rotation/flip), return that hit. Evolved oscillator/gun phases
 * only match when they still equal a seed geometry.
 */
export function identifyAt(
  alive: AliveSet,
  at: Point,
  index: PatternIndex,
): PatternHit | null {
  const component = connectedComponent(alive, at)
  if (!component?.size) return null

  const hit = index.get(fingerprint(aliveToOffsets(component)))
  if (!hit) return null

  const cells: Point[] = []
  for (const key of component) cells.push(unpack(key))
  return { id: hit.id, name: hit.name, cells }
}

/** Precomputed fingerprints for the built-in catalog. */
export const CATALOG_INDEX: PatternIndex = buildPatternIndex(LIFE_PATTERNS)
