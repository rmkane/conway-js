import { describe, expect, it } from 'vitest'

import {
  cameraViewOrigin,
  centerCameraOnAlive,
  clampCamera,
  createCamera,
  panCamera,
  setCameraZoom,
  zoomCameraAt,
} from '@/life/camera.ts'
import { pack } from '@/life/cells.ts'
import { viewBounds, worldFromCanvas } from '@/life/view.ts'

describe('camera', () => {
  it('pans in world cells from screen pixels', () => {
    const camera = createCamera(10)
    panCamera(camera, 20, -10)
    expect(camera.originX).toBe(-2)
    expect(camera.originY).toBe(1)
  })

  it('centers on the alive bbox', () => {
    const camera = createCamera()
    const alive = new Set([pack(0, 0), pack(2, 0), pack(0, 2), pack(2, 2)])
    centerCameraOnAlive(camera, alive)
    expect(camera.originX).toBe(1.5)
    expect(camera.originY).toBe(1.5)
  })

  it('clamps so the view stays over the world', () => {
    const camera = createCamera(10)
    camera.originX = 1000
    camera.originY = -1000
    const world = worldFromCanvas(100, 50)
    clampCamera(camera, world, 100, 50)
    const origin = cameraViewOrigin(camera, 100, 50)
    expect(origin.x).toBeGreaterThanOrEqual(world.minX)
    expect(origin.y).toBeGreaterThanOrEqual(world.minY)
  })

  it('setCameraZoom floors to a positive integer', () => {
    const camera = createCamera(8)
    setCameraZoom(camera, 12.7)
    expect(camera.cellSize).toBe(13)
    setCameraZoom(camera, 0)
    expect(camera.cellSize).toBe(1)
  })

  it('keeps the world point under the cursor when zooming', () => {
    const camera = createCamera(10)
    camera.originX = 3
    camera.originY = -2
    const cssW = 100
    const cssH = 50
    const localX = 40
    const localY = 20
    const before = viewBounds(
      camera.originX,
      camera.originY,
      cssW,
      cssH,
      camera.cellSize,
    )
    const focusX = before.minX + localX / camera.cellSize
    const focusY = before.minY + localY / camera.cellSize

    zoomCameraAt(camera, 20, localX, localY, cssW, cssH)

    const after = viewBounds(
      camera.originX,
      camera.originY,
      cssW,
      cssH,
      camera.cellSize,
    )
    expect(after.minX + localX / camera.cellSize).toBeCloseTo(focusX)
    expect(after.minY + localY / camera.cellSize).toBeCloseTo(focusY)
  })
})
