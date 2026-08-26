import {
  type AnchorMode,
  anchorToOrigin,
  type Offset,
  type Point,
} from '@conway/geom'

import type { Camera } from '@/life/camera.ts'
import { type AliveSet, pack, unpack } from '@/life/cells.ts'
import type { PatternHit } from '@/life/identify.ts'
import { viewBounds } from '@/life/view.ts'

type PaintView = {
  cssW: number
  cssH: number
  cellSize: number
  cols: number
  rows: number
  ox: number
  oy: number
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
  ghostTemplate: Offset[] | null
  ghostAnchor: AnchorMode
}

function cellOffscreen(
  sx: number,
  sy: number,
  cellSize: number,
  cssW: number,
  cssH: number,
): boolean {
  return sx + cellSize < 0 || sy + cellSize < 0 || sx > cssW || sy > cssH
}

function paintCellRect(
  ctx: CanvasRenderingContext2D,
  view: PaintView,
  worldX: number,
  worldY: number,
): void {
  const { cssW, cssH, cellSize, ox, oy } = view
  const sx = (worldX - ox) * cellSize
  const sy = (worldY - oy) * cellSize
  if (cellOffscreen(sx, sy, cellSize, cssW, cssH)) return
  ctx.fillRect(sx, sy, cellSize, cellSize)
  ctx.strokeRect(sx + 0.5, sy + 0.5, cellSize - 1, cellSize - 1)
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
  const { cssW, cssH, cellSize, ox, oy } = view
  // World (0, 0) in continuous canvas space.
  const sx = (0 - ox) * cellSize
  const sy = (0 - oy) * cellSize
  const color = originColor(frame.background)
  const arm = Math.max(6, cellSize * 0.75)

  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 8))
  ctx.beginPath()
  ctx.moveTo(0, sy + 0.5)
  ctx.lineTo(cssW, sy + 0.5)
  ctx.moveTo(sx + 0.5, 0)
  ctx.lineTo(sx + 0.5, cssH)
  ctx.stroke()

  // Small crosshair tick at the origin so it reads even when axes are off-screen.
  if (sx >= -arm && sx <= cssW + arm && sy >= -arm && sy <= cssH + arm) {
    ctx.beginPath()
    ctx.moveTo(sx - arm, sy + 0.5)
    ctx.lineTo(sx + arm, sy + 0.5)
    ctx.moveTo(sx + 0.5, sy - arm)
    ctx.lineTo(sx + 0.5, sy + arm)
    ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(sx, sy, Math.max(1.5, cellSize / 10), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function beginFrame(frame: PaintFrame): PaintView | null {
  const { canvas, ctx, camera } = frame
  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth
  const cssH = canvas.clientHeight
  if (cssW < 1 || cssH < 1) return null

  const pixelW = Math.floor(cssW * dpr)
  const pixelH = Math.floor(cssH * dpr)
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = frame.background
  ctx.fillRect(0, 0, cssW, cssH)

  const {
    cols,
    rows,
    minX: ox,
    minY: oy,
  } = viewBounds(camera.originX, camera.originY, cssW, cssH, camera.cellSize)
  return {
    cssW,
    cssH,
    cellSize: camera.cellSize,
    cols,
    rows,
    ox,
    oy,
  }
}

function paintGrid(frame: PaintFrame, view: PaintView): void {
  if (!frame.showGrid) return
  const { ctx } = frame
  const { cssW, cssH, cellSize, cols, rows } = view

  ctx.strokeStyle = gridColor(frame.background)
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

function paintAlive(frame: PaintFrame, view: PaintView): void {
  const { ctx, alive } = frame
  const { cssW, cssH, cellSize, ox, oy } = view
  ctx.fillStyle = frame.foreground
  for (const key of alive) {
    const [x, y] = unpack(key)
    const sx = (x - ox) * cellSize
    const sy = (y - oy) * cellSize
    if (cellOffscreen(sx, sy, cellSize, cssW, cssH)) continue
    ctx.fillRect(sx, sy, cellSize, cellSize)
  }
}

function paintGhost(
  frame: PaintFrame,
  view: PaintView,
  hover: Point,
  offsets: Offset[],
): void {
  const { ctx } = frame
  const { cellSize, ox, oy } = view
  const origin = anchorToOrigin(hover.x, hover.y, offsets, frame.ghostAnchor)
  let minDx = Infinity
  let minDy = Infinity
  let maxDx = -Infinity
  let maxDy = -Infinity

  ctx.fillStyle = 'rgba(59, 130, 246, 0.38)'
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.55)'
  ctx.lineWidth = 1
  for (const [dx, dy] of offsets) {
    minDx = Math.min(minDx, dx)
    minDy = Math.min(minDy, dy)
    maxDx = Math.max(maxDx, dx)
    maxDy = Math.max(maxDy, dy)
    paintCellRect(ctx, view, origin.x + dx, origin.y + dy)
  }

  const boxX = (origin.x + minDx - ox) * cellSize
  const boxY = (origin.y + minDy - oy) * cellSize
  const boxW = (maxDx - minDx + 1) * cellSize
  const boxH = (maxDy - minDy + 1) * cellSize
  ctx.strokeStyle = 'rgba(37, 99, 235, 0.95)'
  ctx.lineWidth = Math.max(2, Math.min(3, cellSize / 4))
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1)
}

function paintHover(frame: PaintFrame, view: PaintView, hover: Point): void {
  const { ctx, alive } = frame
  const { cssW, cssH, cellSize, ox, oy } = view
  const hx = (hover.x - ox) * cellSize
  const hy = (hover.y - oy) * cellSize
  if (cellOffscreen(hx, hy, cellSize, cssW, cssH)) return

  const isAlive = alive.has(pack(hover.x, hover.y))
  ctx.fillStyle = isAlive
    ? 'rgba(255, 220, 60, 0.45)'
    : 'rgba(59, 130, 246, 0.35)'
  ctx.fillRect(hx, hy, cellSize, cellSize)
  ctx.strokeStyle = isAlive
    ? 'rgba(255, 200, 0, 0.95)'
    : 'rgba(37, 99, 235, 0.95)'
  ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 6))
  ctx.strokeRect(hx + 0.5, hy + 0.5, cellSize - 1, cellSize - 1)
}

function paintMatch(frame: PaintFrame, view: PaintView, hit: PatternHit): void {
  const { ctx } = frame
  ctx.fillStyle = 'rgba(34, 197, 94, 0.28)'
  ctx.strokeStyle = 'rgba(22, 163, 74, 0.95)'
  ctx.lineWidth = Math.max(1.5, Math.min(2.5, view.cellSize / 5))
  for (const cell of hit.cells) paintCellRect(ctx, view, cell.x, cell.y)
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
