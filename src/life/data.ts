// Pattern shapes only (tight bounding box). Later generations use B3/S23.
// '#' = alive, '.' = dead.

export type PatternCategory =
  | 'Still lifes'
  | 'Oscillators'
  | 'Spaceships'
  | 'Guns'

export interface LifePattern {
  name: string
  category: PatternCategory
  period: number
  /** Live-cell geometry; no empty padding rows/cols. */
  shape: string[]
  /** Cell displacement per period for spaceships: [dx, dy]. */
  velocity?: readonly [number, number]
  /**
   * Extra empty cells around the shape on the about-page gallery board.
   * Use when the pattern expands beyond its seed bbox (e.g. penta-decathlon).
   */
  pad?: { x: number; y: number }
}

export const LIFE_PATTERNS: Record<string, LifePattern> = {
  block: {
    name: 'Block',
    category: 'Still lifes',
    period: 1,
    shape: ['##', '##'],
  },
  beeHive: {
    name: 'Bee-hive',
    category: 'Still lifes',
    period: 1,
    shape: ['.##.', '#..#', '.##.'],
  },
  loaf: {
    name: 'Loaf',
    category: 'Still lifes',
    period: 1,
    shape: ['.##.', '#..#', '.#.#', '..#.'],
  },
  boat: {
    name: 'Boat',
    category: 'Still lifes',
    period: 1,
    shape: ['##.', '#.#', '.#.'],
  },
  tub: {
    name: 'Tub',
    category: 'Still lifes',
    period: 1,
    shape: ['.#.', '#.#', '.#.'],
  },
  blinker: {
    name: 'Blinker',
    category: 'Oscillators',
    period: 2,
    shape: ['###'],
  },
  toad: {
    name: 'Toad',
    category: 'Oscillators',
    period: 2,
    shape: ['.###', '###.'],
  },
  beacon: {
    name: 'Beacon',
    category: 'Oscillators',
    period: 2,
    shape: ['##..', '#...', '...#', '..##'],
  },
  pulsar: {
    name: 'Pulsar',
    category: 'Oscillators',
    period: 3,
    shape: [
      '....#.....#....',
      '....#.....#....',
      '....##...##....',
      '...............',
      '###..##.##..###',
      '..#.#.#.#.#.#..',
      '....##...##....',
      '...............',
      '....##...##....',
      '..#.#.#.#.#.#..',
      '###..##.##..###',
      '...............',
      '....##...##....',
      '....#.....#....',
      '....#.....#....',
    ],
  },
  pentaDecathlon: {
    name: 'Penta-decathlon',
    category: 'Oscillators',
    period: 15,
    // Expands past the seed bbox during its 15-gen cycle.
    pad: { x: 4, y: 3 },
    shape: [
      '###',
      '.#.',
      '.#.',
      '###',
      '...',
      '###',
      '###',
      '...',
      '###',
      '.#.',
      '.#.',
      '###',
    ],
  },
  glider: {
    name: 'Glider',
    category: 'Spaceships',
    period: 4,
    velocity: [1, 1],
    shape: ['.#.', '..#', '###'],
  },
  lwss: {
    name: 'Light-weight spaceship (LWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    shape: ['#..#.', '....#', '#...#', '.####'],
  },
  mwss: {
    name: 'Middle-weight spaceship (MWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    shape: ['.#####.', '#....#.', '.....#.', '#...#..', '..#....'],
  },
  hwss: {
    name: 'Heavy-weight spaceship (HWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    shape: ['.######.', '#.....#.', '......#.', '#....#..', '..##....'],
  },
  gosperGliderGun: {
    name: "Gosper's glider gun",
    category: 'Guns',
    period: 30,
    // Room for a few SE-bound gliders on the gallery board.
    pad: { x: 14, y: 14 },
    shape: [
      '........................#...........',
      '......................#.#...........',
      '............##......##............##',
      '...........#...#....##............##',
      '##........#.....#...##..............',
      '##........#...#.##....#.#...........',
      '..........#.....#.......#...........',
      '...........#...#....................',
      '............##......................',
    ],
  },
}
