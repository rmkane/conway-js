/** Shared domain types for the simulator and pattern tooling. */

export type CellCoord = { x: number; y: number }
export type Offset = [number, number]
export type Rotation = 0 | 90 | 180 | 270
export type AnchorMode = 'center' | 'corner'
export type InteractionMode = 'inspect' | 'spawn'

export interface PatternTransform {
  rotation?: Rotation
  flipX?: boolean
  flipY?: boolean
}

export interface SpawnOptions extends PatternTransform {
  anchor?: AnchorMode
}
