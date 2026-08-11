import { type AliveSet, pack } from '@/life.ts'

/** FNV-1a → 32-bit seed for the PRNG. */
export function hashSeed(value: string | number): number {
  const str = String(value)
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic [0, 1) generator from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RandomSoupOptions {
  width?: number
  height?: number
  density?: number
}

/** Build a deterministic pseudo-random soup centered near the origin. */
export function randomSoup(
  seedKey: string | number,
  options: RandomSoupOptions = {},
): AliveSet {
  const width = options.width ?? 48
  const height = options.height ?? 32
  const density = options.density ?? 0.22
  const rand = mulberry32(hashSeed(seedKey))
  const alive: AliveSet = new Set()
  const ox = -Math.floor(width / 2)
  const oy = -Math.floor(height / 2)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rand() < density) alive.add(pack(ox + x, oy + y))
    }
  }

  return alive
}
