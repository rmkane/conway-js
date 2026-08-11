/// <reference types="vite/client" />

interface LifeBootState {
  seed: string
  zoom: number
  fg: string
  bg: string
  grid: boolean
  mode: 'inspect' | 'spawn'
  spawn: string
  rot: number
  anchor: 'center' | 'corner'
  flipX: boolean
  flipY: boolean
}

interface Window {
  __LIFE_BOOT__?: LifeBootState
}
