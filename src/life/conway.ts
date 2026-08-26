import {
  type AnchorMode,
  type Offset,
  type Point,
  type TransformOptions,
} from '@conway/geom'

import {
  type Camera,
  cellAtClient,
  centerCameraOnAlive,
  centerCameraOnOrigin,
  clampCamera,
  createCamera,
  panCamera,
  setCameraZoom,
  zoomCameraAt,
} from '@/life/camera.ts'
import { CATALOG_INDEX, identifyAt, type PatternHit } from '@/life/identify.ts'
import { paintLife } from '@/life/paint.ts'
import { patternOffsets } from '@/life/pattern.ts'
import { randomSoup } from '@/life/rng.ts'
import {
  clearScene,
  createScene,
  cullScene,
  resetScene,
  type Scene,
  type SpawnOptions,
  spawnInScene,
  stepScene,
  syncSceneBounds,
  undoScene,
} from '@/life/scene.ts'

export type { SpawnOptions } from '@/life/scene.ts'
export type { Camera } from '@/life/camera.ts'
export type { Scene } from '@/life/scene.ts'

export type InteractionMode = 'inspect' | 'spawn'

export interface ConwayOptions {
  cellSize?: number
  foreground?: string
  background?: string
  showGrid?: boolean
  showOrigin?: boolean
}

export interface RandomSeedOptions {
  width?: number
  height?: number
  density?: number
  render?: boolean
}

/**
 * Canvas Game of Life facade: owns a {@link Scene} (what exists) and a
 * {@link Camera} (what you see), plus interaction chrome and painting.
 */
export class Conway {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D

  readonly scene: Scene
  readonly camera: Camera

  foreground: string
  background: string
  showGrid: boolean
  showOrigin: boolean

  running = false
  hoverCell: Point | null = null
  /** Catalog match for the connected cluster under the hover cell (inspect). */
  hoverMatch: PatternHit | null = null
  /** Offsets from top-left for spawn ghost. */
  ghostTemplate: Offset[] | null = null
  ghostAnchor: AnchorMode = 'center'
  mode: InteractionMode = 'inspect'

  private _renderQueued = false
  private _onChange: ((game: Conway) => void) | null = null
  private _acc = 0

  constructor(canvas: HTMLCanvasElement, options: ConwayOptions = {}) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas context unavailable')

