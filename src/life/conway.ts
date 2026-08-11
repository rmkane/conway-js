import {
  type AnchorMode,
  anchorToOrigin,
  type Offset,
  type Point,
  type TransformOptions,
} from '@conway/geom'

import {
  type AliveSet,
  bbox,
  cloneAlive,
  pack,
  stepAlive,
  unpack,
} from '@/life/cells.ts'
import { patternOffsets } from '@/life/pattern.ts'
import { randomSoup } from '@/life/rng.ts'

const HISTORY_LIMIT = 1000

export type InteractionMode = 'inspect' | 'spawn'

export type SpawnOptions = TransformOptions & {
  anchor?: AnchorMode
}

export interface ConwayOptions {
  cellSize?: number
  foreground?: string
  background?: string
  showGrid?: boolean
}

export interface RandomSeedOptions {
  width?: number
  height?: number
  density?: number
  render?: boolean
}

/**
 * Canvas Game of Life engine.
 * Call update() on a timer; call render() to paint (render is rAF-debounced).
 */
export class Conway {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  cellSize: number
  foreground: string
  background: string
  showGrid: boolean

  running = false
  generation = 0
  alive: AliveSet = new Set()
  seedAlive: AliveSet = new Set()
  seedKey = ''
  history: AliveSet[] = []

  originX = 0
  originY = 0
  hoverCell: Point | null = null
  /** Offsets from top-left for spawn ghost. */
  ghostTemplate: Offset[] | null = null
  ghostAnchor: AnchorMode = 'center'
  mode: InteractionMode = 'spawn'

  private _renderQueued = false
  private _onChange: ((game: Conway) => void) | null = null
  private _acc = 0

  constructor(canvas: HTMLCanvasElement, options: ConwayOptions = {}) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')

