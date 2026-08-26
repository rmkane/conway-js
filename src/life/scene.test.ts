import { describe, expect, it } from 'vitest'

import { pack } from '@/life/cells.ts'
import {
  clearScene,
  createScene,
  cullScene,
  resetScene,
  spawnInScene,
  stepScene,
  syncSceneBounds,
  undoScene,
} from '@/life/scene.ts'

describe('scene', () => {
  it('syncs bounds from the canvas size', () => {
    const scene = createScene()
    syncSceneBounds(scene, 100, 50)
    expect(scene.bounds.cols).toBeGreaterThan(1)
    expect(scene.bounds.rows).toBeGreaterThan(1)
  })

  it('culls cells outside bounds', () => {
    const scene = createScene()
    syncSceneBounds(scene, 100, 50)
    scene.alive.add(pack(scene.bounds.minX, scene.bounds.minY))
    scene.alive.add(pack(scene.bounds.maxX + 10, scene.bounds.maxY + 10))
    cullScene(scene)
    expect(scene.alive.size).toBe(1)
  })

  it('steps, records history, and undoes', () => {
    const scene = createScene()
    syncSceneBounds(scene, 200, 200)
    // blinker
    scene.alive.add(pack(0, 0))
    scene.alive.add(pack(1, 0))
    scene.alive.add(pack(2, 0))
    stepScene(scene)
    expect(scene.generation).toBe(1)
    expect(scene.history).toHaveLength(1)
    expect(undoScene(scene)).toBe(true)
    expect(scene.generation).toBe(0)
    expect(scene.alive.size).toBe(3)
  })

  it('reset restores the seed; clear empties live cells', () => {
    const scene = createScene()
    syncSceneBounds(scene, 100, 50)
    scene.seedAlive = new Set([pack(0, 0)])
    scene.alive = new Set([pack(1, 1)])
    scene.generation = 5
    resetScene(scene)
    expect(scene.generation).toBe(0)
    expect(scene.alive.has(pack(0, 0))).toBe(true)
    clearScene(scene)
    expect(scene.alive.size).toBe(0)
    expect(scene.seedAlive.has(pack(0, 0))).toBe(true)
  })

  it('spawn clips to bounds', () => {
    const scene = createScene()
    syncSceneBounds(scene, 40, 40)
    // Place far outside — nothing should stick
    spawnInScene(scene, ['#'], scene.bounds.maxX + 5, scene.bounds.maxY + 5)
    expect(scene.alive.size).toBe(0)
    spawnInScene(scene, ['#'], scene.bounds.minX, scene.bounds.minY)
    expect(scene.alive.size).toBe(1)
  })
})
