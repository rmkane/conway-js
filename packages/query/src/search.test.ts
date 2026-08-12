import { describe, expect, it } from 'vitest'

import { getBool, getNumber, getOneOf, getString, setBool } from './search.ts'

describe('getString / getNumber / getBool', () => {
  it('reads with fallbacks', () => {
    const params = new URLSearchParams('a=hi&n=12&flag=1')
    expect(getString(params, 'a', 'x')).toBe('hi')
    expect(getString(params, 'missing', 'x')).toBe('x')
    expect(getNumber(params, 'n', 0)).toBe(12)
    expect(getNumber(params, 'bad', 7)).toBe(7)
    expect(getBool(params, 'flag', false)).toBe(true)
    expect(getBool(params, 'missing', true)).toBe(true)
  })
})

describe('getOneOf', () => {
  const modes = ['inspect', 'spawn'] as const

  it('accepts allowed values and falls back otherwise', () => {
    expect(
      getOneOf(new URLSearchParams('mode=spawn'), 'mode', modes, 'inspect'),
    ).toBe('spawn')
    expect(
      getOneOf(new URLSearchParams('mode=nope'), 'mode', modes, 'inspect'),
    ).toBe('inspect')
    expect(getOneOf(new URLSearchParams(), 'mode', modes, 'inspect')).toBe(
      'inspect',
    )
  })
})

describe('setBool', () => {
  it('encodes as 1/0', () => {
    const params = new URLSearchParams()
    setBool(params, 'grid', true)
    setBool(params, 'flip', false)
    expect(params.get('grid')).toBe('1')
    expect(params.get('flip')).toBe('0')
  })
})