    this.canvas = canvas
    this.ctx = ctx
    this.cellSize = options.cellSize ?? 8
    this.foreground = options.foreground ?? '#111111'
    this.background = options.background ?? '#ffffff'
    this.showGrid = options.showGrid ?? true
  }

  onChange(fn: (game: Conway) => void): void {
    this._onChange = fn
  }

  get population(): number {
    return this.alive.size
  }

  get paused(): boolean {
    return !this.running
  }

  play(): void {
    this.running = true
    this._acc = 0
    this._emit()
  }

  pause(): void {
    this.running = false
    this._acc = 0
    this._emit()
  }

  toggle(): void {
    if (this.running) this.pause()
    else this.play()
  }

  setColors(foreground: string, background: string): void {
    this.foreground = foreground
    this.background = background
    this.scheduleRender()
  }

  setZoom(cellSize: number): void {
    this.cellSize = Math.max(1, Math.round(cellSize))
    this.scheduleRender()
  }

  setShowGrid(showGrid: boolean): void {
    this.showGrid = showGrid
    this.scheduleRender()
  }

  /** Build a deterministic pseudo-random soup from a seed string/number/UUID. */
  setRandomSeed(
    seedKey: string | number,
    options: RandomSeedOptions = {},
  ): void {
    this.seedKey = String(seedKey)
    this.seedAlive = randomSoup(seedKey, options)
    this.resetToSeed({ render: options.render !== false })
  }

  /** Set the translucent spawn preview shape (follows the hover cell). */
  setGhostPattern(rows: string[] | null, options: TransformOptions = {}): void {
    if (!rows) {
      this.ghostTemplate = null
      this.scheduleRender()
      return
    }
    const offsets = patternOffsets(rows, options)
    this.ghostTemplate = offsets.length ? offsets : null
    this.scheduleRender()
  }

  setGhostAnchor(anchor: AnchorMode): void {
    this.ghostAnchor = anchor === 'corner' ? 'corner' : 'center'
    this.scheduleRender()
  }

  setMode(mode: InteractionMode): void {
    this.mode = mode === 'inspect' ? 'inspect' : 'spawn'
    this.scheduleRender()
  }

  spawn(
    rows: string[],
    x: number,
    y: number,
    options: SpawnOptions = {},
  ): void {
    const offsets = patternOffsets(rows, options)
    if (!offsets.length) return

    const origin = anchorToOrigin(x, y, offsets, options.anchor ?? 'corner')
    for (const [dx, dy] of offsets) {
      this.alive.add(pack(origin.x + dx, origin.y + dy))
    }

    this.scheduleRender()
    this._emit()
  }

  /** Restore the initial seeded view (generation 0). */
  resetToSeed(options: { render?: boolean } = {}): void {
    this.alive = cloneAlive(this.seedAlive)
    this.history = []
    this.generation = 0
    this._centerOnAlive(this.alive)
    if (options.render !== false) this.scheduleRender()
    this._emit()
  }

  /** Advance one generation. Safe to spam; paint is debounced. */
  next(): void {
    this.history.push(cloneAlive(this.alive))
    if (this.history.length > HISTORY_LIMIT) this.history.shift()
    this.alive = stepAlive(this.alive)
    this.generation += 1
    this.scheduleRender()
    this._emit()
  }

  /** Step back one generation when history exists. */
  prev(): boolean {
    if (!this.history.length) return false
    this.alive = this.history.pop()!
    this.generation -= 1
    this.scheduleRender()
    this._emit()
    return true
  }

  /**
   * Game tick: advance when enough time has elapsed.
   * @returns leftover ms
   */
  update(dt: number, interval: number): number {
    if (!this.running) return 0

    let acc = this._acc + dt
    let steps = 0
    const maxSteps = 32

    while (acc >= interval && steps < maxSteps) {
      this.history.push(cloneAlive(this.alive))
      if (this.history.length > HISTORY_LIMIT) this.history.shift()
      this.alive = stepAlive(this.alive)
      this.generation += 1
      acc -= interval
      steps += 1
    }

    this._acc = acc

    if (steps) {
      this.scheduleRender()
      this._emit()
    }

    return acc
  }

  /** Coalesce rapid next/prev/update paints into one animation frame. */
  scheduleRender(): void {
    if (this._renderQueued) return
    this._renderQueued = true
    requestAnimationFrame(() => {
      this._renderQueued = false
      this.render()
    })
  }

  render(): void {
    const { canvas, ctx, cellSize } = this
    const dpr = window.devicePixelRatio || 1
    const cssW = canvas.clientWidth
    const cssH = canvas.clientHeight
    if (cssW < 1 || cssH < 1) return

    const pixelW = Math.floor(cssW * dpr)
    const pixelH = Math.floor(cssH * dpr)
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW
      canvas.height = pixelH
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = this.background
    ctx.fillRect(0, 0, cssW, cssH)

    const cols = Math.ceil(cssW / cellSize) + 1
    const rows = Math.ceil(cssH / cellSize) + 1
    const ox = Math.floor(this.originX - cols / 2)
    const oy = Math.floor(this.originY - rows / 2)

    if (this.showGrid) {
      ctx.strokeStyle = this._gridColor()
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let c = 0; c <= cols; c++) {
        const px = Math.round(c * cellSize) + 0.5
        ctx.moveTo(px, 0)
        ctx.lineTo(px, cssH)
      }
      for (let r = 0; r <= rows; r++) {
        const py = Math.round(r * cellSize) + 0.5
        ctx.moveTo(0, py)
        ctx.lineTo(cssW, py)
      }
      ctx.stroke()
    }

    ctx.fillStyle = this.foreground
    for (const key of this.alive) {
      const [x, y] = unpack(key)
      const sx = (x - ox) * cellSize
      const sy = (y - oy) * cellSize
      if (sx + cellSize < 0 || sy + cellSize < 0 || sx > cssW || sy > cssH)
        continue
      ctx.fillRect(sx, sy, cellSize, cellSize)
    }

    // Spawn mode: pattern ghost. Inspect mode: single-cell highlight.
    if (this.mode === 'spawn' && this.hoverCell && this.ghostTemplate?.length) {
      const origin = anchorToOrigin(
        this.hoverCell.x,
        this.hoverCell.y,
        this.ghostTemplate,
        this.ghostAnchor,
      )
      let minDx = Infinity
      let minDy = Infinity
      let maxDx = -Infinity
      let maxDy = -Infinity

      ctx.fillStyle = 'rgba(59, 130, 246, 0.38)'
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)'
      ctx.lineWidth = 1
      for (const [dx, dy] of this.ghostTemplate) {
        minDx = Math.min(minDx, dx)
        minDy = Math.min(minDy, dy)
        maxDx = Math.max(maxDx, dx)
        maxDy = Math.max(maxDy, dy)
        const sx = (origin.x + dx - ox) * cellSize
        const sy = (origin.y + dy - oy) * cellSize
        if (sx + cellSize < 0 || sy + cellSize < 0 || sx > cssW || sy > cssH)
          continue
        ctx.fillRect(sx, sy, cellSize, cellSize)
        ctx.strokeRect(sx + 0.5, sy + 0.5, cellSize - 1, cellSize - 1)
      }

      const boxX = (origin.x + minDx - ox) * cellSize
      const boxY = (origin.y + minDy - oy) * cellSize
      const boxW = (maxDx - minDx + 1) * cellSize
      const boxH = (maxDy - minDy + 1) * cellSize
      ctx.strokeStyle = 'rgba(37, 99, 235, 0.95)'
      ctx.lineWidth = Math.max(2, Math.min(3, cellSize / 4))
      ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1)
    } else if (this.hoverCell) {
      const hx = (this.hoverCell.x - ox) * cellSize
      const hy = (this.hoverCell.y - oy) * cellSize
      if (
        hx + cellSize >= 0 &&
        hy + cellSize >= 0 &&
        hx <= cssW &&
        hy <= cssH
      ) {
        const alive = this.alive.has(pack(this.hoverCell.x, this.hoverCell.y))
        ctx.fillStyle = alive
          ? 'rgba(255, 220, 60, 0.45)'
          : 'rgba(59, 130, 246, 0.35)'
        ctx.fillRect(hx, hy, cellSize, cellSize)
        ctx.strokeStyle = alive
          ? 'rgba(255, 200, 0, 0.95)'
          : 'rgba(37, 99, 235, 0.95)'
        ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 6))
        ctx.strokeRect(hx + 0.5, hy + 0.5, cellSize - 1, cellSize - 1)
      }
    }
  }

  setHoverCell(cell: Point | null): void {
    const prev = this.hoverCell
    const same =
      (!prev && !cell) ||
      (prev && cell && prev.x === cell.x && prev.y === cell.y)
    if (same) return
    this.hoverCell = cell ? { x: cell.x, y: cell.y } : null
    this.scheduleRender()
  }

  resize(): void {
    this.scheduleRender()
  }

  /** Top-left world cell currently mapped to canvas (0, 0). */
  viewOrigin(): Point {
    const cssW = this.canvas.clientWidth
    const cssH = this.canvas.clientHeight
    const cols = Math.ceil(cssW / this.cellSize) + 1
    const rows = Math.ceil(cssH / this.cellSize) + 1
    return {
      x: Math.floor(this.originX - cols / 2),
      y: Math.floor(this.originY - rows / 2),
    }
  }

  /** Map a mouse event on the canvas to world cell coordinates. */
  cellAtEvent(event: MouseEvent): Point | null {
    const rect = this.canvas.getBoundingClientRect()
    const localX = event.clientX - rect.left
    const localY = event.clientY - rect.top
    if (
      localX < 0 ||
      localY < 0 ||
      localX >= rect.width ||
      localY >= rect.height
    ) {
      return null
    }
    const origin = this.viewOrigin()
    return {
      x: origin.x + Math.floor(localX / this.cellSize),
      y: origin.y + Math.floor(localY / this.cellSize),
    }
  }

  private _centerOnAlive(alive: AliveSet): void {
    if (!alive.size) {
      this.originX = 0
      this.originY = 0
      return
    }
    const { minX, minY, maxX, maxY } = bbox(alive)
    this.originX = (minX + maxX + 1) / 2
    this.originY = (minY + maxY + 1) / 2
  }

  private _gridColor(): string {
    const bg = this.background.trim()
    if (bg.startsWith('#') && bg.length >= 7) {
      const r = Number.parseInt(bg.slice(1, 3), 16)
      const g = Number.parseInt(bg.slice(3, 5), 16)
      const b = Number.parseInt(bg.slice(5, 7), 16)
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      return luma > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
    }
    return 'rgba(127,127,127,0.35)'
  }

  private _emit(): void {
    this._onChange?.(this)
  }
}
