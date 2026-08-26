import { el, mustGet } from '@conway/dom'
import { clamp, length, type Point, sub, vec } from '@conway/geom'
import { newSeedValue } from '@conway/query'

import {
  hydrateBoot,
  type LifeParams,
  parseRotation,
  writeParams,
} from '@/app/params.ts'
import { mountAppVersion } from '@/app/version.ts'
import { Conway } from '@/life/conway.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'
import {
  formatSpeedFactor,
  generationIntervalMs,
  snapSpeedFactor,
} from '@/life/timing.ts'

import '@/styles/main.css'

mountAppVersion()

const form = mustGet('#settings', HTMLFormElement)
const aboutLink = mustGet('#about-link', HTMLAnchorElement)
const seedInput = mustGet('#seed', HTMLInputElement)
const seedRandomBtn = mustGet('#seed-random', HTMLButtonElement)
const zoomInput = mustGet('#zoom', HTMLInputElement)
const zoomLabel = mustGet('#zoom-label', HTMLOutputElement)
const fgInput = mustGet('#fg', HTMLInputElement)
const bgInput = mustGet('#bg', HTMLInputElement)
const gridInput = mustGet('#grid', HTMLInputElement)
const originInput = mustGet('#origin', HTMLInputElement)
const modeSelect = mustGet('#mode', HTMLSelectElement)
const spawnFields = mustGet('#spawn-fields', HTMLFieldSetElement)
const spawnSelect = mustGet('#spawn', HTMLSelectElement)
const spawnRotSelect = mustGet('#spawn-rot', HTMLSelectElement)
const spawnAnchorSelect = mustGet('#spawn-anchor', HTMLSelectElement)
const spawnFlipXInput = mustGet('#spawn-flip-x', HTMLInputElement)
const spawnFlipYInput = mustGet('#spawn-flip-y', HTMLInputElement)
const canvas = mustGet('#life', HTMLCanvasElement)
const playBtn = mustGet('#play', HTMLButtonElement)
const prevBtn = mustGet('#prev', HTMLButtonElement)
const nextBtn = mustGet('#next', HTMLButtonElement)
const resetBtn = mustGet('#reset', HTMLButtonElement)
const clearBtn = mustGet('#clear', HTMLButtonElement)
const centerBtn = mustGet('#center', HTMLButtonElement)
const speedInput = mustGet('#speed', HTMLInputElement)
const speedLabel = mustGet('#speed-label', HTMLElement)
const statusGen = mustGet('#status-gen', HTMLElement)
const statusPop = mustGet('#status-pop', HTMLElement)
const statusPopTrend = mustGet('#status-pop-trend', HTMLElement)
const statusCursor = mustGet('#status-cursor', HTMLElement)
const statusPattern = mustGet('#status-pattern', HTMLElement)
const statusState = mustGet('#status-state', HTMLElement)

function readMode(): LifeParams['mode'] {
  return modeSelect.value === 'inspect' ? 'inspect' : 'spawn'
}

function readAnchor(): LifeParams['anchor'] {
  return spawnAnchorSelect.value === 'corner' ? 'corner' : 'center'
}

function formState(): LifeParams {
  return {
    seed: seedInput.value.trim() || newSeedValue(),
    zoom: clamp(Number(zoomInput.value), 2, 48),
    fg: fgInput.value,
    bg: bgInput.value,
    grid: gridInput.checked,
    origin: originInput.checked,
    mode: readMode(),
    spawn: spawnSelect.value,
    rot: parseRotation(Number(spawnRotSelect.value) || 0),
    anchor: readAnchor(),
    flipX: spawnFlipXInput.checked,
    flipY: spawnFlipYInput.checked,
  }
}

function spawnOptions(state: LifeParams) {
  return {
    rotation: state.rot,
    anchor: state.anchor,
    flipX: state.flipX,
    flipY: state.flipY,
  }
}

function revealUi(): void {
  document.documentElement.classList.remove('boot-pending')
}

const initial = hydrateBoot((id) => Boolean(LIFE_PATTERNS[id]))

for (const [id, pattern] of Object.entries(LIFE_PATTERNS)) {
  spawnSelect.append(
    el('option', {
      value: id,
      textContent: `${pattern.name} (${pattern.category})`,
      selected: id === initial.spawn,
    }),
  )
}

seedInput.value = initial.seed
zoomInput.value = String(initial.zoom)
zoomLabel.textContent = `${initial.zoom}px`
fgInput.value = initial.fg
bgInput.value = initial.bg
gridInput.checked = initial.grid
originInput.checked = initial.origin
modeSelect.value = initial.mode === 'inspect' ? 'inspect' : 'spawn'
spawnSelect.value = initial.spawn
spawnRotSelect.value = String(initial.rot)
spawnAnchorSelect.value = initial.anchor === 'corner' ? 'corner' : 'center'
spawnFlipXInput.checked = initial.flipX
spawnFlipYInput.checked = initial.flipY
writeParams(initial, aboutLink)

