import { describe, expect, it } from 'vitest'
import { dropLeaving, mergeLeaving, type Shown } from '../src/renderer/src/leaving'

const it_ = (id: string) => ({ id })
const view = (s: Shown<{ id: string }>[]) => s.map((x) => (x.leaving ? `~${x.item.id}` : x.item.id))

describe('mergeLeaving', () => {
  it('shows new items in order', () => {
    expect(view(mergeLeaving([], [it_('a'), it_('b')]))).toEqual(['a', 'b'])
  })

  it('keeps a removed item in place, marked leaving', () => {
    const prev = mergeLeaving([], [it_('a'), it_('b'), it_('c')])
    expect(view(mergeLeaving(prev, [it_('a'), it_('c')]))).toEqual(['a', '~b', 'c'])
  })

  it('puts a new arrival on top while another leaves', () => {
    const prev = mergeLeaving([], [it_('a'), it_('b')])
    expect(view(mergeLeaving(prev, [it_('n'), it_('a')]))).toEqual(['n', 'a', '~b'])
  })

  it('handles everything leaving at once', () => {
    const prev = mergeLeaving([], [it_('a'), it_('b')])
    expect(view(mergeLeaving(prev, []))).toEqual(['~a', '~b'])
  })

  it('uses the latest data for items that stay', () => {
    const prev = mergeLeaving([], [{ id: 'a', pinned: false }])
    const next = mergeLeaving(prev, [{ id: 'a', pinned: true }])
    expect(next[0]!.item.pinned).toBe(true)
  })
})

describe('dropLeaving', () => {
  it('removes only the named ghosts', () => {
    const shown = mergeLeaving(mergeLeaving([], [it_('a'), it_('b')]), [it_('a')])
    expect(view(dropLeaving(shown, new Set(['b'])))).toEqual(['a'])
    expect(view(dropLeaving(shown, new Set(['a'])))).toEqual(['a', '~b'])
  })
})
