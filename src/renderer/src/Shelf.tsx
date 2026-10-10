import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ShelfState } from '@shared/types'
import { Card } from './Card'
import { BirdMark } from './icons'
import { drawDragImage } from './dragImage'

/** Transparent space around the panel, for its shadow. Mirrors --gap in CSS. */
const GAP = 10

const EMPTY: ShelfState = { items: [], paused: false, edge: 'right' }

/** Re-renders every `intervalMs` so "Flies off in…" labels stay current. */
function useTick(intervalMs: number): void {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
}

export function Shelf(): React.JSX.Element {
  const [state, setState] = useState<ShelfState>(EMPTY)
  const [revealed, setRevealed] = useState(false)
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  useTick(15_000)
  const now = Date.now()
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const offState = window.perch.onState(setState)
    const offReveal = window.perch.onReveal(setRevealed)
    window.perch.ready()
    return () => {
      offState()
      offReveal()
    }
  }, [])

  // Forget selections for cards that are gone.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(state.items.map((i) => i.id))
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [state.items])

  // Tell main how tall the content wants to be; main clamps it to the screen.
  useLayoutEffect(() => {
    const panel = panelRef.current
    const scroll = scrollRef.current
    const inner = innerRef.current
    if (!panel || !scroll || !inner) return
    const report = (): void => {
      const chrome = panel.getBoundingClientRect().height - scroll.getBoundingClientRect().height
      // +4 absorbs DIP rounding at fractional display scales.
      window.perch.reportHeight(Math.ceil(chrome + inner.getBoundingClientRect().height) + GAP * 2 + 4)
    }
    const ro = new ResizeObserver(report)
    ro.observe(panel)
    ro.observe(scroll) // shrinks when the footer appears
    ro.observe(inner)
    report()
    return () => ro.disconnect()
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const startDrag = useCallback(
    (id: string, img: HTMLImageElement | null) => {
      const ids = selected.has(id) ? state.items.filter((i) => selected.has(i.id)).map((i) => i.id) : [id]
      const css = getComputedStyle(document.documentElement)
      const accent = css.getPropertyValue('--accent').trim()
      const ink = css.getPropertyValue('--accent-ink').trim()
      window.perch.startDrag(ids, img ? drawDragImage(img, ids.length, accent, ink) : undefined)
      // Dragged out to another app: the selection has done its job.
      if (selected.has(id)) setSelected(new Set())
    },
    [selected, state.items]
  )

  const count = state.items.length
  const panelCls = ['panel', `edge-${state.edge}`, revealed && 'is-revealed'].filter(Boolean).join(' ')

  return (
    <div
      ref={panelRef}
      className={panelCls}
      onMouseEnter={() => window.perch.setHover(true)}
      onMouseLeave={() => window.perch.setHover(false)}
    >
      <header className="head">
        <BirdMark className="mark" />
        <span className="name">Perch</span>
        {count > 0 && <span className="count">{count}</span>}
      </header>

      {state.paused && <p className="status">Perch is napping.</p>}

      <div ref={scrollRef} className="scroll">
        <div ref={innerRef} className="inner">
          {count === 0 ? (
            <p className="empty">
              Nothing perched yet. Press <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>.
            </p>
          ) : (
            <ul className="cards">
              {state.items.map((item) => (
                <Card
                  key={item.id}
                  item={item}
                  now={now}
                  selected={selected.has(item.id)}
                  onToggleSelect={toggleSelect}
                  onDragStart={startDrag}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected.size > 1 && (
        <footer className="foot">
          <span>{selected.size} selected. Drag to take all.</span>
          <button type="button" className="link" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </footer>
      )}
    </div>
  )
}
