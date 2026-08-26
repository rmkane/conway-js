import { describe, expect, it } from 'vitest'

import {
  BASE_GENERATION_MS,
  formatSpeedFactor,
  generationIntervalMs,
} from '@/life/timing.ts'

describe('timing', () => {
  it('uses 40ms at 1×', () => {
    expect(BASE_GENERATION_MS).toBe(40)
    expect(generationIntervalMs(1)).toBe(40)
  })

  it('slows down below 1× and speeds up above', () => {
    expect(generationIntervalMs(0.5)).toBe(80)
    expect(generationIntervalMs(2)).toBe(20)
  })

  it('formats factors with two fixed decimals', () => {
    expect(formatSpeedFactor(1)).toBe('1.00×')
    expect(formatSpeedFactor(0.25)).toBe('0.25×')
    expect(formatSpeedFactor(1.5)).toBe('1.50×')
  })
})
