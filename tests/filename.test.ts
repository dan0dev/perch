import { describe, expect, it } from 'vitest'
import { snipBaseName, uniqueSnipName } from '../src/main/lib/filename'

describe('snip filenames', () => {
  const d = new Date(2026, 9, 10, 8, 31, 12) // local time, month is 0-based

  it('formats date and time with zero padding', () => {
    expect(snipBaseName(d)).toBe('snip-2026-10-10-083112')
    expect(snipBaseName(new Date(2026, 0, 2, 3, 4, 5))).toBe('snip-2026-01-02-030405')
  })

  it('uses the plain name when free', () => {
    expect(uniqueSnipName(d, () => false)).toBe('snip-2026-10-10-083112.png')
  })

  it('adds -2, -3 when names in the same second are taken', () => {
    const taken = new Set(['snip-2026-10-10-083112.png', 'snip-2026-10-10-083112-2.png'])
    expect(uniqueSnipName(d, (n) => taken.has(n))).toBe('snip-2026-10-10-083112-3.png')
  })
})
