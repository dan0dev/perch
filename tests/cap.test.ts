import { describe, expect, it } from 'vitest'
import { MAX_CARDS, overCap } from '../src/main/lib/cap'

/** Newest first, like the shelf: id "n" is the newest. */
const shelf = (n: number, pinned: number[] = []) =>
  Array.from({ length: n }, (_, i) => ({ id: String(n - i), pinned: pinned.includes(n - i) }))

describe('overCap', () => {
  it('keeps everything under the cap', () => {
    expect(overCap(shelf(MAX_CARDS))).toEqual([])
  })

  it('drops the oldest cards first', () => {
    expect(overCap(shelf(32))).toEqual(['1', '2'])
  })

  it('never drops pinned cards', () => {
    expect(overCap(shelf(32, [1]))).toEqual(['2', '3'])
  })

  it('lets a shelf of pinned cards exceed the cap', () => {
    expect(overCap(shelf(3, [1, 2, 3]), 2)).toEqual([])
  })
})
