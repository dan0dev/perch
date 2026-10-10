import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ShelfState } from '@shared/types'
import { Card } from './Card'
import { drawDragImage } from './dragImage'
import { dropLeaving, mergeLeaving, type Shown } from './leaving'
import type { ShelfItem } from '@shared/types'
import logoUrl from '../../../assets/perch.svg'

/** Transparent space around the content, for shadows and the tilt. Mirrors --gap in CSS. */
const GAP = 10

const EMPTY: ShelfState = { items: [], paused: false, edge: 'right' }
/** Matches the CSS "fly" animation. */
const LEAVE_MS = 180
const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Re-renders every `intervalMs` so expiry labels and perch lines stay current. */
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
  const [menuFor, setMenuFor] = useState<string | null>(null)
  const [shown, setShown] = useState<Shown<ShelfItem>[]>([])
  useTick(15_000)
  const now = Date.now()
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const offState = window.perch.onState(setState)
    const offReveal = window.perch.onReveal((v) => {
      setRevealed(v)
      if (!v) setMenuFor(null)
    })
    window.perch.ready()
    return () => {
      offState()
      offReveal()
    }
  }, [])

  // Cards that left the list stay a moment to lift away.
  useEffect(() => {
    setShown((prev) => {
      const next = mergeLeaving(prev, state.items)
      const ghosts = new Set(next.filter((s) => s.leaving).map((s) => s.item.id))
      if (ghosts.size === 0) return next
      if (reducedMotion()) return dropLeaving(next, ghosts)
      setTimeout(() => setShown((cur) => dropLeaving(cur, ghosts)), LEAVE_MS)
      return next
    })
  }, [state.items])

  // Forget selections and menus for cards that are gone.
  useEffect(() => {
    const ids = new Set(state.items.map((i) => i.id))
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)))
      return next.size === prev.size ? prev : next
    })
    setMenuFor((m) => (m && ids.has(m) ? m : null))
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
    setMenuFor(null)
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

  const panelCls = ['panel', `edge-${state.edge}`, revealed && 'is-revealed'].filter(Boolean).join(' ')

  return (
    <div
      ref={panelRef}
      className={panelCls}
      onMouseEnter={() => window.perch.setHover(true)}
      onMouseLeave={() => {
        window.perch.setHover(false)
        setMenuFor(null)
      }}
      onClick={() => setMenuFor(null)}
    >
      {state.paused && <p className="pill status">Perch is napping.</p>}

      <div ref={scrollRef} className="scroll">
        <div ref={innerRef} className="inner">
          {shown.length === 0 ? (
            <div className="glass empty">
              <img src={logoUrl} alt="" width={30} height={30} draggable={false} />
              <p>
                Nothing perched yet. Press <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>.
              </p>
            </div>
          ) : (
            <ul className="cards">
              {shown.map(({ item, leaving }) => (
                <Card
                  key={item.id}
                  item={item}
                  leaving={leaving}
                  now={now}
                  selected={selected.has(item.id)}
                  menuOpen={menuFor === item.id}
                  onToggleSelect={toggleSelect}
                  onToggleMenu={setMenuFor}
                  onDragStart={startDrag}
                />
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected.size > 1 && (
        <footer className="pill foot">
          <span>{selected.size} selected. Drag to take all.</span>
          <button type="button" className="link" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </footer>
      )}
    </div>
  )
}
