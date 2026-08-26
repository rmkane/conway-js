import {
  type AnchorMode,
  add,
  anchorToOrigin,
  contains,
  type GridBounds,
  type Point,
  type TransformOptions,
  vec,
  worldFromCanvas,
} from '@conway/geom'

import {
  type AliveSet,
  clipAlive,
  cloneAlive,
  packPoint,
  stepAlive,
} from '@/life/cells.ts'
import { patternOffsets } from '@/life/pattern.ts'

const HISTORY_LIMIT = 1000

export type SpawnOptions = TransformOptions & {
  anchor?: AnchorMode
}

/**
 * What can be simulated: live cells inside fixed stage bounds.
 * Bounds track the canvas at min zoom; cells outside are culled.
 */
export type Scene = {
  bounds: GridBounds
  alive: AliveSet
  seedAlive: AliveSet
  seedKey: string
  generation: number
  history: AliveSet[]
}

export function createScene(): Scene {
  return {
    bounds: worldFromCanvas(vec(1, 1)),
    alive: new Set(),
    seedAlive: new Set(),
    seedKey: '',
    generation: 0,
    history: [],
  }
}

/** Refresh stage bounds from the canvas CSS size. */
export function syncSceneBounds(scene: Scene, cssSize: Point): void {
  if (cssSize.x < 1 || cssSize.y < 1) return
  scene.bounds = worldFromCanvas(cssSize)
}

/** Drop live cells outside the stage. */
export function cullScene(scene: Scene): void {
  if (!scene.alive.size) return
  const next = clipAlive(scene.alive, scene.bounds)
  if (next.size !== scene.alive.size) scene.alive = next
}

/** One B3/S23 generation with history + cull. */
export function stepScene(scene: Scene): void {
  scene.history.push(cloneAlive(scene.alive))
  if (scene.history.length > HISTORY_LIMIT) scene.history.shift()
  scene.alive = stepAlive(scene.alive)
  cullScene(scene)
  scene.generation += 1
}

/** Restore generation 0 from the seed soup. */
export function resetScene(scene: Scene): void {
  scene.alive = cloneAlive(scene.seedAlive)
  scene.history = []
  scene.generation = 0
  cullScene(scene)
}

/** Empty live cells (keeps seed for reset). */
export function clearScene(scene: Scene): void {
  scene.alive = new Set()
  scene.history = []
  scene.generation = 0
}

/** Step back one generation when history exists. */
export function undoScene(scene: Scene): boolean {
  if (!scene.history.length) return false
  scene.alive = scene.history.pop()!
  scene.generation -= 1
  return true
}

/** Stamp a pattern into the scene, clipped to bounds. */
export function spawnInScene(
  scene: Scene,
  rows: string[],
  at: Point,
  options: SpawnOptions = {},
): void {
  const offsets = patternOffsets(rows, options)
  if (!offsets.length) return

  const origin = anchorToOrigin(at, offsets, options.anchor ?? 'corner')
  for (const d of offsets) {
    const cell = add(origin, d)
    if (contains(scene.bounds, cell)) {
      scene.alive.add(packPoint(cell))
    }
  }
}
