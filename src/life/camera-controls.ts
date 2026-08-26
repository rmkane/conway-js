import { add, length, type Point, scale, sub, vec } from '@conway/geom'

const PAN_THRESHOLD_PX = 4

export type CameraControlsHandlers = {
  /** Cell size when a pinch starts (and for wheel step baseline). */
  getZoom: () => number
  onPan: (delta: Point) => void
  /** Zoom to `cellSize`, keeping the world under `focus` (client coords) fixed. */
  onZoom: (cellSize: number, focus: Point) => void
  /** Pointer moved over the canvas, or `null` when it leaves idle. */
  onPointer: (client: Point | null) => void
  /** True while pan/pinch is actively dragging the view. */
  onGesture?: (active: boolean) => void
}

export type CameraControls = {
  /** Client position of the primary/latest pointer, if any. */
  pointerClient(): Point | null
  /** True once when the next click should be ignored (after pan/pinch). */
  consumeClick(): boolean
  detach(): void
}

type PanDrag = {
  pointerId: number
  start: Point
  last: Point
  active: boolean
}

type PinchGesture = {
  startDistance: number
  startZoom: number
  lastMid: Point
}

function clientPoint(event: Pick<MouseEvent, 'clientX' | 'clientY'>): Point {
  return vec(event.clientX, event.clientY)
}

/**
 * Wire pan (drag), pinch-zoom, and wheel-zoom on a canvas.
 * View math stays in camera/Conway; this only translates gestures.
 */
export function attachCameraControls(
  canvas: HTMLCanvasElement,
  handlers: CameraControlsHandlers,
): CameraControls {
  const activePointers = new Map<number, Point>()
  let panDrag: PanDrag | null = null
  let pinch: PinchGesture | null = null
  let pointer: Point | null = null
  let suppressClick = false

  function setGesture(active: boolean): void {
    handlers.onGesture?.(active)
  }

  function twoPointerPoints(): [Point, Point] | null {
    if (activePointers.size < 2) return null
    const [a, b] = activePointers.values()
    return a && b ? [a, b] : null
  }

  function beginPinch(): void {
    const points = twoPointerPoints()
    if (!points) return
    const [a, b] = points
    const distance = length(sub(a, b))
    if (distance < 1) return

    panDrag = null
    pinch = {
      startDistance: distance,
      startZoom: handlers.getZoom(),
      lastMid: scale(add(a, b), 0.5),
    }
    suppressClick = true
    setGesture(true)
  }

  function updatePinch(): void {
    if (!pinch) return
    const points = twoPointerPoints()
    if (!points) return
    const [a, b] = points
    const distance = length(sub(a, b))
    if (distance < 1) return

    const mid = scale(add(a, b), 0.5)
    pointer = mid
    handlers.onZoom(pinch.startZoom * (distance / pinch.startDistance), mid)

    const delta = sub(mid, pinch.lastMid)
    pinch.lastMid = mid
    if (delta.x !== 0 || delta.y !== 0) handlers.onPan(delta)
    handlers.onPointer(mid)
  }

  function endPinch(): void {
    if (!pinch) return
    pinch = null
    setGesture(false)
  }

  function endPointer(event: PointerEvent): void {
    if (!activePointers.has(event.pointerId)) return
    activePointers.delete(event.pointerId)

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    if (pinch) {
      if (activePointers.size < 2) endPinch()
      if (activePointers.size === 1) {
        const remaining = activePointers.entries().next().value
        if (remaining) {
          const [pointerId, client] = remaining
          panDrag = {
            pointerId,
            start: client,
            last: client,
            active: true,
          }
          setGesture(true)
        }
      }
      suppressClick = true
      return
    }

    if (panDrag && event.pointerId === panDrag.pointerId) {
      if (panDrag.active) suppressClick = true
      panDrag = null
      setGesture(false)
    }
  }

  function onPointerDown(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && event.button !== 0) return

    const client = clientPoint(event)
    activePointers.set(event.pointerId, client)
    pointer = client
    canvas.setPointerCapture(event.pointerId)

    if (activePointers.size >= 2) {
      beginPinch()
      return
    }

    if (panDrag) return
    panDrag = {
      pointerId: event.pointerId,
      start: client,
      last: client,
      active: false,
    }
  }

  function onPointerMove(event: PointerEvent): void {
    if (!activePointers.has(event.pointerId)) return
    const client = clientPoint(event)
    activePointers.set(event.pointerId, client)
    pointer = client

    if (pinch) {
      updatePinch()
      return
    }

    if (panDrag && event.pointerId === panDrag.pointerId) {
      if (!panDrag.active) {
        if (length(sub(client, panDrag.start)) < PAN_THRESHOLD_PX) {
          handlers.onPointer(client)
          return
        }
        panDrag.active = true
        setGesture(true)
      }
      const delta = sub(client, panDrag.last)
      panDrag.last = client
      handlers.onPan(delta)
      handlers.onPointer(client)
      return
    }

    handlers.onPointer(client)
  }

  function onPointerLeave(): void {
    if (panDrag || pinch || activePointers.size > 0) return
    pointer = null
    handlers.onPointer(null)
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault()
    const focus = clientPoint(event)
    pointer = focus
    const step = event.deltaY > 0 ? -1 : 1
    handlers.onZoom(handlers.getZoom() + step, focus)
  }

  canvas.addEventListener('pointerdown', onPointerDown)
  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerup', endPointer)
  canvas.addEventListener('pointercancel', endPointer)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  return {
    pointerClient: () => pointer,
    consumeClick: () => {
      if (!suppressClick) return false
      suppressClick = false
      return true
    },
    detach: () => {
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', endPointer)
      canvas.removeEventListener('pointercancel', endPointer)
      canvas.removeEventListener('pointerleave', onPointerLeave)
      canvas.removeEventListener('wheel', onWheel)
      activePointers.clear()
      panDrag = null
      pinch = null
      pointer = null
    },
  }
}
