import { describe, expect, it } from 'vitest'
import { Deduper } from '../src/main/lib/dedupe'

describe('Deduper', () => {
  it('flags an image already on the shelf', () => {
    const d = new Deduper()
    expect(d.isDuplicate('a')).toBe(false)
    d.track('1', 'a')
    expect(d.isDuplicate('a')).toBe(true)
    expect(d.isDuplicate('b')).toBe(false)
  })

  it('lets an image back in once its card is gone', () => {
    const d = new Deduper()
    d.track('1', 'a')
    d.untrack('1')
    expect(d.isDuplicate('a')).toBe(false)
  })

  it('ignores images Perch put on the clipboard itself, even after the card is gone', () => {
    const d = new Deduper()
    d.track('1', 'a')
    d.markSelf('a')
    d.untrack('1')
    expect(d.isDuplicate('a')).toBe(true)
  })

  it('forgets the oldest self-written hashes past the limit', () => {
    const d = new Deduper(2)
    d.markSelf('a')
    d.markSelf('b')
    d.markSelf('c')
    expect(d.isDuplicate('a')).toBe(false)
    expect(d.isDuplicate('b')).toBe(true)
    expect(d.isDuplicate('c')).toBe(true)
  })

  it('clear() drops shelf cards but keeps self-written hashes', () => {
    const d = new Deduper()
    d.track('1', 'a')
    d.markSelf('s')
    d.clear()
    expect(d.isDuplicate('a')).toBe(false)
    expect(d.isDuplicate('s')).toBe(true)
  })
})
