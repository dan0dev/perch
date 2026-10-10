import { Easing, interpolate, spring } from 'remotion'
import { CARD_INDICES, PORTRAIT, type CardIndex, type Layout, type Point } from './layout'
import { FPS, SPIN_DEG } from './perch'

/* ---------- Schedule (frames at 30 fps) ---------- */

export const CLICKS = [11, 20, 29] as const // one per shelf card, top to bottom
export const GRAB = 39 // press on the middle card
export const LIFT_AT = 40 // stack starts to form
export const DROP = 114 // release over the composer
export const EXPAND_AT = 82 // composer starts to open
export const TILE_AT = [115, 118, 121] as const // attachment tiles spring in
export const RESTORE = [118, 137] as const // glow fades, shelf slots come back

/** The grabbed card is the middle one; it leads the stack and the others trail it. */
export const STACK_ORDER = [1, 0, 2] as const satisfies readonly CardIndex[]
const LAG = [0, 3, 6] as const // frames each stacked card trails the cursor
const FAN = [
  { x: 0, y: 0 },
  { x: -16, y: 12 },
  { x: 16, y: 12 }
] as const satisfies readonly Point[]
const FAN_ROT = [0, -6, 6] as const // degrees
export const STACK_SCALE = 0.667 // drag image is 2/3 of a shelf card

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const easeMove = Easing.bezier(0.35, 0, 0.35, 1) // peak speed 2.1x average; the app-like 0.45/0/0.15/1 was 3.1x
const easeDrag = Easing.bezier(0.5, 0, 0.2, 1)
const easeIn = Easing.bezier(0.5, 0, 0.9, 0.6)

const SPRING_RING = { damping: 14, stiffness: 220, mass: 0.6 }
const SPRING_LIFT = { damping: 15, stiffness: 200, mass: 0.7 }
const SPRING_TILE = { damping: 16, stiffness: 170 }
const SPRING_GLOW = { damping: 20, stiffness: 140 }

/** spring() that reads 0 before its start frame. */
const springAt = (frame: number, start: number, config: { damping: number; stiffness: number; mass?: number }): number =>
  spring({ frame: Math.max(0, frame - start), fps: FPS, config })

/* ---------- Cursor ---------- */

interface Segment {
  from: number
  to: number
  p0: Point
  p1: Point
  /** Quadratic control point; omit for a straight line. */
  c?: Point
  ease?: (t: number) => number
}

/** Cursor path for a layout, derived from where the cards and the composer sit. */
export function segmentsFor(L: Layout): readonly Segment[] {
  const grab = L.cardCenter(1)
  const drop = L.DROP_CENTER
  const first = L.clickPoint(0)
  const start = { x: first.x - 250, y: first.y + 270 }
  // Bow the drag by 20% of its length, up and to the left, so it arcs instead of running straight.
  const mid = { x: (grab.x + drop.x) / 2, y: (grab.y + drop.y) / 2 }
  const bow = { x: -(drop.y - grab.y) * 0.204, y: (drop.x - grab.x) * 0.204 }
  return [
    { from: 0, to: 10, p0: start, p1: first, c: { x: start.x + 90, y: start.y - 120 } },
    { from: 13, to: 19, p0: first, p1: L.clickPoint(1) },
    { from: 22, to: 28, p0: L.clickPoint(1), p1: L.clickPoint(2) },
    { from: 31, to: 38, p0: L.clickPoint(2), p1: grab },
    { from: 43, to: 91, p0: grab, p1: drop, c: { x: mid.x + bow.x, y: mid.y + bow.y }, ease: easeDrag },
    { from: 132, to: 148, p0: drop, p1: { x: drop.x + 20, y: drop.y + 22 } }
  ]
}

export const SEGMENTS = segmentsFor(PORTRAIT)

const quad = (p0: Point, c: Point, p1: Point, t: number): Point => {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y
  }
}

/** Cursor tip position. Holds the previous waypoint between segments. */
export function cursorAt(frame: number, L: Layout = PORTRAIT): Point {
  const segments = L === PORTRAIT ? SEGMENTS : segmentsFor(L)
  let pos = segments[0]!.p0
  for (const s of segments) {
    if (frame < s.from) break
    if (frame >= s.to) {
      pos = s.p1
      continue
    }
    const t = (s.ease ?? easeMove)((frame - s.from) / (s.to - s.from))
    pos = quad(s.p0, s.c ?? { x: (s.p0.x + s.p1.x) / 2, y: (s.p0.y + s.p1.y) / 2 }, s.p1, t)
    break
  }
  return pos
}

