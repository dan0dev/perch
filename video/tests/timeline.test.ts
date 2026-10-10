import { describe, expect, it } from 'vitest'
import { DROP_CENTER, PORTRAIT, WIDE, cardCenter, cardRect, tileCenter, type CardIndex } from '../src/layout'
import { DURATION, FPS } from '../src/perch'
import { cursorAt, sceneAt } from '../src/timeline'

const dist = (a: { x: number; y: number }, b: { x: number; y: number }): number => Math.hypot(a.x - b.x, a.y - b.y)
const frames = Array.from({ length: DURATION }, (_, f) => f)

describe('duration', () => {
  it('is exactly five seconds', () => {
    expect(DURATION / FPS).toBe(5)
  })
})

describe('cursor', () => {
  it('starts idle in the chat area, away from the shelf', () => {
    expect(cursorAt(0)).toEqual({ x: 600, y: 660 })
  })

  it('is over each shelf card when it clicks it', () => {
    const over = (f: number, i: CardIndex): boolean => {
      const p = cursorAt(f)
      const r = cardRect(i)
      return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
    }
    expect(over(11, 0)).toBe(true)
    expect(over(20, 1)).toBe(true)
    expect(over(29, 2)).toBe(true)
  })

  it('grabs the middle card at its centre', () => {
    expect(cursorAt(39)).toEqual(cardCenter(1))
  })

  it('drags to the composer centre and rests there until release', () => {
    expect(cursorAt(91)).toEqual(DROP_CENTER)
    expect(cursorAt(113)).toEqual(DROP_CENTER)
  })

  it('moves left and down the whole way during the drag (no wobble)', () => {
    for (let f = 43; f < 91; f++) {
      const a = cursorAt(f)
      const b = cursorAt(f + 1)
      expect(b.x).toBeLessThanOrEqual(a.x + 1e-9)
      expect(b.y).toBeGreaterThanOrEqual(a.y - 1e-9)
    }
  })

  it('never teleports between frames', () => {
    for (const f of frames.slice(1)) {
      expect(dist(cursorAt(f), cursorAt(f - 1))).toBeLessThan(90)
    }
  })
})

describe('selection', () => {
  it('selects cards one at a time, top to bottom', () => {
    expect(sceneAt(10).shelf.map((c) => c.selected > 0.01)).toEqual([false, false, false])
    expect(sceneAt(19).shelf.map((c) => c.selected > 0.01)).toEqual([true, false, false])
    expect(sceneAt(28).shelf.map((c) => c.selected > 0.01)).toEqual([true, true, false])
    expect(sceneAt(35).shelf.map((c) => c.selected > 0.8)).toEqual([true, true, true])
  })

  it('shows the hollow ring on hover before the click', () => {
    expect(sceneAt(11).shelf[0]!.hover).toBeGreaterThan(0.9)
    expect(sceneAt(11).shelf[1]!.hover).toBe(0)
  })

  it('clears the selection once the stack lifts', () => {
    for (const c of sceneAt(60).shelf) expect(c.selected).toBeCloseTo(0, 2)
  })
})

describe('drag stack', () => {
  it('is hidden until the lift and gone after the drop', () => {
    expect(sceneAt(36).stack.visible).toBe(false)
    expect(sceneAt(60).stack.visible).toBe(true)
    expect(sceneAt(130).stack.visible).toBe(false)
  })

  it('has the grabbed card leading and the others trailing it', () => {
    const { cards } = sceneAt(60).stack
    expect(cards.map((c) => c.index)).toEqual([1, 0, 2])
    const d = cards.map((c) => dist(c, DROP_CENTER))
    expect(d[0]!).toBeLessThan(d[1]!)
    expect(d[1]!).toBeLessThan(d[2]!)
  })

  it('lies flat once lifted (tilt removed)', () => {
    for (const c of sceneAt(60).stack.cards) expect(Math.abs(c.rotateY)).toBeLessThan(0.5)
  })

  it('ghosts the shelf slots while lifted and restores them by the end', () => {
    expect(sceneAt(60).shelf.every((c) => c.ghost > 0.95)).toBe(true)
    expect(sceneAt(149).shelf.every((c) => c.ghost === 0)).toBe(true)
  })

  it('shows the count badge only after the lift starts', () => {
    expect(sceneAt(36).stack.badge).toBe(0)
    expect(sceneAt(60).stack.badge).toBeGreaterThan(0.9)
  })
})

