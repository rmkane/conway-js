import { describe, expect, it } from 'vitest'

import { parseRotation } from '@/app/params.ts'

describe('parseRotation', () => {
  it('keeps ortho angles and falls back to 0', () => {
    expect(parseRotation(0)).toBe(0)
    expect(parseRotation(90)).toBe(90)
    expect(parseRotation(180)).toBe(180)
    expect(parseRotation(270)).toBe(270)
    expect(parseRotation(45)).toBe(0)
    expect(parseRotation(Number.NaN)).toBe(0)
  })
})
