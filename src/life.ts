/** Shared B3/S23 helpers used by the canvas engine and about gallery. */

export type CellKey = string
export type AliveSet = Set<CellKey>

export function pack(x: number, y: number): CellKey {
  return `${x},${y}`
}

export function unpack(key: CellKey): [number, number] {
  const i = key.indexOf(',')
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))]
}

export function parseShapeRows(rows: string[]): AliveSet {
  const alive: AliveSet = new Set()
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === '#') alive.add(pack(x, y))
    }
  }
  return alive
}

export function cloneAlive(alive: AliveSet): AliveSet {
  return new Set(alive)
}

export function stepAlive(alive: AliveSet): AliveSet {
  const counts = new Map<CellKey, number>()
  for (const key of alive) {
    const [x, y] = unpack(key)
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        const k = pack(x + dx, y + dy)
        counts.set(k, (counts.get(k) || 0) + 1)
      }
    }
  }

  const next: AliveSet = new Set()
  for (const [key, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(key))) next.add(key)
  }
  return next
}

export function bbox(alive: AliveSet): {
  minX: number
  minY: number
  maxX: number
  maxY: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const key of alive) {
    const [x, y] = unpack(key)
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (!alive.size) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  return { minX, minY, maxX, maxY }
}

function shiftAlive(alive: AliveSet, dx: number, dy: number): AliveSet {
  if (dx === 0 && dy === 0) return alive
  const next: AliveSet = new Set()
  for (const key of alive) {
    const [x, y] = unpack(key)
    next.add(pack(x + dx, y + dy))
  }
  return next
}

export function homeAlive(
  alive: AliveSet,
  cols: number,
  rows: number,
): AliveSet {
  if (!alive.size) return alive
  const { minX, minY, maxX, maxY } = bbox(alive)
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  const targetMinX = Math.floor((cols - width) / 2)
  const targetMinY = Math.floor((rows - height) / 2)
  return shiftAlive(alive, targetMinX - minX, targetMinY - minY)
}
