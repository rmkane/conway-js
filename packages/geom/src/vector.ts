/** Immutable 2D point / vector. */
export type Point = { readonly x: number; readonly y: number }

/** Shared (0, 0) — zero displacement / world origin. */
export const ZERO: Point = Object.freeze({ x: 0, y: 0 })

/** Construct a point. */
export function vec(x: number, y: number): Point {
  return { x, y }
}

/** Component-wise copy. */
export function clone(p: Point): Point {
  return { x: p.x, y: p.y }
}

export function equals(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y
}

export function add(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function sub(a: Point, b: Point): Point {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(p: Point, s: number): Point {
  return { x: p.x * s, y: p.y * s }
}

/** Component-wise multiply. */
export function mul(a: Point, b: Point): Point {
  return { x: a.x * b.x, y: a.y * b.y }
}

/** Component-wise divide. */
export function div(a: Point, b: Point): Point {
  return { x: a.x / b.x, y: a.y / b.y }
}

export function neg(p: Point): Point {
  return { x: -p.x, y: -p.y }
}

/** Apply `fn` to each component. */
export function map(p: Point, fn: (n: number) => number): Point {
  return { x: fn(p.x), y: fn(p.y) }
}

export function floor(p: Point): Point {
  return { x: Math.floor(p.x), y: Math.floor(p.y) }
}

export function round(p: Point): Point {
  return { x: Math.round(p.x), y: Math.round(p.y) }
}

export function abs(p: Point): Point {
  return { x: Math.abs(p.x), y: Math.abs(p.y) }
}

export function min(a: Point, b: Point): Point {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) }
}

export function max(a: Point, b: Point): Point {
  return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) }
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  }
}

export function dot(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y
}

export function lengthSq(p: Point): number {
  return p.x * p.x + p.y * p.y
}

export function length(p: Point): number {
  return Math.hypot(p.x, p.y)
}
