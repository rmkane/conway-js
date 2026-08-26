import { floor, scale, vec } from '@conway/geom'
import { hashSeed, mulberry32 } from '@conway/rng'

import { type AliveSet, pack } from '@/life/cells.ts'

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
  const origin = floor(scale(vec(width, height), -0.5))

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (rand() < density) alive.add(pack(origin.x + x, origin.y + y))
    }
  }

  return alive
}