const game = new Conway(canvas, {
  cellSize: initial.zoom,
  foreground: initial.fg,
  background: initial.bg,
  showGrid: initial.grid,
  showOrigin: initial.origin,
})

function syncCanvasCursor(panning = false): void {
  if (panning) {
    canvas.style.cursor = 'grabbing'
    return
  }
  canvas.style.cursor = modeSelect.value === 'spawn' ? 'crosshair' : 'grab'
}

function syncModeUi(): void {
  const mode = modeSelect.value === 'inspect' ? 'inspect' : 'spawn'
  game.setMode(mode)
  syncCanvasCursor()
  form.dataset.mode = mode
  spawnFields.disabled = mode !== 'spawn'
}

function syncGhost(): void {
  const pattern = LIFE_PATTERNS[spawnSelect.value]
  const anchor = spawnAnchorSelect.value === 'corner' ? 'corner' : 'center'
  game.setGhostAnchor(anchor)
  if (!pattern) {
    game.setGhostPattern(null)
    return
  }
  game.setGhostPattern(pattern.shape, {
    rotation: parseRotation(Number(spawnRotSelect.value) || 0),
    flipX: spawnFlipXInput.checked,
    flipY: spawnFlipYInput.checked,
  })
}

// Refresh always restores generation 0 from the PRNG seed in the URL.
game.setRandomSeed(initial.seed, { render: false })
syncGhost()
syncModeUi()
game.render() // sync first paint before revealing UI
revealUi()

function runningLabels(running: boolean): {
  state: string
  pressed: string
} {
  if (running) return { state: 'running', pressed: 'true' }
  return { state: 'paused', pressed: 'false' }
}

function syncPlayUi(running: boolean): void {
  const labels = runningLabels(running)
  const action = running ? 'Pause simulation' : 'Play simulation'
  statusState.textContent = labels.state
  // Icons live in HTML; aria-pressed toggles play ↔ pause via CSS.
  playBtn.title = action
  playBtn.setAttribute('aria-label', action)
  playBtn.setAttribute('aria-pressed', labels.pressed)
  prevBtn.disabled = running || game.generation === 0
  nextBtn.disabled = running
}

function syncPatternStatus(): void {
  const name = game.hoverMatch?.name ?? '—'
  statusPattern.textContent = name
  statusPattern.title = game.hoverMatch?.name ?? ''
}

let lastPopulation: number | null = null

function syncPopTrend(population: number): void {
  const prev = lastPopulation
  lastPopulation = population
  statusPopTrend.classList.remove(
    'text-emerald-600',
    'text-red-600',
    'dark:text-emerald-400',
    'dark:text-red-400',
    'text-zinc-400',
  )
  if (prev == null || population === prev) {
    statusPopTrend.textContent = '–'
    statusPopTrend.classList.add('text-zinc-400')
    statusPopTrend.setAttribute('aria-label', 'population unchanged')
    return
  }
  if (population > prev) {
    statusPopTrend.textContent = '▲'
    statusPopTrend.classList.add('text-emerald-600', 'dark:text-emerald-400')
    statusPopTrend.setAttribute('aria-label', 'population up')
    return
  }
  statusPopTrend.textContent = '▼'
  statusPopTrend.classList.add('text-red-600', 'dark:text-red-400')
  statusPopTrend.setAttribute('aria-label', 'population down')
}

function syncStatus(): void {
  statusGen.textContent = String(game.generation)
  statusPop.textContent = String(game.population)
  syncPopTrend(game.population)
  syncPatternStatus()
  syncPlayUi(game.running)
}

game.onChange(syncStatus)
syncStatus()

function applyFormToGame({
  resetSeed = false,
  zoomFocus,
}: {
  resetSeed?: boolean
  zoomFocus?: Point
} = {}): void {
  const state = formState()
  seedInput.value = state.seed
  zoomInput.value = String(state.zoom)
  zoomLabel.textContent = `${state.zoom}px`
  writeParams(state, aboutLink)
  window.__LIFE_BOOT__ = state

  game.setZoom(state.zoom, zoomFocus)
  game.setColors(state.fg, state.bg)
  game.setShowGrid(state.grid)
  game.setShowOrigin(state.origin)
  syncGhost()
  syncModeUi()

  if (resetSeed) {
    game.pause()
    game.setRandomSeed(state.seed)
  }

  syncStatus()
}

form.addEventListener('change', (event) => {
  const resetSeed = event.target === seedInput
  applyFormToGame({ resetSeed })
})

seedInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  applyFormToGame({ resetSeed: true })
})

seedRandomBtn.addEventListener('click', () => {
  seedInput.value = newSeedValue()
  applyFormToGame({ resetSeed: true })
})

