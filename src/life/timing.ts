/** Milliseconds between generations at 1× playback speed. */
export const BASE_GENERATION_MS = 40

/** Stepped playback factors (0.25× … 2×), like a media rate scrubber. */
export const SPEED_FACTORS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const

export type SpeedFactor = (typeof SPEED_FACTORS)[number]

export const DEFAULT_SPEED_FACTOR: SpeedFactor = 1

/** Wall-clock ms per generation for a playback factor (higher → faster). */
export function generationIntervalMs(factor: number): number {
  return BASE_GENERATION_MS / factor
}

export function formatSpeedFactor(factor: number): string {
  return `${factor.toFixed(2)}×`
}
