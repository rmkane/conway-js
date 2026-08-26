import {
  type AnchorMode,
  add,
  anchorToOrigin,
  boundsFrom,
  boundsOf,
  contains,
  overlaps,
  type Point,
  scale,
  sizeOf,
  sub,
  vec,
  viewBounds,
  ZERO,
} from '@conway/geom'

import type { Camera } from '@/life/camera.ts'
import { type AliveSet, packPoint, unpack } from '@/life/cells.ts'
import type { PatternHit } from '@/life/identify.ts'

type PaintView = {
  css: Point
  cellSize: number
  cols: number
  rows: number
  /** World point mapped to canvas (0, 0). */
  origin: Point
}

/** One frame: scene content + camera + interaction overlays. */
export type PaintFrame = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  camera: Camera
  alive: AliveSet
  foreground: string
  background: string
  showGrid: boolean
  showOrigin: boolean
  mode: 'inspect' | 'spawn'
  hoverCell: Point | null
  hoverMatch: PatternHit | null
  ghostTemplate: Point[] | null
  ghostAnchor: AnchorMode
}

function worldToScreen(view: PaintView, world: Point): Point {
  return scale(sub(world, view.origin), view.cellSize)
}

function cellScreenBounds(view: PaintView, world: Point) {
  return boundsFrom(
    worldToScreen(view, world),
    vec(view.cellSize, view.cellSize),
  )
}

function canvasBounds(view: PaintView) {
  return boundsFrom(ZERO, view.css)
}

function cellOffscreen(view: PaintView, world: Point): boolean {
  return !overlaps(cellScreenBounds(view, world), canvasBounds(view))
}

function paintCellRect(
  ctx: CanvasRenderingContext2D,
  view: PaintView,
  world: Point,
): void {
  if (cellOffscreen(view, world)) return
  const screen = worldToScreen(view, world)
  const { cellSize } = view
  ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
  ctx.strokeRect(screen.x + 0.5, screen.y + 0.5, cellSize - 1, cellSize - 1)
}

function bgLuma(background: string): number | null {
  const bg = background.trim()
  if (!bg.startsWith('#') || bg.length < 7) return null
  const r = Number.parseInt(bg.slice(1, 3), 16)
  const g = Number.parseInt(bg.slice(3, 5), 16)
  const b = Number.parseInt(bg.slice(5, 7), 16)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

function gridColor(background: string): string {
  const luma = bgLuma(background)
  if (luma == null) return 'rgba(127,127,127,0.35)'
  return luma > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
}

function originColor(background: string): string {
  const luma = bgLuma(background)
  if (luma == null) return 'rgba(220,38,38,0.7)'
  return luma > 0.5 ? 'rgba(185,28,28,0.75)' : 'rgba(248,113,113,0.85)'
}

function paintOrigin(frame: PaintFrame, view: PaintView): void {
  if (!frame.showOrigin) return
  const { ctx } = frame
  const { css, cellSize } = view
  const screen = worldToScreen(view, ZERO)
  const color = originColor(frame.background)
  const arm = Math.max(6, cellSize * 0.75)
  const hitBounds = boundsFrom(vec(-arm, -arm), add(css, vec(2 * arm, 2 * arm)))

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 8))
  ctx.beginPath()
  ctx.moveTo(0, screen.y + 0.5)
  ctx.lineTo(css.x, screen.y + 0.5)
  ctx.moveTo(screen.x + 0.5, 0)
  ctx.lineTo(screen.x + 0.5, css.y)
  ctx.stroke()

  if (contains(hitBounds, screen)) {
    ctx.beginPath()
    ctx.moveTo(screen.x - arm, screen.y + 0.5)
    ctx.lineTo(screen.x + arm, screen.y + 0.5)
    ctx.moveTo(screen.x + 0.5, screen.y - arm)
    ctx.lineTo(screen.x + 0.5, screen.y + arm)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, Math.max(1.5, cellSize / 10), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function beginFrame(frame: PaintFrame): PaintView | null {
  const { canvas, ctx, camera } = frame
  const dpr = window.devicePixelRatio || 1
  const css = vec(canvas.clientWidth, canvas.clientHeight)
  if (css.x < 1 || css.y < 1) return null

  const pixel = scale(css, dpr)
  const pixelW = Math.floor(pixel.x)
  const pixelH = Math.floor(pixel.y)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = frame.background
  ctx.fillRect(0, 0, css.x, css.y)

  const grid = viewBounds(camera.origin, css, camera.cellSize)
  return {
    css,
    cellSize: camera.cellSize,
    cols: grid.cols,
    rows: grid.rows,
    origin: grid.min,
  }
}

function paintGrid(frame: PaintFrame, view: PaintView): void {
  if (!frame.showGrid) return
  const { ctx } = frame
  const { css, cellSize, cols, rows } = view

  ctx.strokeStyle = gridColor(frame.background)
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let c = 0; c <= cols; c++) {
    const px = Math.round(c * cellSize) + 0.5
    ctx.moveTo(px, 0)
    ctx.lineTo(px, css.y)
  }
  for (let r = 0; r <= rows; r++) {
    const py = Math.round(r * cellSize) + 0.5
    ctx.moveTo(0, py)
    ctx.lineTo(css.x, py)
  }
  ctx.stroke()
}

