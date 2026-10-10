import { describe, expect, it } from 'vitest'
import { contains, inEdgeZone } from '../src/main/lib/edgeZone'

const area = { x: 0, y: 0, width: 2560, height: 1392 }
const rightShelf = { x: 2276, y: 500, width: 284, height: 400 }
const leftShelf = { x: 0, y: 500, width: 284, height: 400 }

describe('inEdgeZone', () => {
  it('triggers in the last pixels of the right edge, beside the shelf', () => {
    expect(inEdgeZone({ x: 2559, y: 700 }, rightShelf, 'right', area)).toBe(true)
    expect(inEdgeZone({ x: 2558, y: 500 }, rightShelf, 'right', area)).toBe(true)
  })

  it('ignores the pointer a few pixels away from the edge (scrollbars)', () => {
    expect(inEdgeZone({ x: 2550, y: 700 }, rightShelf, 'right', area)).toBe(false)
  })

  it('ignores the corners above and below the shelf', () => {
    expect(inEdgeZone({ x: 2559, y: 10 }, rightShelf, 'right', area)).toBe(false)
    expect(inEdgeZone({ x: 2559, y: 900 }, rightShelf, 'right', area)).toBe(false)
  })

  it('ignores a monitor to the right of the primary one', () => {
    expect(inEdgeZone({ x: 2560, y: 700 }, rightShelf, 'right', area)).toBe(false)
  })

  it('works on the left edge', () => {
    expect(inEdgeZone({ x: 0, y: 700 }, leftShelf, 'left', area)).toBe(true)
    expect(inEdgeZone({ x: 5, y: 700 }, leftShelf, 'left', area)).toBe(false)
    expect(inEdgeZone({ x: -1, y: 700 }, leftShelf, 'left', area)).toBe(false)
  })

  it('respects a work area that does not start at 0', () => {
    const second = { x: -1920, y: 0, width: 1920, height: 1040 }
    expect(inEdgeZone({ x: -1920, y: 300 }, { x: -1920, y: 200, width: 284, height: 300 }, 'left', second)).toBe(true)
  })
})

describe('contains', () => {
  it('is inclusive at the top-left and exclusive at the bottom-right', () => {
    expect(contains(rightShelf, { x: 2276, y: 500 })).toBe(true)
    expect(contains(rightShelf, { x: 2560, y: 700 })).toBe(false)
  })
})
