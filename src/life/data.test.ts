import { describe, expect, it } from 'vitest'

import { type AliveSet, stepAlive, unpack } from '@/life/cells.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import { buildPatternIndex, identifyAt } from '@/life/identify.ts'
import { parseShapeRows } from '@/life/shape.ts'

function fingerprint(alive: AliveSet): string {
  return [...alive]
    .map((k) => unpack(k).join(','))
    .toSorted()
    .join(';')
}

describe('LIFE_PATTERNS dynamics', () => {
  for (const [id, pattern] of Object.entries(LIFE_PATTERNS)) {
    if (pattern.category === 'Guns' || pattern.category === 'Spaceships') {
      continue
    }

    it(`${id} returns to its seed within period ${pattern.period}`, () => {
      const seed = fingerprint(parseShapeRows(pattern.shape))
      let alive = parseShapeRows(pattern.shape)
      for (let i = 0; i < pattern.period; i++) alive = stepAlive(alive)
      expect(fingerprint(alive)).toBe(seed)
    })
  }
})

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

describe('new still-life identification', () => {
  const index = buildPatternIndex(LIFE_PATTERNS)

  it('recognizes a ship', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.ship.shape)
    expect(identifyAt(alive, 0, 0, index)?.id).toBe('ship')
  })

  it('recognizes eater 1', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.eater1.shape)
    expect(identifyAt(alive, 0, 0, index)?.id).toBe('eater1')
  })
})
