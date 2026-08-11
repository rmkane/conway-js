import {
  type AnchorMode,
  anchorToOrigin,
  type Offset,
  type Point,
} from '@conway/geom'

import { type AliveSet, pack, unpack } from '@/life/cells.ts'

type PaintView = {
  cssW: number
  cssH: number
  cellSize: number
  cols: number
  rows: number
  ox: number
  oy: number
}

/** Snapshot of engine state needed to paint one frame. */
export type PaintScene = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  cellSize: number
  foreground: string
  background: string
  showGrid: boolean
  originX: number
  originY: number
  alive: AliveSet
  mode: 'inspect' | 'spawn'
  hoverCell: Point | null
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

function gridColor(background: string): string {
  const bg = background.trim()
  if (bg.startsWith('#') && bg.length >= 7) {
    const r = Number.parseInt(bg.slice(1, 3), 16)
    const g = Number.parseInt(bg.slice(3, 5), 16)
    const b = Number.parseInt(bg.slice(5, 7), 16)
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    return luma > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.18)'
  }
  return 'rgba(127,127,127,0.35)'
}

function beginFrame(scene: PaintScene): PaintView | null {
  const { canvas, ctx, cellSize } = scene
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
  ctx.fillStyle = scene.background
  ctx.fillRect(0, 0, cssW, cssH)

  const cols = Math.ceil(cssW / cellSize) + 1
  const rows = Math.ceil(cssH / cellSize) + 1
  return {
    cssW,
    cssH,
    cellSize,
    cols,
    rows,
    ox: Math.floor(scene.originX - cols / 2),
    oy: Math.floor(scene.originY - rows / 2),
  }
}

function paintGrid(scene: PaintScene, view: PaintView): void {
  if (!scene.showGrid) return
  const { ctx } = scene
  const { cssW, cssH, cellSize, cols, rows } = view
  ctx.strokeStyle = gridColor(scene.background)
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

function paintAlive(scene: PaintScene, view: PaintView): void {
  const { ctx, alive } = scene
  const { cssW, cssH, cellSize, ox, oy } = view
  ctx.fillStyle = scene.foreground
  for (const key of alive) {
    const [x, y] = unpack(key)
    const sx = (x - ox) * cellSize
    const sy = (y - oy) * cellSize
    if (cellOffscreen(sx, sy, cellSize, cssW, cssH)) continue
    ctx.fillRect(sx, sy, cellSize, cellSize)
  }
}

function paintGhost(
  scene: PaintScene,
  view: PaintView,
  hover: Point,
  offsets: Offset[],
): void {
  const { ctx } = scene
  const { cssW, cssH, cellSize, ox, oy } = view
  const origin = anchorToOrigin(hover.x, hover.y, offsets, scene.ghostAnchor)
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
    const sx = (origin.x + dx - ox) * cellSize
    const sy = (origin.y + dy - oy) * cellSize
    if (cellOffscreen(sx, sy, cellSize, cssW, cssH)) continue
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
}

function paintHover(scene: PaintScene, view: PaintView, hover: Point): void {
  const { ctx, alive } = scene
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

function paintOverlay(scene: PaintScene, view: PaintView): void {
  if (
    scene.mode === 'spawn' &&
    scene.hoverCell &&
    scene.ghostTemplate?.length
  ) {
    paintGhost(scene, view, scene.hoverCell, scene.ghostTemplate)
    return
  }
  if (scene.hoverCell) paintHover(scene, view, scene.hoverCell)
}

/** Paint one Life frame from a scene snapshot. */
export function paintLife(scene: PaintScene): void {
  const view = beginFrame(scene)
  if (!view) return
  paintGrid(scene, view)
  paintAlive(scene, view)
  paintOverlay(scene, view)
}
