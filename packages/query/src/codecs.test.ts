import { describe, expect, it } from 'vitest'

import { decodeColor, encodeColor, oneOf, parseBool } from './codecs.ts'

describe('parseBool', () => {
  it('parses common truthy/falsey query values', () => {
    expect(parseBool('1', false)).toBe(true)
    expect(parseBool('true', false)).toBe(true)
    expect(parseBool('0', true)).toBe(false)
    expect(parseBool('off', true)).toBe(false)
  })

  it('falls back for missing or unknown values', () => {
    expect(parseBool(null, true)).toBe(true)
    expect(parseBool('', false)).toBe(false)
    expect(parseBool('maybe', true)).toBe(true)
  })
})

describe('oneOf', () => {
  const modes = ['inspect', 'spawn'] as const

  it('keeps allowed values and falls back otherwise', () => {
    expect(oneOf('spawn', modes, 'inspect')).toBe('spawn')
    expect(oneOf('nope', modes, 'inspect')).toBe('inspect')
    expect(oneOf(null, modes, 'inspect')).toBe('inspect')
  })
})

describe('encodeColor / decodeColor', () => {
  it('stores colors without a leading hash', () => {
    expect(encodeColor('#AaBbCc')).toBe('aabbcc')
    expect(encodeColor('112233')).toBe('112233')
  })

  it('accepts hashless or hashed hex and rejects junk', () => {
    expect(decodeColor('aabbcc', '#000000')).toBe('#aabbcc')
    expect(decodeColor('#AABBCC', '#000000')).toBe('#aabbcc')
    expect(decodeColor('red', '#111111')).toBe('#111111')
    expect(decodeColor(null, '#ffffff')).toBe('#ffffff')
  })
})