    this.canvas = canvas
    this.ctx = ctx
    this.scene = createScene()
    this.camera = createCamera(options.cellSize ?? 8)
    this.foreground = options.foreground ?? '#111111'
    this.background = options.background ?? '#ffffff'
    this.showGrid = options.showGrid ?? false
    this.showOrigin = options.showOrigin ?? false
  }

  onChange(fn: (game: Conway) => void): void {
    this._onChange = fn
  }

  get generation(): number {
    return this.scene.generation
  }

  get population(): number {
    return this.scene.alive.size
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

  /**
   * Change cell size. When `focus` is set (client coords on the canvas),
   * keep the world point under that pixel fixed (zoom-to-cursor).
   */
  setZoom(
    cellSize: number,
    focus?: Pick<MouseEvent, 'clientX' | 'clientY'>,
  ): void {
    const cssW = this.canvas.clientWidth
    const cssH = this.canvas.clientHeight
    if (focus && cssW >= 1 && cssH >= 1) {
      const rect = this.canvas.getBoundingClientRect()
      // Map client → CSS canvas space (rect size can differ from clientWidth).
      const localX =
        rect.width > 0
          ? ((focus.clientX - rect.left) / rect.width) * cssW
          : focus.clientX - rect.left
      const localY =
        rect.height > 0
          ? ((focus.clientY - rect.top) / rect.height) * cssH
          : focus.clientY - rect.top
      zoomCameraAt(this.camera, cellSize, localX, localY, cssW, cssH)
    } else {
      setCameraZoom(this.camera, cellSize)
    }
    this._clampCamera()
    this.scheduleRender()
  }

  /** Shift the camera by screen pixels (drag right → content follows). */
  panBy(dxPx: number, dyPx: number): void {
    panCamera(this.camera, dxPx, dyPx)
    this._clampCamera()
    this.scheduleRender()
  }

  setShowGrid(showGrid: boolean): void {
    this.showGrid = showGrid
    this.scheduleRender()
  }

  setShowOrigin(showOrigin: boolean): void {
    this.showOrigin = showOrigin
    this.scheduleRender()
  }

  /** Build a deterministic pseudo-random soup from a seed string/number/UUID. */
  setRandomSeed(
    seedKey: string | number,
    options: RandomSeedOptions = {},
  ): void {
    this.scene.seedKey = String(seedKey)
    this.scene.seedAlive = randomSoup(seedKey, options)
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
    this._refreshHoverMatch()
    this.scheduleRender()
  }

  spawn(
    rows: string[],
    x: number,
    y: number,
    options: SpawnOptions = {},
  ): void {
    this._syncWorld()
    spawnInScene(this.scene, rows, x, y, options)
    this.scheduleRender()
    this._emit()
  }

  /** Restore the initial seeded view (generation 0). */
  resetToSeed(options: { render?: boolean } = {}): void {
    this._syncWorld()
    resetScene(this.scene)
    centerCameraOnAlive(this.camera, this.scene.alive)
    this._clampCamera()
    if (options.render !== false) this.scheduleRender()
    this._emit()
  }

  /** Empty the board (keeps the random seed for Reset). */
  clear(options: { render?: boolean } = {}): void {
    clearScene(this.scene)
    centerCameraOnOrigin(this.camera)
    this._syncWorld()
    this._clampCamera()
    if (options.render !== false) this.scheduleRender()
    this._emit()
  }

  /** Snap the camera to world origin (0, 0). */
  centerView(): void {
    centerCameraOnOrigin(this.camera)
    this._clampCamera()
    this.scheduleRender()
  }

  /** Advance one generation. Safe to spam; paint is debounced. */
  next(): void {
    stepScene(this.scene)
    this.scheduleRender()
    this._emit()
  }

  /** Step back one generation when history exists. */
  prev(): boolean {
    if (!undoScene(this.scene)) return false
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
      stepScene(this.scene)
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
    this._syncWorld()
    paintLife({
      canvas: this.canvas,
      ctx: this.ctx,
      camera: this.camera,
      alive: this.scene.alive,
      foreground: this.foreground,
      background: this.background,
      showGrid: this.showGrid,
      showOrigin: this.showOrigin,
      mode: this.mode,
      hoverCell: this.hoverCell,
      hoverMatch: this.hoverMatch,
      ghostTemplate: this.ghostTemplate,
      ghostAnchor: this.ghostAnchor,
    })
  }

  setHoverCell(cell: Point | null): void {
    const prev = this.hoverCell
    const same =
      (!prev && !cell) ||
      (prev && cell && prev.x === cell.x && prev.y === cell.y)
    if (same) return
    this.hoverCell = cell ? { x: cell.x, y: cell.y } : null
    this._refreshHoverMatch()
    this.scheduleRender()
  }

  resize(): void {
    this._syncWorld()
    cullScene(this.scene)
    this._clampCamera()
    this.scheduleRender()
  }

  /** Map client coordinates on the canvas to world cell coordinates. */
  cellAtEvent(event: Pick<MouseEvent, 'clientX' | 'clientY'>): Point | null {
    return cellAtClient(this.camera, this.canvas, event.clientX, event.clientY)
  }

  private _syncWorld(): void {
    syncSceneBounds(
      this.scene,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
    )
  }

  private _clampCamera(): void {
    clampCamera(
      this.camera,
      this.scene.bounds,
      this.canvas.clientWidth,
      this.canvas.clientHeight,
    )
  }

  private _refreshHoverMatch(): void {
    if (this.mode !== 'inspect' || !this.hoverCell) {
      this.hoverMatch = null
      return
    }
    this.hoverMatch = identifyAt(
      this.scene.alive,
      this.hoverCell.x,
      this.hoverCell.y,
      CATALOG_INDEX,
    )
  }

  private _emit(): void {
    this._refreshHoverMatch()
    this._onChange?.(this)
  }
}