function paintAlive(frame: PaintFrame, view: PaintView): void {
  const { ctx, alive } = frame
  ctx.fillStyle = frame.foreground
  for (const key of alive) {
    const cell = unpack(key)
    if (cellOffscreen(view, cell)) continue
    const screen = worldToScreen(view, cell)
    ctx.fillRect(screen.x, screen.y, view.cellSize, view.cellSize)
  }
}

function paintGhost(
  frame: PaintFrame,
  view: PaintView,
  hover: Point,
  offsets: Point[],
): void {
  const { ctx } = frame
  const origin = anchorToOrigin(hover, offsets, frame.ghostAnchor)

  ctx.fillStyle = 'rgba(59, 130, 246, 0.38)'
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)'
  ctx.lineWidth = 1
  for (const d of offsets) {
    paintCellRect(ctx, view, add(origin, d))
  }

  const localBox = boundsOf(offsets)
  const worldMin = add(origin, localBox.min)
  const screen = worldToScreen(view, worldMin)
  const box = scale(sizeOf(localBox), view.cellSize)
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.95)'
  ctx.lineWidth = Math.max(2, Math.min(3, view.cellSize / 4))
  ctx.strokeRect(screen.x + 0.5, screen.y + 0.5, box.x - 1, box.y - 1)
}

function paintHover(frame: PaintFrame, view: PaintView, hover: Point): void {
  const { ctx, alive } = frame
  if (cellOffscreen(view, hover)) return
  const screen = worldToScreen(view, hover)
  const { cellSize } = view

  const isAlive = alive.has(packPoint(hover))
  ctx.fillStyle = isAlive
    ? 'rgba(255, 220, 60, 0.45)'
    : 'rgba(59, 130, 246, 0.35)'
  ctx.fillRect(screen.x, screen.y, cellSize, cellSize)
  ctx.strokeStyle = isAlive
    ? 'rgba(255, 200, 0, 0.95)'
    : 'rgba(37, 99, 235, 0.95)'
  ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 6))
  ctx.strokeRect(screen.x + 0.5, screen.y + 0.5, cellSize - 1, cellSize - 1)
}

function paintMatch(frame: PaintFrame, view: PaintView, hit: PatternHit): void {
  const { ctx } = frame
  ctx.fillStyle = 'rgba(34, 197, 94, 0.28)'
  ctx.strokeStyle = 'rgba(22, 163, 74, 0.95)'
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, view.cellSize / 5))
  for (const cell of hit.cells) paintCellRect(ctx, view, cell)
}

function paintOverlay(frame: PaintFrame, view: PaintView): void {
  if (
    frame.mode === 'spawn' &&
    frame.hoverCell &&
    frame.ghostTemplate?.length
  ) {
    paintGhost(frame, view, frame.hoverCell, frame.ghostTemplate)
    return
  }
  if (frame.hoverMatch) {
    paintMatch(frame, view, frame.hoverMatch)
    return
  }
  if (frame.hoverCell) paintHover(frame, view, frame.hoverCell)
}

/** Paint one Life frame from scene + camera + overlays. */
export function paintLife(frame: PaintFrame): void {
  const view = beginFrame(frame)
  if (!view) return
  paintGrid(frame, view)
  paintAlive(frame, view)
  paintOrigin(frame, view)
  paintOverlay(frame, view)
}
