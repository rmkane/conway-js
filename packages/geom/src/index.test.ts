import {
  anchorToOrigin,
  flipOffsets,
  offsetExtent,
  rotateInBox,
  rotateOffsets,
  transformOffsets,
} from '@conway/geom'
import { describe, expect, it } from 'vitest'

describe('offsetExtent', () => {
  it('returns inclusive bbox size from offsets', () => {
    expect(
      offsetExtent([
        [0, 0],
        [2, 2],
      ]),
    ).toEqual({ width: 3, height: 3 })
  })
})

describe('rotateInBox', () => {
  it('rotates a local point 90° clockwise', () => {
    expect(rotateInBox(0, 0, 2, 2, 90)).toEqual({ x: 1, y: 0 })
    expect(rotateInBox(1, 0, 2, 2, 90)).toEqual({ x: 1, y: 1 })
    expect(rotateInBox(0, 1, 2, 2, 90)).toEqual({ x: 0, y: 0 })
  })
})

describe('rotateOffsets', () => {
  it('rotates offsets 90° clockwise within their bbox', () => {
    expect(
      new Set(
        rotateOffsets(
          [
            [0, 0],
            [1, 0],
            [0, 1],
          ],
          90,
        ).map(([x, y]) => `${x},${y}`),
      ),
    ).toEqual(new Set(['0,0', '1,0', '1,1']))
  })

  it('copies offsets for 0°', () => {
    const offsets: [number, number][] = [[2, 3]]
    const rotated = rotateOffsets(offsets, 0)
    expect(rotated).toEqual(offsets)
    expect(rotated).not.toBe(offsets)
  })
})

describe('flipOffsets', () => {
  it('mirrors offsets on X within the bbox', () => {
    expect(
      flipOffsets(
        [
          [0, 0],
          [2, 1],
        ],
        true,
        false,
      ),
    ).toEqual([
      [2, 0],
      [0, 1],
    ])
  })
})

describe('transformOffsets', () => {
  it('applies rotation then flip', () => {
    expect(
      transformOffsets(
        [
          [0, 0],
          [1, 0],
        ],
        { rotation: 90, flipX: true },
      ),
    ).toEqual([
      [0, 0],
      [0, 1],
    ])
  })
})

describe('anchorToOrigin', () => {
  it('keeps corner anchors at the cursor cell', () => {
    expect(
      anchorToOrigin(
        5,
        7,
        [
          [0, 0],
          [2, 2],
        ],
        'corner',
      ),
    ).toEqual({ x: 5, y: 7 })
  })

  it('centers the pattern bbox on the cursor', () => {
    expect(
      anchorToOrigin(
        5,
        7,
        [
          [0, 0],
          [2, 2],
        ],
        'center',
      ),
    ).toEqual({ x: 4, y: 6 })
  })
})
