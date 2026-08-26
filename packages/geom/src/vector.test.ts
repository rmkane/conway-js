import {
  abs,
  add,
  clone,
  div,
  dot,
  equals,
  floor,
  length,
  lengthSq,
  lerpPoint,
  map,
  max,
  min,
  mul,
  neg,
  round,
  scale,
  sub,
  vec,
  ZERO,
} from '@conway/geom'
import { describe, expect, it } from 'vitest'

describe('ZERO', () => {
  it('is the frozen origin point', () => {
    expect(ZERO).toEqual({ x: 0, y: 0 })
    expect(Object.isFrozen(ZERO)).toBe(true)
  })
})

describe('vec', () => {
  it('builds an x/y point', () => {
    expect(vec(1, 2)).toEqual({ x: 1, y: 2 })
  })
})

describe('vector ops', () => {
  const a = vec(3, 4)
  const b = vec(1, -2)

  it('adds, subtracts, scales, multiplies, divides, and negates immutably', () => {
    expect(add(a, b)).toEqual({ x: 4, y: 2 })
    expect(sub(a, b)).toEqual({ x: 2, y: 6 })
    expect(scale(a, 2)).toEqual({ x: 6, y: 8 })
    expect(mul(a, b)).toEqual({ x: 3, y: -8 })
    expect(div(a, vec(2, 2))).toEqual({ x: 1.5, y: 2 })
    expect(neg(b)).toEqual({ x: -1, y: 2 })
    expect(a).toEqual({ x: 3, y: 4 })
  })

  it('maps and rounds components', () => {
    expect(map(vec(1.2, -3.8), Math.trunc)).toEqual({ x: 1, y: -3 })
    expect(floor(vec(1.9, -1.1))).toEqual({ x: 1, y: -2 })
    expect(round(vec(1.5, -1.5))).toEqual({ x: 2, y: -1 })
    expect(abs(vec(-3, 4))).toEqual({ x: 3, y: 4 })
  })

  it('compares, clones, and blends', () => {
    expect(equals(a, vec(3, 4))).toBe(true)
    expect(equals(a, b)).toBe(false)
    const c = clone(a)
    expect(c).toEqual(a)
    expect(c).not.toBe(a)
    expect(lerpPoint(ZERO, vec(10, 20), 0.5)).toEqual({ x: 5, y: 10 })
    expect(min(a, b)).toEqual({ x: 1, y: -2 })
    expect(max(a, b)).toEqual({ x: 3, y: 4 })
  })

  it('computes length and dot', () => {
    expect(dot(a, b)).toBe(-5)
    expect(lengthSq(a)).toBe(25)
    expect(length(a)).toBe(5)
  })
})
