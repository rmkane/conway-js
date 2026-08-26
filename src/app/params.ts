import { type AnchorMode, clamp, type Rotation } from '@conway/geom'
import {
  currentSearchParams,
  decodeColor,
  encodeColor,
  getBool,
  getNumber,
  getOneOf,
  getString,
  newSeedValue,
  oneOf,
  parseBool,
  replaceSearch,
  setBool,
} from '@conway/query'

import type { InteractionMode } from '@/life/conway.ts'

/** Canonical simulator state mirrored in the URL search string. */
export interface LifeParams {
  seed: string
  zoom: number
  fg: string
  bg: string
  grid: boolean
  origin: boolean
  mode: InteractionMode
  spawn: string
  rot: Rotation
  anchor: AnchorMode
  flipX: boolean
  flipY: boolean
}

const MODES = ['inspect', 'spawn'] as const
const ANCHORS = ['center', 'corner'] as const
const ROTATIONS: readonly Rotation[] = [0, 90, 180, 270]

const DEFAULTS = {
  zoom: 12,
  grid: false,
  origin: false,
  mode: 'inspect' as InteractionMode,
  spawn: 'glider',
  rot: 0 as Rotation,
  anchor: 'center' as AnchorMode,
  flipX: false,
  flipY: false,
}

function systemColors(): { fg: string; bg: string } {
  const dark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return dark
    ? { fg: '#e8e8e8', bg: '#121212' }
    : { fg: '#111111', bg: '#ffffff' }
}

/** Legacy `click=1|0` maps to spawn/inspect when `mode` is absent. */
function parseMode(params: URLSearchParams): InteractionMode {
  if (params.has('mode')) return getOneOf(params, 'mode', MODES, DEFAULTS.mode)
  if (params.has('click')) {
    return parseBool(params.get('click'), true) ? 'spawn' : 'inspect'
  }
  return DEFAULTS.mode
}

export function parseRotation(value: number): Rotation {
  for (const rot of ROTATIONS) {
    if (rot === value) return rot
  }
  return DEFAULTS.rot
}

function parseBootParams(validSpawn: (id: string) => boolean): LifeParams {
  const boot = window.__LIFE_BOOT__!
  const sys = systemColors()
  return {
    ...boot,
    fg: decodeColor(boot.fg, sys.fg),
    bg: decodeColor(boot.bg, sys.bg),
    grid: boot.grid ?? DEFAULTS.grid,
    origin: boot.origin ?? DEFAULTS.origin,
    mode: oneOf(boot.mode, MODES, DEFAULTS.mode),
    spawn: validSpawn(boot.spawn) ? boot.spawn : DEFAULTS.spawn,
    rot: parseRotation(boot.rot),
    anchor: oneOf(boot.anchor, ANCHORS, DEFAULTS.anchor),
  }
}

function parseUrlParams(validSpawn: (id: string) => boolean): LifeParams {
  const params = currentSearchParams()
  const sys = systemColors()
  const spawnKey = getString(params, 'spawn', DEFAULTS.spawn)

  return {
    seed: params.get('seed') || newSeedValue(),
    zoom: clamp(getNumber(params, 'zoom', DEFAULTS.zoom), 2, 48),
    fg: decodeColor(params.get('fg'), sys.fg),
    bg: decodeColor(params.get('bg'), sys.bg),
    grid: getBool(params, 'grid', DEFAULTS.grid),
    origin: getBool(params, 'origin', DEFAULTS.origin),
    mode: parseMode(params),
    spawn: validSpawn(spawnKey) ? spawnKey : DEFAULTS.spawn,
    rot: parseRotation(getNumber(params, 'rot', DEFAULTS.rot)),
    anchor: getOneOf(params, 'anchor', ANCHORS, DEFAULTS.anchor),
    flipX: getBool(params, 'flipX', DEFAULTS.flipX),
    flipY: getBool(params, 'flipY', DEFAULTS.flipY),
  }
}

function parseParams(validSpawn: (id: string) => boolean): LifeParams {
  return window.__LIFE_BOOT__
    ? parseBootParams(validSpawn)
    : parseUrlParams(validSpawn)
}

/** Serialize simulator state into `location` (and optionally an about-page link). */
export function writeParams(
  state: LifeParams,
  aboutLink: HTMLAnchorElement | null,
): void {
  const params = new URLSearchParams()
  params.set('seed', state.seed)
  params.set('zoom', String(state.zoom))
  params.set('fg', encodeColor(state.fg))
  params.set('bg', encodeColor(state.bg))
  setBool(params, 'grid', state.grid)
  setBool(params, 'origin', state.origin)
  params.set('mode', state.mode)
  params.set('spawn', state.spawn)
  params.set('rot', String(state.rot))
  params.set('anchor', state.anchor)
  setBool(params, 'flipX', state.flipX)
  setBool(params, 'flipY', state.flipY)
  const search = replaceSearch(params)

  if (aboutLink) aboutLink.href = `./about.html${search}`
}

/** Canonicalize URL params early and stash on window for the simulator. */
export function hydrateBoot(validSpawn: (id: string) => boolean): LifeParams {
  const boot = parseParams(validSpawn)
  writeParams(boot, null)
  window.__LIFE_BOOT__ = boot
  return boot
}

declare global {
  interface Window {
    __LIFE_BOOT__?: LifeParams
  }
}