let pointerClient: Point | null = null

const PAN_THRESHOLD_PX = 4

type PanDrag = {
  pointerId: number
  start: Point
  last: Point
  active: boolean
}

let panDrag: PanDrag | null = null
let suppressClick = false

function clientPoint(event: Pick<MouseEvent, 'clientX' | 'clientY'>): Point {
  return vec(event.clientX, event.clientY)
}

function syncHoverFromClient(client: Point): void {
  const cell = game.cellAtClient(client)
  setCursorStatus(cell)
  game.setHoverCell(cell)
  syncPatternStatus()
}

function applyZoom(cellSize: number): void {
  zoomInput.value = String(clamp(cellSize, 2, 48))
  zoomLabel.textContent = `${zoomInput.value}px`
  applyFormToGame({ zoomFocus: pointerClient ?? undefined })
  if (pointerClient) syncHoverFromClient(pointerClient)
}

zoomInput.addEventListener('input', () => {
  applyZoom(Number(zoomInput.value))
})

canvas.addEventListener(
  'wheel',
  (event) => {
    event.preventDefault()
    pointerClient = clientPoint(event)
    const step = event.deltaY > 0 ? -1 : 1
    applyZoom(Number(zoomInput.value) + step)
  },
  { passive: false },
)

fgInput.addEventListener('input', () => applyFormToGame())
bgInput.addEventListener('input', () => applyFormToGame())

playBtn.addEventListener('click', () => {
  game.toggle()
  syncStatus()
})

prevBtn.addEventListener('click', () => {
  if (!game.paused) return
  game.prev()
})

nextBtn.addEventListener('click', () => {
  if (!game.paused) return
  game.next()
})

resetBtn.addEventListener('click', () => {
  game.pause()
  game.resetToSeed()
  syncStatus()
})

clearBtn.addEventListener('click', () => {
  game.pause()
  game.clear()
  syncStatus()
})

centerBtn.addEventListener('click', () => {
  game.centerView()
  if (pointerClient) syncHoverFromClient(pointerClient)
})

function syncSpeedFromInput(): number {
  const factor = snapSpeedFactor(Number(speedInput.value))
  speedInput.value = String(factor)
  speedLabel.textContent = formatSpeedFactor(factor)
  return generationIntervalMs(factor)
}

let interval = syncSpeedFromInput()

speedInput.addEventListener('input', () => {
  interval = syncSpeedFromInput()
})

const ro = new ResizeObserver(() => game.resize())
ro.observe(canvas)

function setCursorStatus(cell: { x: number; y: number } | null): void {
  statusCursor.textContent = cell ? `${cell.x}, ${cell.y}` : '—'
}

function endPan(event: PointerEvent): void {
  if (!panDrag || event.pointerId !== panDrag.pointerId) return
  if (panDrag.active) suppressClick = true
  panDrag = null
  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId)
  }
  syncCanvasCursor()
}

canvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (panDrag) return
  const client = clientPoint(event)
  panDrag = {
    pointerId: event.pointerId,
    start: client,
    last: client,
    active: false,
  }
  pointerClient = client
  canvas.setPointerCapture(event.pointerId)
})

canvas.addEventListener('pointermove', (event) => {
  const client = clientPoint(event)
  pointerClient = client

  if (panDrag && event.pointerId === panDrag.pointerId) {
    if (!panDrag.active) {
      if (length(sub(client, panDrag.start)) < PAN_THRESHOLD_PX) {
        syncHoverFromClient(client)
        return
      }
      panDrag.active = true
      syncCanvasCursor(true)
    }
    const delta = sub(client, panDrag.last)
    panDrag.last = client
    game.panBy(delta)
    syncHoverFromClient(client)
    return
  }

  syncHoverFromClient(client)
})

canvas.addEventListener('pointerup', endPan)
canvas.addEventListener('pointercancel', endPan)

canvas.addEventListener('pointerleave', () => {
  if (panDrag) return
  pointerClient = null
  setCursorStatus(null)
  game.setHoverCell(null)
  syncPatternStatus()
})

canvas.addEventListener('click', (event) => {
  if (suppressClick) {
    suppressClick = false
    return
  }
  if (modeSelect.value !== 'spawn') return
  const cell = game.cellAtEvent(event)
  if (!cell) return

  const state = formState()
  writeParams(state, aboutLink)
  window.__LIFE_BOOT__ = state

  const pattern = LIFE_PATTERNS[state.spawn]
  if (!pattern) return
  game.spawn(pattern.shape, cell, spawnOptions(state))
  syncStatus()
})

let last = 0

function tick(now: number): void {
  if (!last) last = now
  const dt = Math.min(100, now - last)
  last = now
  game.update(dt, interval)
  requestAnimationFrame(tick)
}

requestAnimationFrame(tick)
