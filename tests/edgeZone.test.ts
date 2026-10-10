import { describe, expect, it } from 'vitest'
import { contains, inRevealZone } from '../src/main/lib/edgeZone'

const rightShelf = { x: 2276, y: 500, width: 284, height: 400 }

describe('inRevealZone', () => {
  it('triggers anywhere over the spot where the cards appear', () => {
    expect(inRevealZone({ x: 2400, y: 700 }, rightShelf)).toBe(true) // middle of the cards
    expect(inRevealZone({ x: 2276, y: 500 }, rightShelf)).toBe(true) // top-left corner
    expect(inRevealZone({ x: 2559, y: 899 }, rightShelf)).toBe(true) // by the screen edge
  })

  it('ignores the pointer just outside that spot', () => {
    expect(inRevealZone({ x: 2275, y: 700 }, rightShelf)).toBe(false) // left of it
    expect(inRevealZone({ x: 2400, y: 499 }, rightShelf)).toBe(false) // above
    expect(inRevealZone({ x: 2400, y: 900 }, rightShelf)).toBe(false) // below
  })
})

describe('contains', () => {
  it('is inclusive at the top-left and exclusive at the bottom-right', () => {
    expect(contains(rightShelf, { x: 2276, y: 500 })).toBe(true)
    expect(contains(rightShelf, { x: 2560, y: 700 })).toBe(false)
  })
})
