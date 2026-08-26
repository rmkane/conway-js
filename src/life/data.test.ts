import { ZERO } from '@conway/geom'
import { describe, expect, it } from 'vitest'

import { bbox, stepAlive } from '@/life/cells.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import { buildPatternIndex, fingerprint, identifyAt } from '@/life/identify.ts'
import { aliveToOffsets } from '@/life/pattern.ts'
import { parseShapeRows } from '@/life/shape.ts'

describe('LIFE_PATTERNS dynamics', () => {
  for (const [id, pattern] of Object.entries(LIFE_PATTERNS)) {
    if (pattern.category === 'Guns' || pattern.category === 'Spaceships') {
      continue
    }

    it(`${id} returns to its seed within period ${pattern.period}`, () => {
      const seed = fingerprint(aliveToOffsets(parseShapeRows(pattern.shape)))
      let alive = parseShapeRows(pattern.shape)
      for (let i = 0; i < pattern.period; i++) alive = stepAlive(alive)
      expect(fingerprint(aliveToOffsets(alive))).toBe(seed)
    })
  }
})

describe('gosperGliderGun', () => {
  it('emits one glider (5 cells) per period', () => {
    const gun = LIFE_PATTERNS.gosperGliderGun
    let alive = parseShapeRows(gun.shape)
    const seed = alive.size

    for (let i = 0; i < gun.period; i++) alive = stepAlive(alive)

    // Half-open bbox: max.y is one past the last occupied row.
    expect(alive.size).toBe(seed + 5)
    expect(bbox(alive).max.y - 1).toBeGreaterThan(gun.shape.length)
  })
})

describe('new still-life identification', () => {
  const index = buildPatternIndex(LIFE_PATTERNS)

  it('recognizes a ship', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.ship.shape)
    expect(identifyAt(alive, ZERO, index)?.id).toBe('ship')
  })

  it('recognizes eater 1', () => {
    const alive = parseShapeRows(LIFE_PATTERNS.eater1.shape)
    expect(identifyAt(alive, ZERO, index)?.id).toBe('eater1')
  })
})
