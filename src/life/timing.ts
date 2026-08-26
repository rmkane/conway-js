/** Milliseconds between generations at 1× on the main simulator. */
export const BASE_GENERATION_MS = 40

/** Milliseconds per gallery generation at 1× (slower so cards stay readable). */
export const BASE_GALLERY_GENERATION_MS = 350

/** Stepped playback factors (0.25× … 2×), like a media rate scrubber. */
const SPEED_FACTORS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

export type SpeedFactor = (typeof SPEED_FACTORS)[number]

const DEFAULT_SPEED_FACTOR: SpeedFactor = 1

/** Wall-clock ms per generation for a playback factor (higher → faster). */
export function generationIntervalMs(
  factor: number,
  baseMs: number = BASE_GENERATION_MS,
): number {
  return baseMs / factor
}

export function formatSpeedFactor(factor: number): string {
  return `${factor.toFixed(2)}×`
}

/** Snap a slider value onto the nearest stepped factor. */
export function snapSpeedFactor(raw: number): SpeedFactor {
  if (!Number.isFinite(raw)) return DEFAULT_SPEED_FACTOR
  let best: SpeedFactor = DEFAULT_SPEED_FACTOR
  let bestDist = Infinity
  for (const factor of SPEED_FACTORS) {
    const dist = Math.abs(factor - raw)
    if (dist < bestDist) {
      best = factor
      bestDist = dist
    }
  }
  return best
}