describe('composer and tiles', () => {
  it('rests closed, opens and glows as the stack arrives', () => {
    expect(sceneAt(60).composer).toEqual({ expand: 0, glow: 0 })
    expect(sceneAt(105).composer.glow).toBeGreaterThan(0.9)
    expect(sceneAt(105).composer.expand).toBeGreaterThan(0.9)
  })

  it('keeps the composer open but drops the glow at the end', () => {
    const end = sceneAt(149).composer
    expect(end.expand).toBeGreaterThan(0.99)
    expect(end.glow).toBe(0)
  })

  it('lands three tiles in order, each ending on a check', () => {
    const mid = sceneAt(122).tiles.map((t) => t.enter)
    expect(mid[0]!).toBeGreaterThan(mid[1]!)
    expect(mid[1]!).toBeGreaterThan(mid[2]!)
    for (const t of sceneAt(149).tiles) {
      expect(t.enter).toBeGreaterThan(0.99)
      expect(t.ring).toBe(1)
      expect(t.check).toBe(1)
    }
  })

  it('has no tiles before the drop', () => {
    expect(sceneAt(105).tiles.every((t) => t.enter === 0)).toBe(true)
  })

  it('absorbs the stack towards the tile row', () => {
    const lead = sceneAt(119).stack.cards[0]!
    expect(dist(lead, tileCenter(1))).toBeLessThan(dist(DROP_CENTER, tileCenter(1)) + 1)
  })
})

describe('ranges', () => {
  it('keeps every 0..1 progress value inside 0..1 on every frame', () => {
    const unit = (n: number): void => {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
    }
    for (const f of frames) {
      const s = sceneAt(f)
      unit(s.press)
      unit(s.composer.expand)
      unit(s.composer.glow)
      unit(s.stack.opacity)
      for (const c of s.shelf) [c.hover, c.selected, c.ghost].forEach(unit)
      for (const c of s.stack.cards) unit(c.lift)
      for (const t of s.tiles) [t.ring, t.check].forEach(unit)
      for (const r of s.ripples) unit(r.t)
    }
  })

  it('lets only springs overshoot, and only a little', () => {
    for (const f of frames) {
      const s = sceneAt(f)
      expect(s.stack.badge).toBeLessThanOrEqual(1.15)
      for (const t of s.tiles) expect(t.enter).toBeLessThanOrEqual(1.2)
      for (const c of s.stack.cards) expect(c.scale).toBeGreaterThan(0)
    }
  })
})

describe('determinism', () => {
  it('returns finite numbers for every frame', () => {
    for (const f of frames) {
      const s = sceneAt(f)
      const nums = [
        s.cursor.x,
        s.cursor.y,
        s.press,
        s.composer.expand,
        s.composer.glow,
        s.stack.badge,
        ...s.stack.cards.flatMap((c) => [c.x, c.y, c.scale, c.rotateY, c.rotateZ, c.lift])
      ]
      for (const n of nums) expect(Number.isFinite(n)).toBe(true)
    }
  })
})

describe('wide layout (16:10)', () => {
  it('is 16:10 and gives the drop zone far more room from the shelf', () => {
    expect(WIDE.W / WIDE.H).toBeCloseTo(1.6, 5)
    const gap = (L: typeof PORTRAIT): number => L.SHELF_X - (L.COMPOSER.x + L.COMPOSER.w)
    expect(gap(PORTRAIT)).toBeLessThan(60)
    expect(gap(WIDE)).toBeGreaterThanOrEqual(150)
  })

  it('keeps the same choreography: grab the middle card, drop at the composer centre', () => {
    expect(cursorAt(39, WIDE)).toEqual(WIDE.cardCenter(1))
    expect(cursorAt(91, WIDE)).toEqual(WIDE.DROP_CENTER)
  })

  it('never teleports between frames', () => {
    for (const f of frames.slice(1)) {
      expect(dist(cursorAt(f, WIDE), cursorAt(f - 1, WIDE))).toBeLessThan(90)
    }
  })

  it('keeps every card and tile on the canvas and ends clean', () => {
    for (const f of frames) {
      for (const c of sceneAt(f, WIDE).stack.cards) {
        expect(c.x).toBeGreaterThan(0)
        expect(c.x).toBeLessThan(WIDE.W)
        expect(c.y).toBeGreaterThan(0)
        expect(c.y).toBeLessThan(WIDE.H)
      }
    }
    const end = sceneAt(149, WIDE)
    expect(end.composer.glow).toBe(0)
    for (const t of end.tiles) expect(t.check).toBe(1)
  })
})
