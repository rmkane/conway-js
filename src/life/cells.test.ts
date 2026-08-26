import { describe, expect, it } from 'vitest'

import { clipAlive, pack } from '@/life/cells.ts'

describe('clipAlive', () => {
  it('keeps cells inside a half-open window', () => {
    const alive = new Set([pack(0, 0), pack(1, 1), pack(5, 5), pack(-1, 0)])
    const clipped = clipAlive(alive, 0, 0, 5, 5)
    expect(clipped.has(pack(0, 0))).toBe(true)
    expect(clipped.has(pack(1, 1))).toBe(true)
    expect(clipped.has(pack(5, 5))).toBe(false)
    expect(clipped.has(pack(-1, 0))).toBe(false)
  })

  it('returns empty when nothing intersects', () => {
    const alive = new Set([pack(10, 10)])
    expect(clipAlive(alive, 0, 0, 5, 5).size).toBe(0)
  })
})
