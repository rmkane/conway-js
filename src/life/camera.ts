import type { Point } from '@conway/geom'

import { type AliveSet, bbox } from '@/life/cells.ts'
import {
  clampOrigin,
  type ViewBounds,
  viewBounds,
  viewCellCounts,
} from '@/life/view.ts'

/** What you're looking through: pan + zoom over the scene. */
export type Camera = {
  originX: number
  originY: number
  cellSize: number
}

export function createCamera(cellSize = 8): Camera {
  return {
    originX: 0,
    originY: 0,
    cellSize: Math.max(1, Math.round(cellSize)),
  }
}

export function setCameraZoom(camera: Camera, cellSize: number): void {
  camera.cellSize = Math.max(1, Math.round(cellSize))
}

/**
 * Zoom so the world point under `(localX, localY)` stays put.
 * Canvas-local coordinates; origin is top-left of the CSS canvas.
 */
export function zoomCameraAt(
  camera: Camera,
  cellSize: number,
  localX: number,
  localY: number,
  cssW: number,
  cssH: number,
): void {
  const nextSize = Math.max(1, Math.round(cellSize))
  if (cssW < 1 || cssH < 1) {
    setCameraZoom(camera, nextSize)
    return
  }

  const before = viewBounds(
    camera.originX,
    camera.originY,
    cssW,
    cssH,
    camera.cellSize,
  )
  const focusX = before.minX + localX / camera.cellSize
  const focusY = before.minY + localY / camera.cellSize

  setCameraZoom(camera, nextSize)
  const { cols, rows } = viewCellCounts(cssW, cssH, camera.cellSize)
  camera.originX = focusX - localX / camera.cellSize + cols / 2
  camera.originY = focusY - localY / camera.cellSize + rows / 2
}

/** Drag right → content follows (origin moves left). */
export function panCamera(camera: Camera, dxPx: number, dyPx: number): void {
  if (!dxPx && !dyPx) return
  camera.originX -= dxPx / camera.cellSize
  camera.originY -= dyPx / camera.cellSize
}

/** Aim the camera at the live population (or world origin if empty). */
export function centerCameraOnAlive(camera: Camera, alive: AliveSet): void {
  if (!alive.size) {
    camera.originX = 0
    camera.originY = 0
    return
  }
  const { minX, minY, maxX, maxY } = bbox(alive)
  camera.originX = (minX + maxX + 1) / 2
  camera.originY = (minY + maxY + 1) / 2
}

/** Keep the current zoom window over the scene bounds. */
export function clampCamera(
  camera: Camera,
  bounds: ViewBounds,
  cssW: number,
  cssH: number,
): void {
  if (cssW < 1 || cssH < 1) return
  const next = clampOrigin(
    camera.originX,
    camera.originY,
    bounds,
    cssW,
    cssH,
    camera.cellSize,
  )
  camera.originX = next.originX
  camera.originY = next.originY
}

/** Top-left world cell mapped to canvas (0, 0). */
export function cameraViewOrigin(
  camera: Camera,
  cssW: number,
  cssH: number,
): Point {
  const b = viewBounds(
    camera.originX,
    camera.originY,
    cssW,
    cssH,
    camera.cellSize,
  )
  return { x: b.minX, y: b.minY }
}

/** Map a client point on the canvas to a world cell, or null if outside. */
export function cellAtClient(
  camera: Camera,
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Point | null {
  const rect = canvas.getBoundingClientRect()
  const localX = clientX - rect.left
  const localY = clientY - rect.top
  if (
    localX < 0 ||
    localY < 0 ||
    localX >= rect.width ||
    localY >= rect.height
  ) {
    return null
  }
  const origin = cameraViewOrigin(
    camera,
    canvas.clientWidth,
    canvas.clientHeight,
  )
  return {
    x: origin.x + Math.floor(localX / camera.cellSize),
    y: origin.y + Math.floor(localY / camera.cellSize),
  }
}
