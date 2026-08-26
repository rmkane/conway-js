import {
  add,
  boundsFrom,
  centerOf,
  clampOrigin,
  contains,
  div,
  floor,
  type GridBounds,
  mul,
  type Point,
  scale,
  sub,
  vec,
  viewBounds,
  ZERO,
} from '@conway/geom'

import { type AliveSet, bbox } from '@/life/cells.ts'

/** What you're looking through: pan + zoom over the scene. */
export type Camera = {
  /** World point pinned to the CSS canvas center. */
  origin: Point
  cellSize: number
}

export function createCamera(cellSize = 8): Camera {
  return {
    origin: ZERO,
    cellSize: Math.max(1, Math.round(cellSize)),
  }
}

export function setCameraZoom(camera: Camera, cellSize: number): void {
  camera.cellSize = Math.max(1, Math.round(cellSize))
}

/** Canvas CSS size as a point (`clientWidth` × `clientHeight`). */
export function canvasCssSize(canvas: HTMLCanvasElement): Point {
  return vec(canvas.clientWidth, canvas.clientHeight)
}

/**
 * Map a client (viewport) point onto the canvas's CSS pixel space.
 * Scales by `clientWidth/Height` vs the layout rect when they differ.
 */
export function clientToLocal(canvas: HTMLCanvasElement, client: Point): Point {
  const rect = canvas.getBoundingClientRect()
  const offset = sub(client, vec(rect.left, rect.top))
  const layout = vec(rect.width, rect.height)
  if (layout.x <= 0 || layout.y <= 0) return offset
  return mul(div(offset, layout), canvasCssSize(canvas))
}

/**
 * Zoom so the world point under `local` (CSS canvas coords) stays put.
 */
export function zoomCameraAt(
  camera: Camera,
  cellSize: number,
  local: Point,
  cssSize: Point,
): void {
  const nextSize = Math.max(1, Math.round(cellSize))
  if (nextSize === camera.cellSize) return
  if (cssSize.x < 1 || cssSize.y < 1) {
    setCameraZoom(camera, nextSize)
    return
  }

  const canvasCenter = scale(cssSize, 0.5)
  const focus = add(
    camera.origin,
    scale(sub(local, canvasCenter), 1 / camera.cellSize),
  )

  setCameraZoom(camera, nextSize)
  camera.origin = sub(
    focus,
    scale(sub(local, canvasCenter), 1 / camera.cellSize),
  )
}

/** Drag right → content follows (origin moves left). `delta` is screen pixels. */
export function panCamera(camera: Camera, delta: Point): void {
  if (!delta.x && !delta.y) return
  camera.origin = sub(camera.origin, scale(delta, 1 / camera.cellSize))
}

/** Aim the camera at world (0, 0). */
export function centerCameraOnOrigin(camera: Camera): void {
  camera.origin = ZERO
}

/** Aim the camera at the live population (or world origin if empty). */
export function centerCameraOnAlive(camera: Camera, alive: AliveSet): void {
  if (!alive.size) {
    centerCameraOnOrigin(camera)
    return
  }
  camera.origin = centerOf(bbox(alive))
}

/** Keep the current zoom window over the scene bounds. */
export function clampCamera(
  camera: Camera,
  bounds: GridBounds,
  cssSize: Point,
): void {
  if (cssSize.x < 1 || cssSize.y < 1) return
  camera.origin = clampOrigin(camera.origin, bounds, cssSize, camera.cellSize)
}

/** Top-left world cell mapped to canvas (0, 0). */
export function cameraViewOrigin(camera: Camera, cssSize: Point): Point {
  return viewBounds(camera.origin, cssSize, camera.cellSize).min
}

/** Map a client point on the canvas to a world cell, or null if outside. */
export function cellAtClient(
  camera: Camera,
  canvas: HTMLCanvasElement,
  client: Point,
): Point | null {
  const rect = canvas.getBoundingClientRect()
  const layoutLocal = sub(client, vec(rect.left, rect.top))
  const layoutBounds = boundsFrom(ZERO, vec(rect.width, rect.height))
  if (!contains(layoutBounds, layoutLocal)) return null

  const cssSize = canvasCssSize(canvas)
  const local = clientToLocal(canvas, client)
  const origin = cameraViewOrigin(camera, cssSize)
  return floor(add(origin, scale(local, 1 / camera.cellSize)))
}
