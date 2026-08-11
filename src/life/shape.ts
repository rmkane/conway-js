import { type AliveSet, pack } from '@/life/cells.ts'

/** Parse `#` / `.` rows into a live-cell set (ignores bounding empty space in callers). */
export function parseShapeRows(rows: string[]): AliveSet {
  const alive: AliveSet = new Set()
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '#') alive.add(pack(x, y))
    }
  }
  return alive
}

export interface ParsedShape {
  alive: AliveSet
  cols: number
  rows: number
}

/** Parse a shape and return live cells plus its row/col dimensions. */
export function parseShape(shape: string[]): ParsedShape {
  const alive = parseShapeRows(shape)
  const cols = shape.reduce((max, row) => Math.max(max, row.length), 0)
  return { alive, cols, rows: shape.length }
}
