/** Half-open world window covered by the canvas: [minX, maxX) × [minY, maxY). */
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
 * Culls use this so zooming in does not shrink the keep-window.
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
 * Paint uses the current zoom; culls should call this with {@link MIN_CELL_SIZE}.
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
