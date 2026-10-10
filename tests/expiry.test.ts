import { describe, expect, it } from 'vitest'
import { expiresAt, flyOffLabel, isExpired, splitExpired } from '../src/shared/expiry'

const MIN = 60_000

describe('expiry', () => {
  const base = { createdAt: 1_000_000, pinned: false }

  it('expires createdAt + minutes', () => {
    expect(expiresAt(base, 15)).toBe(1_000_000 + 15 * MIN)
    expect(isExpired(base, 1_000_000 + 15 * MIN - 1, 15)).toBe(false)
    expect(isExpired(base, 1_000_000 + 15 * MIN, 15)).toBe(true)
  })

  it('never expires pinned items', () => {
    const pinned = { ...base, pinned: true }
    expect(expiresAt(pinned, 15)).toBeNull()
    expect(isExpired(pinned, Number.MAX_SAFE_INTEGER, 15)).toBe(false)
  })

  it('splits a list into keep and expired', () => {
    const items = [
      { id: 'old', createdAt: 0, pinned: false },
      { id: 'pin', createdAt: 0, pinned: true },
      { id: 'new', createdAt: 10 * MIN, pinned: false }
    ]
    const { keep, expired } = splitExpired(items, 15 * MIN, 15)
    expect(expired.map((i) => i.id)).toEqual(['old'])
    expect(keep.map((i) => i.id)).toEqual(['pin', 'new'])
  })

  it('applies a changed expiry setting to existing items', () => {
    expect(isExpired(base, base.createdAt + 5 * MIN, 15)).toBe(false)
    expect(isExpired(base, base.createdAt + 5 * MIN, 5)).toBe(true)
  })

  it('labels remaining time', () => {
    expect(flyOffLabel(null, 0)).toMatch(/Pinned/)
    expect(flyOffLabel(30_000, 0)).toBe('Flies off in under a minute')
    expect(flyOffLabel(12 * MIN, 0)).toBe('Flies off in 12 min')
    expect(flyOffLabel(11 * MIN + 1, 0)).toBe('Flies off in 12 min')
    expect(flyOffLabel(60 * MIN, 0)).toBe('Flies off in 1 h')
    expect(flyOffLabel(65 * MIN, 0)).toBe('Flies off in 1 h 5 min')
  })
})
