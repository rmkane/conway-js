// Seed patterns only. Later generations are computed with B3/S23.
// '#' = alive, '.' = dead.

export type PatternCategory = 'Still lifes' | 'Oscillators' | 'Spaceships'

export interface LifePattern {
  name: string
  category: PatternCategory
  period: number
  seed: string[]
  /** Cell displacement per period for spaceships: [dx, dy]. */
  velocity?: readonly [number, number]
}

export const LIFE_PATTERNS: Record<string, LifePattern> = {
  block: {
    name: 'Block',
    category: 'Still lifes',
    period: 1,
    seed: ['....', '.##.', '.##.', '....'],
  },
  beeHive: {
    name: 'Bee-hive',
    category: 'Still lifes',
    period: 1,
    seed: ['......', '..##..', '.#..#.', '..##..', '......'],
  },
  loaf: {
    name: 'Loaf',
    category: 'Still lifes',
    period: 1,
    seed: ['......', '..##..', '.#..#.', '..#.#.', '...#..', '......'],
  },
  boat: {
    name: 'Boat',
    category: 'Still lifes',
    period: 1,
    seed: ['.....', '.##..', '.#.#.', '..#..', '.....'],
  },
  tub: {
    name: 'Tub',
    category: 'Still lifes',
    period: 1,
    seed: ['.....', '..#..', '.#.#.', '..#..', '.....'],
  },
  blinker: {
    name: 'Blinker',
    category: 'Oscillators',
    period: 2,
    seed: ['.....', '.....', '.###.', '.....', '.....'],
  },
  toad: {
    name: 'Toad',
    category: 'Oscillators',
    period: 2,
    seed: ['......', '......', '..###.', '.###..', '......', '......'],
  },
  beacon: {
    name: 'Beacon',
    category: 'Oscillators',
    period: 2,
    seed: ['......', '.##...', '.#....', '....#.', '...##.', '......'],
  },
  pulsar: {
    name: 'Pulsar',
    category: 'Oscillators',
    period: 3,
    seed: [
      '.................',
      '.....#.....#.....',
      '.....#.....#.....',
      '.....##...##.....',
      '.................',
      '.###..##.##..###.',
      '...#.#.#.#.#.#...',
      '.....##...##.....',
      '.................',
      '.....##...##.....',
      '...#.#.#.#.#.#...',
      '.###..##.##..###.',
      '.................',
      '.....##...##.....',
      '.....#.....#.....',
      '.....#.....#.....',
      '.................',
    ],
  },
  pentaDecathlon: {
    name: 'Penta-decathlon',
    category: 'Oscillators',
    period: 15,
    seed: [
      '...........',
      '...........',
      '...........',
      '....###....',
      '.....#.....',
      '.....#.....',
      '....###....',
      '...........',
      '....###....',
      '....###....',
      '...........',
      '....###....',
      '.....#.....',
      '.....#.....',
      '....###....',
      '...........',
      '...........',
      '...........',
    ],
  },
  glider: {
    name: 'Glider',
    category: 'Spaceships',
    period: 4,
    velocity: [1, 1],
    seed: ['......', '..#...', '...#..', '.###..', '......', '......'],
  },
  lwss: {
    name: 'Light-weight spaceship (LWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    seed: [
      '.........',
      '..#..#...',
      '......#..',
      '..#...#..',
      '...####..',
      '.........',
      '.........',
    ],
  },
  mwss: {
    name: 'Middle-weight spaceship (MWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    seed: [
      '..........',
      '..........',
      '..........',
      '...#####..',
      '..#....#..',
      '.......#..',
      '..#...#...',
      '....#.....',
      '..........',
    ],
  },
  hwss: {
    name: 'Heavy-weight spaceship (HWSS)',
    category: 'Spaceships',
    period: 4,
    velocity: [2, 0],
    seed: [
      '...........',
      '...........',
      '...........',
      '...######..',
      '..#.....#..',
      '........#..',
      '..#....#...',
      '....##.....',
      '...........',
    ],
  },
}
