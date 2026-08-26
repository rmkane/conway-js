import type { Point } from '@conway/geom'

import { type AliveSet, bbox } from '@/life/cells.ts'
import { clampOrigin, type ViewBounds, viewBounds } from '@/life/view.ts'

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
 * Canvas-local coordinates in the same CSS pixel space as `cssW`/`cssH`.
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
  if (nextSize === camera.cellSize) return
  if (cssW < 1 || cssH < 1) {
    setCameraZoom(camera, nextSize)
    return
  }

  // Camera origin is the world point at the CSS canvas center.
  const focusX = camera.originX + (localX - cssW / 2) / camera.cellSize
  const focusY = camera.originY + (localY - cssH / 2) / camera.cellSize

  setCameraZoom(camera, nextSize)
  camera.originX = focusX - (localX - cssW / 2) / camera.cellSize
  camera.originY = focusY - (localY - cssH / 2) / camera.cellSize
}

/** Drag right → content follows (origin moves left). */
export function panCamera(camera: Camera, dxPx: number, dyPx: number): void {
  if (!dxPx && !dyPx) return
  camera.originX -= dxPx / camera.cellSize
  camera.originY -= dyPx / camera.cellSize
}

/** Aim the camera at world (0, 0). */
export function centerCameraOnOrigin(camera: Camera): void {
  camera.originX = 0
  camera.originY = 0
}

/** Aim the camera at the live population (or world origin if empty). */
export function centerCameraOnAlive(camera: Camera, alive: AliveSet): void {
  if (!alive.size) {
    centerCameraOnOrigin(camera)
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
    x: Math.floor(origin.x + localX / camera.cellSize),
    y: Math.floor(origin.y + localY / camera.cellSize),
  }
}
