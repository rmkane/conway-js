import { el, mustGet } from '@conway/dom'

import {
  type AliveSet,
  bbox,
  clipAlive,
  homeAlive,
  pack,
  shiftAlive,
  stepAlive,
} from '@/life/cells.ts'
import {
  LIFE_PATTERNS,
  type LifePattern,
  type PatternCategory,
} from '@/life/data.ts'
import { parseShape } from '@/life/shape.ts'
import {
  BASE_GALLERY_GENERATION_MS,
  formatSpeedFactor,
  generationIntervalMs,
  snapSpeedFactor,
} from '@/life/timing.ts'

import '@/styles/main.css'

interface GalleryItem {
  card: HTMLElement
  board: HTMLElement
  inner: HTMLElement
  pattern: LifePattern
  cols: number
  rows: number
  isShip: boolean
  alive: AliveSet
  pendingAlive: AliveSet | null
  moveX: number
  moveY: number
  gridOffsetX: number
  gridOffsetY: number
}

const gallery = mustGet('#gallery', HTMLElement)
const simLink = document.querySelector<HTMLAnchorElement>('#sim-link')
const speedInput = mustGet('#speed', HTMLInputElement)
const speedLabel = mustGet('#speed-label', HTMLElement)
const toggleButton = mustGet('#toggle', HTMLButtonElement)

// Keep simulator settings (including colors) when navigating back.
if (simLink) simLink.href = `./index.html${location.search}`

let running = true
let generationDuration = generationIntervalMs(1, BASE_GALLERY_GENERATION_MS)
let generationStartedAt = 0

function syncSpeedFromInput(): number {
  const factor = snapSpeedFactor(Number(speedInput.value))
  speedInput.value = String(factor)
  speedLabel.textContent = formatSpeedFactor(factor)
  return generationIntervalMs(factor, BASE_GALLERY_GENERATION_MS)
}

/** Gallery boards add margin so oscillators/ships can move without clipping. */
function boardPad(pattern: LifePattern): {
  x: number
  y: number
  se?: { x: number; y: number }
} {
  if (pattern.pad) return pattern.pad
  const n = pattern.category === 'Still lifes' ? 1 : 2
  return { x: n, y: n }
}

/** Board size + seed origin for a gallery card. */
function boardLayout(
  pattern: LifePattern,
  parsed: { cols: number; rows: number; alive: AliveSet },
): { cols: number; rows: number; alive: AliveSet } {
  const pad = boardPad(pattern)
  if (pad.se) {
    const cols = parsed.cols + pad.x + pad.se.x
    const rows = parsed.rows + pad.y + pad.se.y
    const { minX, minY } = bbox(parsed.alive)
    return {
      cols,
      rows,
      alive: shiftAlive(parsed.alive, pad.x - minX, pad.y - minY),
    }
  }
  const cols = parsed.cols + pad.x * 2
  const rows = parsed.rows + pad.y * 2
  return { cols, rows, alive: homeAlive(parsed.alive, cols, rows) }
}

function prepareTransition(item: GalleryItem): void {
  if (item.pattern.period === 1) {
    item.pendingAlive = item.alive
    item.moveX = 0
    item.moveY = 0
    return
  }

  const next = stepAlive(item.alive)
  if (item.isShip) {
    const velocity = item.pattern.velocity ?? [0, 0]
    const [dx, dy] = velocity
    item.moveX = dx / item.pattern.period
    item.moveY = dy / item.pattern.period
    item.pendingAlive = homeAlive(next, item.cols, item.rows)
  } else {
    item.moveX = 0
    item.moveY = 0
    item.pendingAlive = clipAlive(next, 0, 0, item.cols, item.rows)
  }
}

function cellSize(item: GalleryItem): number {
  const value = getComputedStyle(item.board).getPropertyValue('--cell-size')
  return Number.parseFloat(value) || 10
}

function setGridScroll(item: GalleryItem, t: number): void {
  if (!item.isShip) return
  const size = cellSize(item)
  const x = item.gridOffsetX - item.moveX * size * t
  const y = item.gridOffsetY - item.moveY * size * t
  item.board.style.backgroundPosition = `${x}px ${y}px`
}

function commitGeneration(item: GalleryItem): void {
  if (item.isShip) {
    const size = cellSize(item)
    item.gridOffsetX -= item.moveX * size
    item.gridOffsetY -= item.moveY * size
  }
  if (item.pendingAlive) item.alive = item.pendingAlive
  renderCells(item)
  prepareTransition(item)
  setGridScroll(item, 0)
}

