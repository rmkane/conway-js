import { mustGet } from '@/dom.ts'
import {
  LIFE_PATTERNS,
  type LifePattern,
  type PatternCategory,
} from '@/life-data.ts'

import '@/styles/main.css'

type AliveSet = Set<string>

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

function pack(x: number, y: number): string {
  return `${x},${y}`
}

function unpack(key: string): [number, number] {
  const i = key.indexOf(',')
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))]
}

function parseShape(shape: string[]): {
  alive: AliveSet
  cols: number
  rows: number
} {
  const alive: AliveSet = new Set()
  let cols = 0
  for (let y = 0; y < shape.length; y++) {
    cols = Math.max(cols, shape[y].length)
    for (let x = 0; x < shape[y].length; x++) {
      if (shape[y][x] === '#') alive.add(pack(x, y))
    }
  }
  return { alive, cols, rows: shape.length }
}

/** Gallery boards add margin so oscillators/ships can move without clipping. */
function boardPad(pattern: LifePattern): { x: number; y: number } {
  if (pattern.pad) return pattern.pad
  const n = pattern.category === 'Still lifes' ? 1 : 2
  return { x: n, y: n }
}

function step(alive: AliveSet): AliveSet {
  const counts = new Map<string, number>()
  for (const key of alive) {
    const [x, y] = unpack(key)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const k = pack(x + dx, y + dy)
        counts.set(k, (counts.get(k) || 0) + 1)
      }
    }
  }
  const next: AliveSet = new Set()
  for (const [key, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(key))) next.add(key)
  }
  return next
}

function bbox(alive: AliveSet): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const key of alive) {
    const [x, y] = unpack(key)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

function shiftAlive(alive: AliveSet, dx: number, dy: number): AliveSet {
  if (dx === 0 && dy === 0) return alive
  const next: AliveSet = new Set()
  for (const key of alive) {
    const [x, y] = unpack(key)
    next.add(pack(x + dx, y + dy))
  }
  return next
}

function homeAlive(alive: AliveSet, cols: number, rows: number): AliveSet {
  if (!alive.size) return alive
  const { minX, minY, maxX, maxY } = bbox(alive)
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const targetMinX = Math.floor((cols - width) / 2)
  const targetMinY = Math.floor((rows - height) / 2)
  return shiftAlive(alive, targetMinX - minX, targetMinY - minY)
}

function prepareTransition(item: GalleryItem): void {
  if (item.pattern.period === 1) {
    item.pendingAlive = item.alive
    item.moveX = 0
    item.moveY = 0
    return
  }

  const next = step(item.alive)
  if (item.isShip) {
    const velocity = item.pattern.velocity ?? [0, 0]
    const [dx, dy] = velocity
    item.moveX = dx / item.pattern.period
    item.moveY = dy / item.pattern.period
    item.pendingAlive = homeAlive(next, item.cols, item.rows)
  } else {
    item.moveX = 0
    item.moveY = 0
    item.pendingAlive = next
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
      const cell = document.createElement('span')
      cell.className = alive.has(pack(x, y))
        ? 'life-cell is-alive'
        : 'life-cell'
      frag.append(cell)
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

  const card = document.createElement('article')
  card.className =
    'min-h-[180px] rounded-[10px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm'

  const header = document.createElement('div')
  header.className = 'mb-3.5 flex items-baseline justify-between gap-3'

  const title = document.createElement('h3')
  title.className = 'm-0 text-[0.95rem] font-semibold'
  title.textContent = pattern.name

  const info = document.createElement('span')
  info.className = 'whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400'
  info.textContent =
    pattern.period === 1
      ? 'still · shape only'
      : `period ${pattern.period} · computed`

  header.append(title, info)

  const board = document.createElement('div')
  board.className = 'life-board border border-zinc-300 dark:border-zinc-700'
  board.style.setProperty('--rows', String(rows))
  board.style.setProperty('--cols', String(cols))

  const inner = document.createElement('div')
  inner.className = 'life-board-inner'
  board.append(inner)
  card.append(header, board)

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

const groups: PatternCategory[] = ['Still lifes', 'Oscillators', 'Spaceships']
const rendered: GalleryItem[] = []

for (const groupName of groups) {
  const section = document.createElement('section')
  section.className = 'mb-9'

  const heading = document.createElement('h2')
  heading.className = 'mb-3 mt-0 text-[1.05rem] font-semibold'
  heading.textContent = groupName

  const cards = document.createElement('div')
  cards.className =
    'grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5'

  for (const pattern of Object.values(LIFE_PATTERNS).filter(
    (p) => p.category === groupName,
  )) {
    const item = makePatternCard(pattern)
    rendered.push(item)
    cards.append(item.card)
  }

  section.append(heading, cards)
  gallery.append(section)
}

function tick(now: number): void {
  if (!running) {
    requestAnimationFrame(tick)
    return
  }

  if (!generationStartedAt) generationStartedAt = now

  let t = (now - generationStartedAt) / generationDuration
  if (t >= 1) {
    for (const item of rendered) commitGeneration(item)
    generationStartedAt = now
    t = 0
  }

  for (const item of rendered) {
    if (item.isShip) setGridScroll(item, Math.min(t, 1))
  }

  requestAnimationFrame(tick)
}

speedInput.addEventListener('input', () => {
  generationDuration = Number(speedInput.value)
  speedLabel.textContent = `${generationDuration} ms`
})

toggleButton.addEventListener('click', () => {
  running = !running
  toggleButton.textContent = running ? 'Pause' : 'Play'
  if (running) generationStartedAt = 0
})

speedLabel.textContent = `${generationDuration} ms`
requestAnimationFrame(tick)
