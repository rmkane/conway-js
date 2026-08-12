import { oneOf, parseBool } from './codecs.ts'

/** Current page query string as `URLSearchParams`. */
export function currentSearchParams(search = location.search): URLSearchParams {
  return new URLSearchParams(search)
}

/**
 * Replace the URL search string via `history.replaceState`.
 * Returns the `?...` suffix that was written.
 */
export function replaceSearch(
  params: URLSearchParams,
  pathname = location.pathname,
): string {
  const search = `?${params.toString()}`
  history.replaceState(null, '', `${pathname}${search}`)
  return search
}

export function getString(
  params: URLSearchParams,
  key: string,
  fallback: string,
): string {
  return params.get(key) || fallback
}

export function getNumber(
  params: URLSearchParams,
  key: string,
  fallback: number,
): number {
  const raw = params.get(key)
  if (raw == null || raw === '') return fallback
  const n = Number(raw)
  return Number.isFinite(n) ? n : fallback
}

export function getBool(
  params: URLSearchParams,
  key: string,
  fallback: boolean,
): boolean {
  return parseBool(params.get(key), fallback)
}

/** Read a string only if it is one of `allowed`; otherwise `fallback`. */
export function getOneOf<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
  fallback: T,
): T {
  return oneOf(params.get(key), allowed, fallback)
}

/** Write a flag as `1` / `0`. */
export function setBool(
  params: URLSearchParams,
  key: string,
  value: boolean,
): void {
  params.set(key, value ? '1' : '0')
}
