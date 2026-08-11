import { el, mustGet } from '@conway/dom'

import {
  type AliveSet,
  homeAlive,
  pack,
  stepAlive,
  unpack,
} from '@/life/cells.ts'
import {
  LIFE_PATTERNS,
  type LifePattern,
  type PatternCategory,
} from '@/life/data.ts'
import { parseShape } from '@/life/shape.ts'

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
let generationDuration = Number(speedInput.value)
let generationStartedAt = 0

/** Gallery boards add margin so oscillators/ships can move without clipping. */
function boardPad(pattern: LifePattern): { x: number; y: number } {
  if (pattern.pad) return pattern.pad
  const n = pattern.category === 'Still lifes' ? 1 : 2
  return { x: n, y: n }
}

/** Drop cells that left the visible board (guns emit ships forever). */
function clipAlive(alive: AliveSet, cols: number, rows: number): AliveSet {
  const next: AliveSet = new Set()
  for (const key of alive) {
    const [x, y] = unpack(key)
    if (x >= 0 && y >= 0 && x < cols && y < rows) next.add(key)
  }
  return next
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
    item.pendingAlive = clipAlive(next, item.cols, item.rows)
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
  const pad = boardPad(pattern)
  const cols = parsed.cols + pad.x * 2
  const rows = parsed.rows + pad.y * 2
  const alive = homeAlive(parsed.alive, cols, rows)

  const title = el('h3', {
    className: 'm-0 text-[0.95rem] font-semibold',
    textContent: pattern.name,
  })
  const info = el('span', {
    className: 'whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400',
    textContent:
      pattern.period === 1
        ? 'still · shape only'
        : `period ${pattern.period} · computed`,
  })
  const header = el(
    'div',
    { className: 'mb-3.5 flex items-baseline justify-between gap-3' },
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
  const card = el(
    'article',
    {
      className:
        'min-h-[180px] rounded-[10px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm',
    },
    header,
    board,
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
          className:
            'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5',
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
  generationDuration = Number(speedInput.value)
  speedLabel.textContent = `${generationDuration} ms`
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

speedLabel.textContent = `${generationDuration} ms`
requestAnimationFrame(tick)