const inside = (p: Point, i: CardIndex, L: Layout): boolean => {
  const r = L.cardRect(i)
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

/* ---------- Scene ---------- */

export interface StackCard {
  /** Which shelf card this is (selects the thumbnail). */
  index: CardIndex
  x: number
  y: number
  scale: number
  rotateY: number
  rotateZ: number
  /** 0 = resting on the shelf, 1 = fully lifted (drives shadow and flattening). */
  lift: number
}

export interface Scene {
  cursor: Point
  /** 0..1 how far the button is pressed. */
  press: number
  ripples: { x: number; y: number; t: number }[]
  shelf: { hover: number; selected: number; ghost: number }[]
  stack: { visible: boolean; opacity: number; badge: number; cards: StackCard[] }
  composer: { expand: number; glow: number }
  tiles: { enter: number; ring: number; check: number }[]
}

export function sceneAt(frame: number, L: Layout = PORTRAIT): Scene {
  const cursor = cursorAt(frame, L)

  // Press and ripples: three clicks, the grab, and the release.
  const clickPress = Math.max(...CLICKS.map((c) => interpolate(frame, [c - 1, c, c + 3], [0, 1, 0], clamp)))
  const grabPress = interpolate(frame, [GRAB - 1, GRAB, DROP, DROP + 3], [0, 1, 1, 0], clamp)
  const press = Math.max(clickPress, grabPress)
  const ripples = [...CLICKS, DROP]
    .map((c) => ({ c, t: (frame - c) / 12 }))
    .filter(({ t }) => t >= 0 && t <= 1)
    .map(({ c, t }) => ({ ...cursorAt(c, L), t }))

  // Lift of the leading card; the shelf ghosts and selection clear with it.
  const lead = Math.min(1, springAt(frame, LIFT_AT, SPRING_LIFT))
  const restore = interpolate(frame, [RESTORE[0], RESTORE[1]], [0, 1], { ...clamp, easing: easeMove })

  const shelf = CARD_INDICES.map((i) => {
    const samples = [0, 1, 2].map((k) => (inside(cursorAt(frame - k, L), i, L) ? 1 : 0))
    const hover = (samples[0]! + samples[1]! + samples[2]!) / 3
    const selected = Math.min(1, springAt(frame, CLICKS[i]!, SPRING_RING)) * (1 - lead)
    return { hover: hover * (1 - lead), selected, ghost: lead * (1 - restore) }
  })

  // Drag stack.
  const hoverIn = interpolate(frame, [86, 96], [0, 1], clamp) * (1 - interpolate(frame, [DROP - 2, DROP + 1], [0, 1], clamp))
  const float = 3 * Math.sin(((frame - 91) / 40) * Math.PI * 2) * hoverIn
  const dip = 1 - 0.06 * interpolate(frame, [DROP - 2, DROP + 1], [0, 1], clamp)
  const absorb = interpolate(frame, [DROP + 1, DROP + 7], [0, 1], { ...clamp, easing: easeIn })
  const tilePoint = L.tileCenter(1)

  const cards: StackCard[] = STACK_ORDER.map((index, k) => {
    const lift = Math.min(1, springAt(frame, LIFT_AT + k * 2, SPRING_LIFT))
    const trail = cursorAt(frame - LAG[k]!, L)
    const prev = cursorAt(frame - LAG[k]! - 2, L)
    const lean = Math.max(-6, Math.min(6, -((trail.x - prev.x) / 2) * 0.45))
    const slot = L.cardCenter(index)
    const fan = FAN[k]!
    const x = slot.x + (trail.x + fan.x - slot.x) * lift
    const y = slot.y + (trail.y + fan.y + float - slot.y) * lift
    const scale = (1 + (STACK_SCALE - 1) * lift) * (1 + 0.04 * hoverIn) * dip * (1 - 0.45 * absorb)
    return {
      index,
      // After release the stack slides to the tile row while it fades.
      x: x + (tilePoint.x - x) * absorb,
      y: y + (tilePoint.y - y) * absorb,
      scale,
      rotateY: -9 * (1 - lift),
      rotateZ: SPIN_DEG[index] * (1 - lift) + (FAN_ROT[k]! + lean) * lift,
      lift
    }
  })

  const badge = Math.min(1.15, springAt(frame, LIFT_AT + 3, { damping: 11, stiffness: 240, mass: 0.6 })) * (1 - absorb)

  // Composer opens as the stack arrives, glows while it hovers, then settles.
  const expand = Math.min(1, springAt(frame, EXPAND_AT, SPRING_GLOW))
  const glow = expand * (1 - interpolate(frame, [RESTORE[0], RESTORE[1]], [0, 1], clamp))

  const tiles = TILE_AT.map((t) => ({
    enter: springAt(frame, t, SPRING_TILE),
    ring: interpolate(frame, [t + 2, t + 12], [0, 1], clamp),
    check: interpolate(frame, [t + 12, t + 15], [0, 1], clamp)
  }))

  return {
    cursor,
    press,
    ripples,
    shelf,
    stack: { visible: frame >= LIFT_AT && absorb < 1, opacity: 1 - absorb, badge, cards },
    composer: { expand, glow },
    tiles
  }
}
