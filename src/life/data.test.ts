import { describe, expect, it } from 'vitest'

import { stepAlive, unpack } from '@/life/cells.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import { parseShapeRows } from '@/life/shape.ts'

describe('gosperGliderGun', () => {
  it('emits one glider (5 cells) per period', () => {
    const gun = LIFE_PATTERNS.gosperGliderGun
    let alive = parseShapeRows(gun.shape)
    const seed = alive.size

    for (let i = 0; i < gun.period; i++) alive = stepAlive(alive)

    let maxY = -Infinity
    for (const key of alive) {
      const [, y] = unpack(key)
      maxY = Math.max(maxY, y)
    }

    expect(alive.size).toBe(seed + 5)
    expect(maxY).toBeGreaterThan(gun.shape.length)
  })
})
