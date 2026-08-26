import {
  anchorToOrigin,
  extentOf,
  flipPoints,
  rotateInBox,
  rotatePoints,
  transformPoints,
  vec,
  ZERO,
} from '@conway/geom'
import { describe, expect, it } from 'vitest'

describe('extentOf', () => {
  it('returns inclusive bbox size as {x:w, y:h}', () => {
    expect(extentOf([ZERO, vec(2, 2)])).toEqual({ x: 3, y: 3 })
  })
})

describe('rotateInBox', () => {
  it('rotates a local point 90° clockwise', () => {
    const size = vec(2, 2)
    expect(rotateInBox(ZERO, size, 90)).toEqual({ x: 1, y: 0 })
    expect(rotateInBox(vec(1, 0), size, 90)).toEqual({ x: 1, y: 1 })
    expect(rotateInBox(vec(0, 1), size, 90)).toEqual(ZERO)
  })
})

describe('rotatePoints', () => {
  it('rotates points 90° clockwise within their bbox', () => {
    expect(
      new Set(
        rotatePoints([ZERO, vec(1, 0), vec(0, 1)], 90).map(
          (p) => `${p.x},${p.y}`,
        ),
      ),
    ).toEqual(new Set(['0,0', '1,0', '1,1']))
  })

  it('copies points for 0°', () => {
    const points = [vec(2, 3)]
    const rotated = rotatePoints(points, 0)
    expect(rotated).toEqual(points)
    expect(rotated).not.toBe(points)
    expect(rotated[0]).not.toBe(points[0])
  })
})

describe('flipPoints', () => {
  it('mirrors points on X within the bbox', () => {
    expect(flipPoints([ZERO, vec(2, 1)], true, false)).toEqual([
      { x: 2, y: 0 },
      { x: 0, y: 1 },
    ])
  })
})

describe('transformPoints', () => {
  it('applies rotation then flip', () => {
    expect(
      transformPoints([ZERO, vec(1, 0)], { rotation: 90, flipX: true }),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
    ])
  })
})

describe('anchorToOrigin', () => {
  it('keeps corner anchors at the cursor cell', () => {
    expect(anchorToOrigin(vec(5, 7), [ZERO, vec(2, 2)], 'corner')).toEqual({
      x: 5,
      y: 7,
    })
  })

  it('centers the pattern bbox on the cursor', () => {
    expect(anchorToOrigin(vec(5, 7), [ZERO, vec(2, 2)], 'center')).toEqual({
      x: 4,
      y: 6,
    })
  })
})
