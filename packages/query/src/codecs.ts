/** Parse common query-string boolean encodings. */
export function parseBool(
  value: string | null | undefined,
  fallback: boolean,
): boolean {
  if (value === null || value === undefined || value === '') return fallback
  if (value === '1' || value === 'true' || value === 'on') return true
  if (value === '0' || value === 'false' || value === 'off') return false
  return fallback
}

/** Return `value` when it is one of `allowed`; otherwise `fallback`. */
export function oneOf<T extends string>(
  value: string | null | undefined,
  allowed: readonly T[],
  fallback: T,
): T {
  if (value == null) return fallback
  for (const item of allowed) {
    if (item === value) return item
  }
  return fallback
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Fresh seed for the `seed` query param (UUID when available). */
export function newSeedValue(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return String(Math.floor(Math.random() * 1e15))
}

/** Store colors without `#` so the fragment delimiter cannot truncate the query. */
export function encodeColor(value: string): string {
  return (value || '').replace(/^#/, '').toLowerCase()
}

export function decodeColor(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback
  const hex = value.startsWith('#') ? value : `#${value}`
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback
}
