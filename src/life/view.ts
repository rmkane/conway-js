/** Half-open cell rectangle: [minX, maxX) × [minY, maxY). */
export type ViewBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  cols: number
  rows: number
}

/**
 * Smallest cell size the simulator allows (matches UI zoom floor).
 * The fixed world footprint is the canvas coverage at this size.
 */
export const MIN_CELL_SIZE = 2

/** How many world cells fit the CSS canvas at `cellSize` (matches paint). */
export function viewCellCounts(
  cssW: number,
  cssH: number,
  cellSize: number,
): { cols: number; rows: number } {
  return {
    cols: Math.ceil(cssW / cellSize) + 1,
    rows: Math.ceil(cssH / cellSize) + 1,
  }
}

/**
 * World-cell bounds for a view centered on `(originX, originY)`.
 * Paint uses the current zoom; the fixed stage uses {@link worldFromCanvas}.
 */
export function viewBounds(
  originX: number,
  originY: number,
  cssW: number,
  cssH: number,
  cellSize: number,
): ViewBounds {
  const { cols, rows } = viewCellCounts(cssW, cssH, cellSize)
  const minX = Math.floor(originX - cols / 2)
  const minY = Math.floor(originY - rows / 2)
  return {
    minX,
    minY,
    maxX: minX + cols,
    maxY: minY + rows,
    cols,
    rows,
  }
}

/**
 * Fixed stage centered on the world origin: canvas coverage at {@link MIN_CELL_SIZE}.
 */
export function worldFromCanvas(cssW: number, cssH: number): ViewBounds {
  return viewBounds(0, 0, cssW, cssH, MIN_CELL_SIZE)
}

/**
 * Keep the camera so the current zoom window stays over the world.
 * If the view is larger than the world on an axis, center that axis.
 */
export function clampOrigin(
  originX: number,
  originY: number,
  world: ViewBounds,
  cssW: number,
  cssH: number,
  cellSize: number,
): { originX: number; originY: number } {
  const view = viewBounds(originX, originY, cssW, cssH, cellSize)
  const worldW = world.maxX - world.minX
  const worldH = world.maxY - world.minY

  let x = originX
  let y = originY

  if (view.cols >= worldW) {
    x = (world.minX + world.maxX) / 2
  } else if (view.minX < world.minX) {
    x += world.minX - view.minX
  } else if (view.maxX > world.maxX) {
    x -= view.maxX - world.maxX
  }

  if (view.rows >= worldH) {
    y = (world.minY + world.maxY) / 2
  } else if (view.minY < world.minY) {
    y += world.minY - view.minY
  } else if (view.maxY > world.maxY) {
    y -= view.maxY - world.maxY
  }

  return { originX: x, originY: y }
}
