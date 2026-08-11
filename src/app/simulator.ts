import { el, mustGet } from '@conway/dom'

import {
  clamp,
  hydrateBoot,
  newSeedValue,
  parseRotation,
  type LifeParams,
  writeParams,
} from '@/app/params.ts'
import { Conway } from '@/life/conway.ts'
import { LIFE_PATTERNS } from '@/life/data.ts'

import '@/styles/main.css'

const form = mustGet('#settings', HTMLFormElement)
const aboutLink = mustGet('#about-link', HTMLAnchorElement)
const seedInput = mustGet('#seed', HTMLInputElement)
const seedRandomBtn = mustGet('#seed-random', HTMLButtonElement)
const zoomInput = mustGet('#zoom', HTMLInputElement)
const zoomLabel = mustGet('#zoom-label', HTMLOutputElement)
const fgInput = mustGet('#fg', HTMLInputElement)
const bgInput = mustGet('#bg', HTMLInputElement)
const gridInput = mustGet('#grid', HTMLInputElement)
const modeSelect = mustGet('#mode', HTMLSelectElement)
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
const speedInput = mustGet('#speed', HTMLInputElement)
const speedLabel = mustGet('#speed-label', HTMLElement)
const statusGen = mustGet('#status-gen', HTMLElement)
const statusPop = mustGet('#status-pop', HTMLElement)
const statusCursor = mustGet('#status-cursor', HTMLElement)
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
})

function syncModeUi(): void {
  const mode = modeSelect.value === 'inspect' ? 'inspect' : 'spawn'
  game.setMode(mode)
  canvas.style.cursor = mode === 'spawn' ? 'crosshair' : 'default'
  form.dataset.mode = mode
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
  play: string
  pressed: string
} {
  if (running) return { state: 'running', play: 'Pause', pressed: 'true' }
  return { state: 'paused', play: 'Play', pressed: 'false' }
}

function syncPlayUi(running: boolean): void {
  const labels = runningLabels(running)
  statusState.textContent = labels.state
  playBtn.textContent = labels.play
  playBtn.setAttribute('aria-pressed', labels.pressed)
  prevBtn.disabled = running || game.generation === 0
  nextBtn.disabled = running
}

function syncStatus(): void {
  statusGen.textContent = String(game.generation)
  statusPop.textContent = String(game.population)
  syncPlayUi(game.running)
}

game.onChange(syncStatus)
syncStatus()

function applyFormToGame({ resetSeed = false } = {}): void {
  const state = formState()
  seedInput.value = state.seed
  zoomInput.value = String(state.zoom)
  zoomLabel.textContent = `${state.zoom}px`
  writeParams(state, aboutLink)
  window.__LIFE_BOOT__ = state

  game.setZoom(state.zoom)
  game.setColors(state.fg, state.bg)
  game.setShowGrid(state.grid)
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

zoomInput.addEventListener('input', () => {
  zoomLabel.textContent = `${zoomInput.value}px`
  applyFormToGame()
})

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

let interval = Number(speedInput.value)
speedLabel.textContent = `${interval} ms`

speedInput.addEventListener('input', () => {
  interval = Number(speedInput.value)
  speedLabel.textContent = `${interval} ms`
})

const ro = new ResizeObserver(() => game.resize())
ro.observe(canvas)

function setCursorStatus(cell: { x: number; y: number } | null): void {
  statusCursor.textContent = cell ? `${cell.x}, ${cell.y}` : '—'
}

canvas.addEventListener('mousemove', (event) => {
  const cell = game.cellAtEvent(event)
  setCursorStatus(cell)
  game.setHoverCell(cell)
})

canvas.addEventListener('mouseleave', () => {
  setCursorStatus(null)
  game.setHoverCell(null)
})

canvas.addEventListener('click', (event) => {
  if (modeSelect.value !== 'spawn') return
  const cell = game.cellAtEvent(event)
  if (!cell) return

  const state = formState()
  writeParams(state, aboutLink)
  window.__LIFE_BOOT__ = state

  const pattern = LIFE_PATTERNS[state.spawn]
  if (!pattern) return
  game.spawn(pattern.shape, cell.x, cell.y, spawnOptions(state))
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
