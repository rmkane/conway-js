import type { AnchorMode, Rotation } from '@conway/geom'

import type { InteractionMode } from '@/life/conway.ts'

export interface LifeParams {
  seed: string
  zoom: number
  fg: string
  bg: string
  grid: boolean
  mode: InteractionMode
  spawn: string
  rot: Rotation
  anchor: AnchorMode
  flipX: boolean
  flipY: boolean
}

const DEFAULTS = {
  zoom: 12,
  grid: true,
  mode: 'spawn' as InteractionMode,
  spawn: 'glider',
  rot: 0 as Rotation,
  anchor: 'center' as AnchorMode,
  flipX: false,
  flipY: false,
}

export function parseBool(
  value: string | null | undefined,
  fallback: boolean,
): boolean {
  if (value === null || value === undefined || value === '') return fallback
  if (value === '1' || value === 'true' || value === 'on') return true
  if (value === '0' || value === 'false' || value === 'off') return false
  return fallback
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

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

function systemColors(): { fg: string; bg: string } {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return dark
    ? { fg: '#e8e8e8', bg: '#121212' }
    : { fg: '#111111', bg: '#ffffff' }
}

function parseMode(
  value: string | null,
  params: URLSearchParams,
): InteractionMode {
  if (value === 'inspect' || value === 'spawn') return value
  if (params.has('click'))
    return parseBool(params.get('click'), true) ? 'spawn' : 'inspect'
  return DEFAULTS.mode
}

export function parseRotation(value: number): Rotation {
  return value === 0 || value === 90 || value === 180 || value === 270
    ? value
    : DEFAULTS.rot
}

function parseParams(validSpawn: (id: string) => boolean): LifeParams {
  if (window.__LIFE_BOOT__) {
    const boot = window.__LIFE_BOOT__
    const sys = systemColors()
    return {
      ...boot,
      fg: decodeColor(boot.fg, sys.fg),
      bg: decodeColor(boot.bg, sys.bg),
      mode: boot.mode === 'inspect' ? 'inspect' : 'spawn',
      spawn: validSpawn(boot.spawn) ? boot.spawn : DEFAULTS.spawn,
      rot: parseRotation(boot.rot),
      anchor: boot.anchor === 'corner' ? 'corner' : 'center',
    }
  }

  const params = new URLSearchParams(location.search)
  const sys = systemColors()
  const spawnKey = params.get('spawn') || DEFAULTS.spawn
  const zoomRaw = Number(params.get('zoom') ?? DEFAULTS.zoom)
  const zoom = clamp(Number.isFinite(zoomRaw) ? zoomRaw : DEFAULTS.zoom, 2, 48)
  const rot = Number(params.get('rot') ?? DEFAULTS.rot)

  return {
    seed: params.get('seed') || newSeedValue(),
    zoom,
    fg: decodeColor(params.get('fg'), sys.fg),
    bg: decodeColor(params.get('bg'), sys.bg),
    grid: parseBool(params.get('grid'), DEFAULTS.grid),
    mode: parseMode(params.get('mode'), params),
    spawn: validSpawn(spawnKey) ? spawnKey : DEFAULTS.spawn,
    rot: parseRotation(rot),
    anchor: params.get('anchor') === 'corner' ? 'corner' : DEFAULTS.anchor,
    flipX: parseBool(params.get('flipX'), DEFAULTS.flipX),
    flipY: parseBool(params.get('flipY'), DEFAULTS.flipY),
  }
}

export function writeParams(
  state: LifeParams,
  aboutLink: HTMLAnchorElement | null,
): void {
  const params = new URLSearchParams()
  params.set('seed', state.seed)
  params.set('zoom', String(state.zoom))
  params.set('fg', encodeColor(state.fg))
  params.set('bg', encodeColor(state.bg))
  params.set('grid', state.grid ? '1' : '0')
  params.set('mode', state.mode)
  params.set('spawn', state.spawn)
  params.set('rot', String(state.rot))
  params.set('anchor', state.anchor)
  params.set('flipX', state.flipX ? '1' : '0')
  params.set('flipY', state.flipY ? '1' : '0')
  const search = `?${params.toString()}`
  history.replaceState(null, '', `${location.pathname}${search}`)

  if (aboutLink) aboutLink.href = `./about.html${search}`
}

/** Canonicalize URL params early and stash on window for the simulator. */
export function hydrateBoot(validSpawn: (id: string) => boolean): LifeParams {
  const boot = parseParams(validSpawn)
  writeParams(boot, null)
  window.__LIFE_BOOT__ = boot
  return boot
}