function renderCells(item: GalleryItem): void {
  const { inner, alive, cols, rows } = item
  const frag = document.createDocumentFragment()
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      frag.append(
        el('span', {
          className: alive.has(pack(x, y)) ? 'life-cell is-alive' : 'life-cell',
        }),
      )
    }
  }
  inner.replaceChildren(frag)
}

function makePatternCard(pattern: LifePattern): GalleryItem {
  const parsed = parseShape(pattern.shape)
  const isShip = pattern.category === 'Spaceships'
  const { cols, rows, alive } = boardLayout(pattern, parsed)

  const title = el('h3', {
    className: 'm-0 text-[0.95rem] leading-snug font-semibold',
    textContent: pattern.name,
  })
  const info = el('span', {
    className: 'text-xs text-zinc-500 dark:text-zinc-400',
    textContent:
      pattern.period === 1
        ? 'still · shape only'
        : `period ${pattern.period} · computed`,
  })
  const header = el(
    'div',
    // Reserve two title lines so card chrome matches within a category.
    { className: 'mb-2 flex min-h-11 flex-col gap-0.5' },
    title,
    info,
  )

  const inner = el('div', { className: 'life-board-inner' })
  const board = el(
    'div',
    {
      className: 'life-board border border-zinc-300 dark:border-zinc-700',
      role: 'img',
      ariaLabel:
        pattern.period === 1
          ? `${pattern.name} still life`
          : `${pattern.name}, period ${pattern.period}`,
      style: { '--rows': String(rows), '--cols': String(cols) },
    },
    inner,
  )
  const stage = el('div', { className: 'gallery-board-stage' }, board)
  const card = el(
    'article',
    {
      className:
        'flex h-full flex-col overflow-x-auto rounded-[10px] border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900',
    },
    header,
    stage,
  )

  const item: GalleryItem = {
    card,
    board,
    inner,
    pattern,
    cols,
    rows,
    isShip,
    alive,
    pendingAlive: null,
    moveX: 0,
    moveY: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
  }

  renderCells(item)
  prepareTransition(item)
  return item
}

const groups: PatternCategory[] = [
  'Still lifes',
  'Oscillators',
  'Spaceships',
  'Guns',
]
const rendered: GalleryItem[] = []

for (const groupName of groups) {
  const items = Object.values(LIFE_PATTERNS)
    .filter((p) => p.category === groupName)
    .map(makePatternCard)
  rendered.push(...items)

  const maxRows = Math.max(1, ...items.map((item) => item.rows))
  const maxCols = Math.max(1, ...items.map((item) => item.cols))
  // Match .life-board --cell-size (7px) plus card padding so wide boards
  // (guns) are not clipped by a narrow auto-fill track.
  const minTrackPx = Math.max(200, maxCols * 7 + 24)

  gallery.append(
    el(
      'section',
      { className: 'mb-9' },
      el('h2', {
        className: 'mb-3 mt-0 text-[1.05rem] font-semibold',
        textContent: groupName,
      }),
      el(
        'div',
        {
          className: 'grid gap-3',
          style: {
            '--group-board-rows': String(maxRows),
            'grid-template-columns': `repeat(auto-fill, minmax(min(100%, ${minTrackPx}px), 1fr))`,
          },
        },
        ...items.map((item) => item.card),
      ),
    ),
  )
}

function generationProgress(now: number): number {
  if (!generationStartedAt) generationStartedAt = now
  const t = (now - generationStartedAt) / generationDuration
  if (t < 1) return t
  for (const item of rendered) commitGeneration(item)
  generationStartedAt = now
  return 0
}

function scrollShips(t: number): void {
  for (const item of rendered) {
    if (item.isShip) setGridScroll(item, t)
  }
}

function advanceGallery(now: number): void {
  scrollShips(Math.min(generationProgress(now), 1))
}

function tick(now: number): void {
  if (running) advanceGallery(now)
  requestAnimationFrame(tick)
}

speedInput.addEventListener('input', () => {
  generationDuration = syncSpeedFromInput()
})

function syncToggleUi(): void {
  const action = running ? 'Pause gallery animation' : 'Play gallery animation'
  toggleButton.textContent = running ? 'Pause' : 'Play'
  toggleButton.title = action
  toggleButton.setAttribute('aria-label', action)
  toggleButton.setAttribute('aria-pressed', running ? 'true' : 'false')
}

toggleButton.addEventListener('click', () => {
  running = !running
  syncToggleUi()
  if (running) generationStartedAt = 0
})

syncToggleUi()

generationDuration = syncSpeedFromInput()
document.documentElement.classList.remove('boot-pending')
requestAnimationFrame(tick)
