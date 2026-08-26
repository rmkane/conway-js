/** Clamp `n` into `[min, max]`. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Linear interpolate from `a` to `b` by `t`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Euclidean remainder in `[0, m)`. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m
}

/** Map degrees into `[0, 360)`. */
export function normalizeDegrees(degrees: number): number {
  return mod(degrees, 360)
}

/** True when `|a - b| <= epsilon`. */
export function approxEqual(a: number, b: number, epsilon = 1e-9): boolean {
  return Math.abs(a - b) <= epsilon
}

/** Snap `n` to the nearest multiple of `step`. */
export function snap(n: number, step: number): number {
  if (step === 0) return n
  return Math.round(n / step) * step
}
