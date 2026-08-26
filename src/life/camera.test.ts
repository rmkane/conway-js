import { add, scale, vec, viewBounds, worldFromCanvas } from '@conway/geom'
import { describe, expect, it } from 'vitest'

import {
  cameraViewOrigin,
  centerCameraOnAlive,
  centerCameraOnOrigin,
  clampCamera,
  createCamera,
  panCamera,
  setCameraZoom,
  zoomCameraAt,
} from '@/life/camera.ts'
import { pack } from '@/life/cells.ts'

describe('camera', () => {
  it('pans in world cells from screen pixels', () => {
    const camera = createCamera(10)
    panCamera(camera, vec(20, -10))
    expect(camera.origin).toEqual({ x: -2, y: 1 })
  })

  it('snaps to the world origin', () => {
    const camera = createCamera()
    camera.origin = vec(12, -7)
    centerCameraOnOrigin(camera)
    expect(camera.origin).toEqual({ x: 0, y: 0 })
  })

  it('centers on the alive bbox', () => {
    const camera = createCamera()
    const alive = new Set([pack(0, 0), pack(2, 0), pack(0, 2), pack(2, 2)])
    centerCameraOnAlive(camera, alive)
    expect(camera.origin).toEqual({ x: 1.5, y: 1.5 })
  })

  it('clamps so the view stays over the world', () => {
    const camera = createCamera(10)
    camera.origin = vec(1000, -1000)
    const css = vec(100, 50)
    const world = worldFromCanvas(css)
    clampCamera(camera, world, css)
    const origin = cameraViewOrigin(camera, css)
    expect(origin.x).toBeGreaterThanOrEqual(world.min.x)
    expect(origin.y).toBeGreaterThanOrEqual(world.min.y)
  })

  it('setCameraZoom floors to a positive integer', () => {
    const camera = createCamera(8)
    setCameraZoom(camera, 12.7)
    expect(camera.cellSize).toBe(13)
    setCameraZoom(camera, 0)
    expect(camera.cellSize).toBe(1)
  })

  it('keeps the world point under the cursor when zooming in or out', () => {
    const camera = createCamera(20)
    camera.origin = vec(3, -2)
    const css = vec(100, 50)
    const local = vec(40, 20)

    const focusAt = () =>
      add(
        viewBounds(camera.origin, css, camera.cellSize).min,
        scale(local, 1 / camera.cellSize),
      )

    const before = focusAt()
    zoomCameraAt(camera, 10, local, css) // zoom out
    expect(focusAt().x).toBeCloseTo(before.x, 10)
    expect(focusAt().y).toBeCloseTo(before.y, 10)

    zoomCameraAt(camera, 24, local, css) // zoom in
    expect(focusAt().x).toBeCloseTo(before.x, 10)
    expect(focusAt().y).toBeCloseTo(before.y, 10)
  })
})
