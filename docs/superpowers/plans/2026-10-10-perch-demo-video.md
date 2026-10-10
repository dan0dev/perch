# Perch Demo Video Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render a 5-second, 1080×1350, 30 fps MP4 of Perch's drag-and-drop interaction (select three screenshots, drag them into an AI chat composer, drop, see attachments land) from a Remotion project in `video/`.

**Architecture:** One Remotion composition (`PerchDemo`) built from small presentational React components. All motion lives in a pure, unit-tested module (`timeline.ts`: frame number in, scene state out), so components only draw what the timeline says. Perch's tokens are copied into `perch.ts`, not imported, because the app CSS uses animations that Remotion cannot frame-sync.

**Tech Stack:** Remotion 4.0.534 (exact), React 19, TypeScript 5.9 (strict), Vitest 4, ffprobe for output checks. Windows 11, Node 24.

**Spec:** `docs/superpowers/specs/2026-10-10-perch-demo-video-design.md`

## Global Constraints

- Output: MP4, H.264, `yuv420p`, 1080 × 1350 (4:5), 30 fps, 150 frames, exactly 5.000 s.
- No captions, logos, title cards or transitions. Focus entirely on the drag-and-drop interaction.
- Everything large and readable at phone width.
- Accent blue `#6bafd0` is the only emphasis colour (selection and the drop zone); the success check is white on a dark chip.
- Nothing in `src/`, `electron.vite.config.ts`, the root `package.json` or the root `.gitignore` changes. The root `.gitignore` already covers `video/node_modules/` and `video/out/`.
- No CSS `animation` or `transition` anywhere in `video/src` (not frame-synced in Remotion). All motion comes from `timeline.ts`.
- Remotion packages are pinned to the same exact version (`4.0.534`).
- `video/` gets its own `.npmrc` with `legacy-peer-deps=true`: npm 10 crashes (`Cannot read properties of null (reading 'edgesOut')`) resolving the dev dependencies without it, same as the root project (see root `.npmrc`).
- Render frames as PNG (`Config.setVideoImageFormat('png')`). JPEG frames make ffmpeg emit `yuvj420p`, not `yuv420p`.
- The project must live at a path short enough that Chrome's full path stays under 260 characters (the real path is ~173). Longer paths fail with `spawn ... chrome-headless-shell.exe ENOENT`.
- Commit messages follow the repo's style (sentence case, no prefix) and end with the `Co-Authored-By` line from this session's attribution reminder.

## Review Focus

Failure modes the spec implies but a happy-path run would not surface, each pinned to the task that owns it:

1. **Cursor teleporting between cards.** A too-peaky easing curve made 4-frame hops reach 130 px/frame. Pinned by the per-frame speed test (`< 90 px`) in Task 2.
2. **Springs overshooting into invalid values** (negative opacity, composer taller than its drop zone, badge ballooning). Pinned by the range tests in Task 2.
3. **Final frame not clean.** Tiles must all be fully in with checks, glow gone, shelf slots restored. Pinned by Task 2 tests and by the frame-149 review in Task 4.
4. **JPEG-range output** (`yuvj420p`) or a wrong frame count. Pinned by the `ffprobe` check in Task 5.
5. **Un-synced CSS motion** sneaking in, which renders differently per frame. Pinned by the `grep` check in Task 5.

---

## File Structure

```
video/
  package.json            scripts and pinned dependencies
  .npmrc                  legacy-peer-deps=true
  tsconfig.json           strict, mirrors the root web config
  remotion.config.ts      codec, pixel format, PNG frames, crf
  vitest.config.mts       tests/**/*.test.ts, node environment
  README.md               how to preview and render, known gotchas
  src/
    index.ts              registerRoot
    Root.tsx              <Composition id="PerchDemo" 1080x1350 30fps 150f>
    perch.ts              canvas size and Perch tokens (copied from the app)
    layout.ts             scene geometry: shelf, window, composer, tiles
    timeline.ts           PURE: sceneAt(frame) -> Scene, cursorAt(frame) -> Point
    PerchDemo.tsx         assembles layers from sceneAt(useCurrentFrame())
    Desktop.tsx           wallpaper and taskbar
    ChatWindow.tsx        generic dark chat window chrome
    Composer.tsx          chat input, drop zone, attachment tiles
    PerchCard.tsx         one Perch card (shelf and drag stack)
    Cursor.tsx            arrow cursor, press scale, click ripples
    thumbs.tsx            three generated SVG thumbnails
    icons.tsx             check, bin, more (copied from the app) and chat glyphs
  tests/
    timeline.test.ts      23 tests on the pure timeline
  out/                    rendered MP4 and stills (git-ignored)
```

Responsibilities are split so that `timeline.ts` is the only file that knows *when* things happen, and the components only know *how to draw* a given state.

---

### Task 1: Scaffold the Remotion project

**Files:**
- Create: `video/package.json`, `video/.npmrc`, `video/tsconfig.json`, `video/remotion.config.ts`, `video/vitest.config.mts`
- Create: `video/src/index.ts`, `video/src/Root.tsx`, `video/src/perch.ts`, `video/src/layout.ts`, `video/src/PerchDemo.tsx` (placeholder)
- Commit also: `docs/superpowers/specs/2026-10-10-perch-demo-video-design.md`, `docs/superpowers/plans/2026-10-10-perch-demo-video.md`

**Interfaces:**
- Produces (`perch.ts`): `W, H, FPS, DURATION, ACCENT, ACCENT_RGB, ACCENT_INK, FONT, K, CARD_W, CARD_H, RADIUS_IMAGE, PERSPECTIVE, TILT_DEG, SPIN_DEG, RING, CHIP, SHADOW_REST, SHADOW_LIFTED`.
- Produces (`layout.ts`): `Point`, `CardIndex`, `CARD_INDICES`, `cardCenter(i)`, `cardRect(i)`, `WINDOW`, `COMPOSER`, `composerHeight(expand)`, `composerTop(expand)`, `TILE`, `tileCenter(i)`, `DROP_CENTER`, `SHELF_X`, `CARD_TOP`, `CARD_STEP`.
- Produces: composition id `PerchDemo` (1080×1350, 30 fps, 150 frames).

- [ ] **Step 1: Create the project files**

`video/package.json`:

```json
{
  "name": "perch-demo-video",
  "version": "0.0.0",
  "private": true,
  "description": "Remotion source for the Perch drag-and-drop demo video",
  "scripts": {
    "studio": "remotion studio src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "still": "remotion still src/index.ts PerchDemo",
    "render": "remotion render src/index.ts PerchDemo out/perch-demo.mp4"
  },
  "dependencies": {
    "@remotion/cli": "4.0.534",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "remotion": "4.0.534"
  },
  "devDependencies": {
    "@types/react": "19.2.2",
    "typescript": "5.9.3",
    "vitest": "4.1.11"
  }
}
```

`video/.npmrc`:

```
legacy-peer-deps=true
```

`video/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": [],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true
  },
  "include": ["src", "tests", "remotion.config.ts", "vitest.config.mts"]
}
```

`video/remotion.config.ts`:

```ts
import { Config } from '@remotion/cli/config'

Config.setCodec('h264')
Config.setVideoImageFormat('png')
Config.setPixelFormat('yuv420p')
Config.setCrf(16)
Config.setOverwriteOutput(true)
```

`video/vitest.config.mts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node'
  }
})
```

`video/src/index.ts`:

```ts
import { registerRoot } from 'remotion'
import { Root } from './Root'

registerRoot(Root)
```

`video/src/Root.tsx`:

```tsx
import { Composition } from 'remotion'
import { PerchDemo } from './PerchDemo'
import { DURATION, FPS, H, W } from './perch'

export function Root(): React.JSX.Element {
  return <Composition id="PerchDemo" component={PerchDemo} width={W} height={H} fps={FPS} durationInFrames={DURATION} />
}
```

`video/src/PerchDemo.tsx` (placeholder, replaced in Task 3):

```tsx
import { AbsoluteFill } from 'remotion'

export function PerchDemo(): React.JSX.Element {
  return <AbsoluteFill style={{ background: '#070b18' }} />
}
```

`video/src/perch.ts`:

```ts
/**
 * Perch design tokens, copied from src/renderer/src/styles.css and
 * src/renderer/src/dragImage.ts. Copied (not imported) because the app CSS
 * uses animations and transitions, which are not frame-synced in Remotion.
 */
export const W = 1080
export const H = 1350
export const FPS = 30
export const DURATION = 150

export const ACCENT = '#6bafd0' // --accent: selection only
export const ACCENT_RGB = '107,175,208' // same colour, for rgba()
export const ACCENT_INK = '#0b2233' // --accent-ink: glyphs on accent
export const FONT = '"Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif'

/** Cards are drawn at 1.43x the app's ~230 px cards so they read on a phone. */
export const K = 1.43
export const CARD_W = 330
export const CARD_H = 206
export const RADIUS_IMAGE = Math.round(14 * K) // --r-image
export const PERSPECTIVE = Math.round(760 * K) // --tilt perspective, scaled so foreshortening matches
export const TILT_DEG = -9 // --tilt rotateY on the right edge
export const SPIN_DEG = [1.2, -1.2, 1.2] as const // .card:nth-child odd/even
export const RING = Math.round(22 * K) // .select-ring
export const CHIP = Math.round(30 * K) // .chip

/** Resting card shadow (.frame) and the lifted drag shadow. */
export const SHADOW_REST = '0 9px 20px rgba(0,0,0,0.3), 0 1px 4px rgba(0,0,0,0.22)'
export const SHADOW_LIFTED = '0 30px 60px rgba(0,0,0,0.45), 0 6px 14px rgba(0,0,0,0.3)'
```

`video/src/layout.ts`:

```ts
import { CARD_H, CARD_W } from './perch'

export interface Point {
  x: number
  y: number
}

/** Shelf: three cards floating at the right edge. */
export const SHELF_X = 714
export const CARD_TOP = 269
export const CARD_STEP = CARD_H + 22

export type CardIndex = 0 | 1 | 2
export const CARD_INDICES: readonly CardIndex[] = [0, 1, 2]

export const cardCenter = (i: CardIndex): Point => ({
  x: SHELF_X + CARD_W / 2,
  y: CARD_TOP + CARD_H / 2 + CARD_STEP * i
})

export const cardRect = (i: CardIndex): { x: number; y: number; w: number; h: number } => ({
  x: SHELF_X,
  y: CARD_TOP + CARD_STEP * i,
  w: CARD_W,
  h: CARD_H
})

/** Chat window. */
export const WINDOW = { x: 36, y: 72, w: 680, h: 1168 }

/** Composer: bottom-anchored; rests one row tall, expands to hold the tiles. */
export const COMPOSER = { x: 68, w: 616, bottom: 1196, restH: 96, fullH: 252 }
export const composerHeight = (expand: number): number => COMPOSER.restH + (COMPOSER.fullH - COMPOSER.restH) * expand
export const composerTop = (expand: number): number => COMPOSER.bottom - composerHeight(expand)

/** Attachment tiles inside the expanded composer. */
export const TILE = { w: 176, h: 110, gap: 14, padX: 30, padTop: 22 }
export const tileCenter = (i: CardIndex): Point => ({
  x: COMPOSER.x + TILE.padX + i * (TILE.w + TILE.gap) + TILE.w / 2,
  y: COMPOSER.bottom - COMPOSER.fullH + TILE.padTop + TILE.h / 2
})

/** Where the drag ends: centre of the expanded composer. */
export const DROP_CENTER: Point = { x: COMPOSER.x + COMPOSER.w / 2, y: COMPOSER.bottom - COMPOSER.fullH / 2 }
```

- [ ] **Step 2: Install dependencies**

Run: `cd video && npm install`
Expected: completes without the `edgesOut` crash; `video/node_modules` and `video/package-lock.json` exist.

- [ ] **Step 3: Typecheck**

Run: `cd video && npm run typecheck`
Expected: exits 0 with no output.

- [ ] **Step 4: Render one still to prove the toolchain**

Run: `cd video && npm run still -- out/smoke.png --frame=0`
Expected: `out/smoke.png` is written (1080×1350, solid dark blue). The first run downloads headless Chrome (~220 MB), so allow a few minutes. If it fails with `spawn ... chrome-headless-shell.exe ENOENT` the checkout path is too long (see Global Constraints).

Then delete it: `rm video/out/smoke.png`

- [ ] **Step 5: Commit**

```bash
git add video/package.json video/package-lock.json video/.npmrc video/tsconfig.json video/remotion.config.ts video/vitest.config.mts video/src docs/superpowers
git commit -m "Scaffold the Remotion project for the Perch demo video" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Pure timeline (TDD)

**Files:**
- Create: `video/tests/timeline.test.ts`
- Create: `video/src/timeline.ts`

**Interfaces:**
- Consumes: `layout.ts` (`CARD_INDICES, DROP_CENTER, cardCenter, cardRect, tileCenter, CardIndex, Point`), `perch.ts` (`FPS, SPIN_DEG, DURATION`).
- Produces: `cursorAt(frame): Point`, `sceneAt(frame): Scene`, and the types:

```ts
interface StackCard { index: CardIndex; x: number; y: number; scale: number; rotateY: number; rotateZ: number; lift: number }
interface Scene {
  cursor: Point
  press: number
  ripples: { x: number; y: number; t: number }[]
  shelf: { hover: number; selected: number; ghost: number }[]          // 3 entries, by card index
  stack: { visible: boolean; opacity: number; badge: number; cards: StackCard[] }  // cards[0] leads
  composer: { expand: number; glow: number }
  tiles: { enter: number; ring: number; check: number }[]              // 3 entries
}
```

- Also exports the schedule constants `CLICKS, GRAB, LIFT_AT, DROP, EXPAND_AT, TILE_AT, RESTORE, STACK_ORDER, STACK_SCALE, SEGMENTS`.

- [ ] **Step 1: Write the failing tests**

`video/tests/timeline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { DROP_CENTER, cardCenter, cardRect, tileCenter, type CardIndex } from '../src/layout'
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd video && npm test`
Expected: FAIL. The suite cannot load: `Failed to resolve import "../src/timeline"`.

- [ ] **Step 3: Write the implementation**

`video/src/timeline.ts`:

```ts
import { Easing, interpolate, spring } from 'remotion'
import { CARD_INDICES, DROP_CENTER, cardCenter, cardRect, tileCenter, type CardIndex, type Point } from './layout'
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

export const SEGMENTS: readonly Segment[] = [
  { from: 0, to: 10, p0: { x: 600, y: 660 }, p1: { x: 850, y: 390 }, c: { x: 690, y: 540 } },
  { from: 13, to: 19, p0: { x: 850, y: 390 }, p1: { x: 850, y: 618 } },
  { from: 22, to: 28, p0: { x: 850, y: 618 }, p1: { x: 850, y: 846 } },
  { from: 31, to: 38, p0: { x: 850, y: 846 }, p1: cardCenter(1) },
  { from: 43, to: 91, p0: cardCenter(1), p1: DROP_CENTER, c: { x: 531, y: 733 }, ease: easeDrag },
  { from: 132, to: 148, p0: DROP_CENTER, p1: { x: 396, y: 1092 } }
]

const quad = (p0: Point, c: Point, p1: Point, t: number): Point => {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * c.x + t * t * p1.x,
    y: u * u * p0.y + 2 * u * t * c.y + t * t * p1.y
  }
}

/** Cursor tip position. Holds the previous waypoint between segments. */
export function cursorAt(frame: number): Point {
  let pos = SEGMENTS[0]!.p0
  for (const s of SEGMENTS) {
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

const inside = (p: Point, i: CardIndex): boolean => {
  const r = cardRect(i)
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

export function sceneAt(frame: number): Scene {
  const cursor = cursorAt(frame)

  // Press and ripples: three clicks, the grab, and the release.
  const clickPress = Math.max(...CLICKS.map((c) => interpolate(frame, [c - 1, c, c + 3], [0, 1, 0], clamp)))
  const grabPress = interpolate(frame, [GRAB - 1, GRAB, DROP, DROP + 3], [0, 1, 1, 0], clamp)
  const press = Math.max(clickPress, grabPress)
  const ripples = [...CLICKS, DROP]
    .map((c) => ({ c, t: (frame - c) / 12 }))
    .filter(({ t }) => t >= 0 && t <= 1)
    .map(({ c, t }) => ({ ...cursorAt(c), t }))

  // Lift of the leading card; the shelf ghosts and selection clear with it.
  const lead = Math.min(1, springAt(frame, LIFT_AT, SPRING_LIFT))
  const restore = interpolate(frame, [RESTORE[0], RESTORE[1]], [0, 1], { ...clamp, easing: easeMove })

  const shelf = CARD_INDICES.map((i) => {
    const samples = [0, 1, 2].map((k) => (inside(cursorAt(frame - k), i) ? 1 : 0))
    const hover = (samples[0]! + samples[1]! + samples[2]!) / 3
    const selected = Math.min(1, springAt(frame, CLICKS[i]!, SPRING_RING)) * (1 - lead)
    return { hover: hover * (1 - lead), selected, ghost: lead * (1 - restore) }
  })

  // Drag stack.
  const hoverIn = interpolate(frame, [86, 96], [0, 1], clamp) * (1 - interpolate(frame, [DROP - 2, DROP + 1], [0, 1], clamp))
  const float = 3 * Math.sin(((frame - 91) / 40) * Math.PI * 2) * hoverIn
  const dip = 1 - 0.06 * interpolate(frame, [DROP - 2, DROP + 1], [0, 1], clamp)
  const absorb = interpolate(frame, [DROP + 1, DROP + 7], [0, 1], { ...clamp, easing: easeIn })
  const tilePoint = tileCenter(1)

  const cards: StackCard[] = STACK_ORDER.map((index, k) => {
    const lift = Math.min(1, springAt(frame, LIFT_AT + k * 2, SPRING_LIFT))
    const trail = cursorAt(frame - LAG[k]!)
    const prev = cursorAt(frame - LAG[k]! - 2)
    const lean = Math.max(-6, Math.min(6, -((trail.x - prev.x) / 2) * 0.45))
    const slot = cardCenter(index)
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd video && npm test && npm run typecheck`
Expected: `Tests  23 passed (23)` and typecheck exits 0.

- [ ] **Step 5: Commit**

```bash
git add video/tests video/src/timeline.ts
git commit -m "Pure frame timeline for the demo video, with tests" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Backdrop and shelf

**Files:**
- Create: `video/src/icons.tsx`, `video/src/thumbs.tsx`, `video/src/Desktop.tsx`, `video/src/ChatWindow.tsx`, `video/src/PerchCard.tsx`
- Modify: `video/src/PerchDemo.tsx` (replace the placeholder)

**Interfaces:**
- Consumes: `layout.ts` (`CARD_INDICES, cardCenter, WINDOW, CardIndex`), `perch.ts` tokens, `timeline.ts` (`sceneAt`).
- Produces: `PerchCard` with props

```ts
interface PerchCardProps {
  index: CardIndex; x: number; y: number          // centre in canvas px
  scale?: number; rotateY?: number; rotateZ?: number; opacity?: number
  hover?: number; selected?: number; lift?: number // all 0..1
  badge?: number; badgeText?: string               // badge scale; 0 hides
}
```

  plus `Thumb({ index })`, `Desktop()`, `ChatWindow()`, and icons `TrashIcon, MoreIcon, CheckIcon, PlusIcon, ArrowUpIcon, UploadIcon`.

- [ ] **Step 1: Write the icons**

`video/src/icons.tsx`:

```tsx
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

/** Stroke icon base. TrashIcon, MoreIcon and CheckIcon are copied from src/renderer/src/icons.tsx. */
const base = (p: IconProps): IconProps => ({
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  ...p
})

export const TrashIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M4 7h16" />
    <path d="M10 11v6M14 11v6" />
    <path d="M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7" />
    <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
  </svg>
)

export const MoreIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ fill: 'currentColor', stroke: 'none', ...p })}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
)

export const CheckIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ strokeWidth: 3, ...p })}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

/** Chat UI glyphs (not from the app). */
export const PlusIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
)

export const ArrowUpIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base({ strokeWidth: 2.4, ...p })}>
    <path d="M12 19V5" />
    <path d="m6 11 6-6 6 6" />
  </svg>
)

export const UploadIcon = (p: IconProps): React.JSX.Element => (
  <svg {...base(p)}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" />
  </svg>
)
```

- [ ] **Step 2: Write the thumbnails**

`video/src/thumbs.tsx`:

```tsx
import type { CardIndex } from './layout'

/**
 * Three generated stand-ins for screenshots, in the palette of docs/screenshot.png.
 * Gradient ids are fixed: every instance of a thumbnail defines an identical gradient,
 * so duplicates in the DOM are harmless.
 */
const SVG = { viewBox: '0 0 320 200', preserveAspectRatio: 'xMidYMid slice', width: '100%', height: '100%', style: { display: 'block' } } as const

/** Pink-to-blue stage scene with a dark dancing figure. */
const Figure = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-fig-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff4fd0" />
        <stop offset="0.55" stopColor="#7a5cff" />
        <stop offset="1" stopColor="#2a8bff" />
      </linearGradient>
      <radialGradient id="th-fig-glow" cx="0.38" cy="0.32" r="0.55">
        <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-fig-bg)" />
    <rect width="320" height="200" fill="url(#th-fig-glow)" />
    <path d="M118 118 C100 128 96 148 108 160" stroke="#ff3b5c" strokeWidth="8" strokeLinecap="round" fill="none" />
    <g fill="#140a2e">
      <circle cx="170" cy="62" r="13" />
      <path d="M150 80 C165 70 190 74 200 92 L222 150 L204 156 L188 112 L176 150 L196 186 L176 192 L150 158 L140 118 Z" />
      <path d="M150 84 L112 112 L120 124 L158 104 Z" />
    </g>
  </svg>
)

/** Soft teal-to-orange gradient. */
const Gradient = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-grad-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#86b9cc" />
        <stop offset="0.5" stopColor="#c58f86" />
        <stop offset="1" stopColor="#f26a2c" />
      </linearGradient>
      <radialGradient id="th-grad-light" cx="0.75" cy="0.7" r="0.6">
        <stop offset="0" stopColor="#ffb27a" stopOpacity="0.75" />
        <stop offset="1" stopColor="#ffb27a" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-grad-bg)" />
    <rect width="320" height="200" fill="url(#th-grad-light)" />
  </svg>
)

/** Sunset behind layered mountains. */
const Mountains = (): React.JSX.Element => (
  <svg {...SVG}>
    <defs>
      <linearGradient id="th-mtn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5a4aa0" />
        <stop offset="0.55" stopColor="#d77aa0" />
        <stop offset="1" stopColor="#f7ad6e" />
      </linearGradient>
      <radialGradient id="th-mtn-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="#fff2b8" stopOpacity="1" />
        <stop offset="1" stopColor="#fff2b8" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="320" height="200" fill="url(#th-mtn-sky)" />
    <circle cx="214" cy="74" r="46" fill="url(#th-mtn-sun)" />
    <circle cx="214" cy="74" r="17" fill="#ffe08f" />
    <path d="M0 150 L60 96 L102 132 L150 84 L210 142 L262 104 L320 150 L320 200 L0 200 Z" fill="#6b4f9c" />
    <path d="M0 172 L48 128 L92 160 L140 118 L200 168 L252 132 L320 176 L320 200 L0 200 Z" fill="#46347a" />
  </svg>
)

const BY_INDEX = [Figure, Gradient, Mountains] as const

export const Thumb = ({ index }: { index: CardIndex }): React.JSX.Element => {
  const Art = BY_INDEX[index]
  return <Art />
}
```

- [ ] **Step 3: Write the desktop and chat window**

`video/src/Desktop.tsx`:

```tsx
import { AbsoluteFill } from 'remotion'

const TASKBAR_H = 76
const APPS = ['#4ea1ff', '#ffb84e', '#6be08b', '#c785ff', '#ff7a7a', '#e8eaed', '#5fd3e6']

/** Dark abstract wallpaper and a slim Windows 11 style taskbar. No logos. */
export function Desktop(): React.JSX.Element {
  return (
    <AbsoluteFill
      style={{
        background: [
          'radial-gradient(760px 640px at 82% 16%, rgba(64,110,255,0.60), transparent 62%)',
          'radial-gradient(820px 760px at 8% 86%, rgba(0,176,214,0.38), transparent 62%)',
          'radial-gradient(640px 520px at 58% 62%, rgba(132,70,214,0.40), transparent 66%)',
          '#070b18'
        ].join(', ')
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: TASKBAR_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          background: 'rgba(22,26,36,0.78)',
          borderTop: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        {APPS.map((c) => (
          <div
            key={c}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: `linear-gradient(145deg, ${c}, rgba(255,255,255,0.18))`,
              opacity: 0.92
            }}
          />
        ))}
      </div>
    </AbsoluteFill>
  )
}
```

`video/src/ChatWindow.tsx`:

```tsx
import { WINDOW } from './layout'

const TITLE_H = 56

const Control = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <div style={{ display: 'grid', placeItems: 'center', width: 64, height: TITLE_H, color: 'rgba(255,255,255,0.72)' }}>{children}</div>
)

/** Generic dark chat window with Windows 11 caption buttons. The body stays empty on purpose. */
export function ChatWindow(): React.JSX.Element {
  const glyph = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const
  return (
    <div
      style={{
        position: 'absolute',
        left: WINDOW.x,
        top: WINDOW.y,
        width: WINDOW.w,
        height: WINDOW.h,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #181c24 0%, #12151b 100%)',
        border: '1px solid rgba(255,255,255,0.09)',
        boxShadow: '0 50px 100px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.35)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: TITLE_H,
          paddingLeft: 22,
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <svg {...glyph} width={26} height={26} viewBox="0 0 26 26" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <rect x="3" y="4" width="20" height="18" rx="4" />
          <path d="M10 4v18" />
        </svg>
        <div style={{ display: 'flex' }}>
          <Control>
            <svg {...glyph}>
              <path d="M4 10h12" />
            </svg>
          </Control>
          <Control>
            <svg {...glyph}>
              <rect x="4.5" y="4.5" width="11" height="11" rx="1.5" />
            </svg>
          </Control>
          <Control>
            <svg {...glyph}>
              <path d="m4.5 4.5 11 11M15.5 4.5l-11 11" />
            </svg>
          </Control>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write the Perch card**

`video/src/PerchCard.tsx`:

```tsx
import type { CSSProperties, ReactNode } from 'react'
import { CheckIcon, MoreIcon, TrashIcon } from './icons'
import type { CardIndex } from './layout'
import { ACCENT, ACCENT_INK, ACCENT_RGB, CARD_H, CARD_W, CHIP, FONT, PERSPECTIVE, RADIUS_IMAGE, RING, SHADOW_LIFTED, SHADOW_REST } from './perch'
import { Thumb } from './thumbs'

export interface PerchCardProps {
  index: CardIndex
  /** Centre in canvas px. */
  x: number
  y: number
  scale?: number
  rotateY?: number
  rotateZ?: number
  opacity?: number
  /** 0..1: pointer is over the card (shows the ring and the bin and more chips). */
  hover?: number
  /** 0..1: selection ring filled. */
  selected?: number
  /** 0..1: lifted off the shelf (deeper shadow, near-opaque drag image and hairline). */
  lift?: number
  /** Scale of the count badge; 0 hides it. */
  badge?: number
  badgeText?: string
}

const Chip = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <div
    style={{
      display: 'grid',
      placeItems: 'center',
      width: CHIP,
      height: CHIP,
      borderRadius: '50%',
      background: 'rgba(12,14,18,0.72)',
      border: '1px solid rgba(255,255,255,0.14)',
      boxShadow: '0 3px 10px rgba(0,0,0,0.35)',
      color: '#fff'
    }}
  >
    {children}
  </div>
)

/** One Perch card, drawn with the app's tokens. Used for both the shelf and the drag stack. */
export function PerchCard({
  index,
  x,
  y,
  scale = 1,
  rotateY = 0,
  rotateZ = 0,
  opacity = 1,
  hover = 0,
  selected = 0,
  lift = 0,
  badge = 0,
  badgeText = ''
}: PerchCardProps): React.JSX.Element {
  const fill = (extra: CSSProperties): CSSProperties => ({ position: 'absolute', inset: 0, borderRadius: RADIUS_IMAGE, ...extra })

  return (
    <div
      style={{
        position: 'absolute',
        left: x - CARD_W / 2,
        top: y - CARD_H / 2,
        width: CARD_W,
        height: CARD_H,
        opacity,
        transform: `perspective(${PERSPECTIVE}px) rotateY(${rotateY}deg) rotate(${rotateZ}deg) scale(${scale})`
      }}
    >
      <div style={fill({ boxShadow: SHADOW_REST, opacity: 1 - lift })} />
      <div style={fill({ boxShadow: SHADOW_LIFTED, opacity: lift })} />
      <div
        style={fill({
          overflow: 'hidden',
          // The app drags at 0.88 alpha; overlapping thumbnails look muddy at this size, so stay near-opaque.
          opacity: 1 - 0.04 * lift,
          boxShadow: `0 0 0 ${4 * selected}px rgba(${ACCENT_RGB},${selected})`
        })}
      >
        <Thumb index={index} />
      </div>
      <div style={fill({ border: `1.5px solid rgba(255,255,255,${0.25 * lift})` })} />

      {/* Select ring: hinted on hover, filled when selected. */}
      <div style={{ position: 'absolute', left: 14, top: 14, width: RING, height: RING, opacity: Math.max(hover, selected) }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.92)',
            background: 'rgba(0,0,0,0.32)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.45)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: '50%',
            background: ACCENT,
            color: ACCENT_INK,
            opacity: selected,
            transform: `scale(${0.6 + 0.4 * selected})`
          }}
        >
          <CheckIcon width={18} height={18} />
        </div>
      </div>

      {/* Bin and more chips, on hover only. */}
      <div style={{ position: 'absolute', top: 13, right: 13, display: 'flex', gap: 9, opacity: hover }}>
        <Chip>
          <TrashIcon width={21} height={21} />
        </Chip>
        <Chip>
          <MoreIcon width={23} height={23} />
        </Chip>
      </div>

      {badge > 0 && (
        <div
          style={{
            position: 'absolute',
            top: -14,
            right: -14,
            display: 'grid',
            placeItems: 'center',
            minWidth: 46,
            height: 46,
            padding: '0 14px',
            borderRadius: 23,
            background: ACCENT,
            color: ACCENT_INK,
            font: `700 26px ${FONT}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            transform: `scale(${badge})`
          }}
        >
          {badgeText}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Replace the placeholder composition**

`video/src/PerchDemo.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ChatWindow } from './ChatWindow'
import { Desktop } from './Desktop'
import { CARD_INDICES, cardCenter } from './layout'
import { FONT, SPIN_DEG, TILT_DEG } from './perch'
import { PerchCard } from './PerchCard'
import { sceneAt } from './timeline'

export function PerchDemo(): React.JSX.Element {
  const scene = sceneAt(useCurrentFrame())

  return (
    <AbsoluteFill style={{ fontFamily: FONT, overflow: 'hidden' }}>
      <Desktop />
      <ChatWindow />

      {/* The shelf: cards stay put while a copy is dragged away, like the real app. */}
      {CARD_INDICES.map((i) => {
        const c = cardCenter(i)
        const s = scene.shelf[i]!
        return (
          <PerchCard
            key={i}
            index={i}
            x={c.x}
            y={c.y}
            rotateY={TILT_DEG}
            rotateZ={SPIN_DEG[i]}
            hover={s.hover}
            selected={s.selected}
            opacity={1 - 0.65 * s.ghost}
          />
        )
      })}
    </AbsoluteFill>
  )
}
```

- [ ] **Step 6: Typecheck and tests**

Run: `cd video && npm run typecheck && npm test`
Expected: typecheck exits 0; `Tests  23 passed (23)`.

- [ ] **Step 7: Render a still and review it**

Run: `cd video && npm run still -- out/f11.png --frame=11` then open `video/out/f11.png`.
Expected, all of:
- Dark wallpaper with a taskbar of seven coloured squares; no logos.
- Chat window at the left, empty body, caption buttons at the top right.
- Three tilted cards at the right edge, alternating lean, soft shadows.
- The top card has a hollow select ring (top-left) and bin and more chips (top-right) and the cursor arrow sits on it; the other two cards show no ring or chips.
- No text anywhere.

- [ ] **Step 8: Commit**

```bash
git add video/src
git commit -m "Desktop, chat window and Perch shelf for the demo video" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Composer, cursor and drag stack

**Files:**
- Create: `video/src/Composer.tsx`, `video/src/Cursor.tsx`
- Modify: `video/src/PerchDemo.tsx`

**Interfaces:**
- Consumes: `Scene` from `timeline.ts` (`composer`, `tiles`, `stack`, `cursor`, `press`, `ripples`), `PerchCard`, `Thumb`, icons, layout geometry.
- Produces: `Composer({ expand, glow, tiles })`, `Cursor({ at, press, ripples })`; the finished `PerchDemo`.

- [ ] **Step 1: Write the composer**

`video/src/Composer.tsx`:

```tsx
import { ArrowUpIcon, CheckIcon, PlusIcon, UploadIcon } from './icons'
import { COMPOSER, TILE, composerHeight, composerTop, type CardIndex } from './layout'
import { ACCENT, ACCENT_RGB, FONT, RADIUS_IMAGE } from './perch'
import { Thumb } from './thumbs'
import type { Scene } from './timeline'

const INPUT_H = COMPOSER.restH
const TOP_H = COMPOSER.fullH - COMPOSER.restH
const RING_R = 17
const RING_C = 2 * Math.PI * RING_R

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** An attachment: lands with a spring, shows a progress ring, then resolves to a check. */
function Tile({ index, state }: { index: CardIndex; state: Scene['tiles'][number] }): React.JSX.Element {
  const dim = 0.5 * (1 - state.check)
  return (
    <div
      style={{
        position: 'absolute',
        left: TILE.padX + index * (TILE.w + TILE.gap),
        top: TILE.padTop,
        width: TILE.w,
        height: TILE.h,
        borderRadius: RADIUS_IMAGE,
        overflow: 'hidden',
        opacity: Math.min(1, state.enter * 1.6),
        transform: `translateY(${(1 - state.enter) * 28}px) scale(${0.86 + 0.14 * state.enter})`,
        boxShadow: '0 8px 18px rgba(0,0,0,0.35)'
      }}
    >
      <Thumb index={index} />
      <div style={{ position: 'absolute', inset: 0, background: `rgba(10,12,16,${dim})` }} />
      <svg
        width={48}
        height={48}
        viewBox="0 0 48 48"
        style={{ position: 'absolute', left: TILE.w / 2 - 24, top: TILE.h / 2 - 24, opacity: state.ring > 0 ? 1 - state.check : 0 }}
      >
        <circle cx="24" cy="24" r={RING_R} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r={RING_R}
          fill="none"
          stroke="#fff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - state.ring)}
          transform="rotate(-90 24 24)"
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          display: 'grid',
          placeItems: 'center',
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'rgba(12,14,18,0.78)',
          color: '#fff',
          transform: `scale(${state.check})`
        }}
      >
        <CheckIcon width={20} height={20} />
      </div>
    </div>
  )
}

interface ComposerProps {
  expand: number
  glow: number
  tiles: Scene['tiles']
}

/** Chat input. Rests one row tall; opens upward into a drop zone, then holds the attachments. */
export function Composer({ expand, glow, tiles }: ComposerProps): React.JSX.Element {
  const border = `rgba(${lerp(255, 107, glow)},${lerp(255, 175, glow)},${lerp(255, 208, glow)},${lerp(0.1, 0.95, glow)})`
  return (
    <div
      style={{
        position: 'absolute',
        left: COMPOSER.x,
        top: composerTop(expand),
        width: COMPOSER.w,
        height: composerHeight(expand),
        borderRadius: 28,
        overflow: 'hidden',
        background: '#1d222b',
        border: `1.5px solid ${border}`,
        boxShadow: [
          `0 0 0 ${4 * glow}px rgba(${ACCENT_RGB},${0.3 * glow})`,
          `0 0 ${60 * glow}px rgba(${ACCENT_RGB},${0.32 * glow})`,
          '0 18px 40px rgba(0,0,0,0.35)'
        ].join(', ')
      }}
    >
      {/* Top region is anchored to the input row, so it is revealed as the composer opens. */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: INPUT_H, height: TOP_H }}>
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 20,
            border: `2px dashed rgba(${ACCENT_RGB},0.85)`,
            background: `rgba(${ACCENT_RGB},0.07)`,
            opacity: glow
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 10,
              marginTop: 14,
              color: '#cfe8f4',
              font: `600 24px ${FONT}`
            }}
          >
            <UploadIcon width={26} height={26} />
            Drop to attach
          </div>
        </div>
        {([0, 1, 2] as const).map((i) => (
          <Tile key={i} index={i} state={tiles[i]!} />
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: INPUT_H,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          padding: '0 22px'
        }}
      >
        <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)' }}>
          <PlusIcon width={26} height={26} />
        </div>
        <div style={{ flex: 1, color: 'rgba(255,255,255,0.42)', font: `400 28px ${FONT}` }}>Ask anything…</div>
        <div style={{ display: 'grid', placeItems: 'center', width: 52, height: 52, borderRadius: '50%', background: ACCENT, color: '#0b2233' }}>
          <ArrowUpIcon width={26} height={26} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write the cursor**

`video/src/Cursor.tsx`:

```tsx
import type { Point } from './layout'

/** Arrow tip inside the 44x44 box (the SVG is a 22-unit drawing at 2x). */
const TIP = { x: 4, y: 3 }

interface CursorProps {
  at: Point
  /** 0..1 how far the button is pressed. */
  press: number
  ripples: { x: number; y: number; t: number }[]
}

/** Windows-style arrow cursor with a soft shadow, press scale and click ripples. */
export function Cursor({ at, press, ripples }: CursorProps): React.JSX.Element {
  return (
    <>
      {ripples.map((r, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: r.x - 22,
            top: r.y - 22,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.8)',
            opacity: 0.7 * (1 - r.t),
            transform: `scale(${0.35 + 1.25 * r.t})`
          }}
        />
      ))}
      <svg
        width={44}
        height={44}
        viewBox="0 0 22 22"
        style={{
          position: 'absolute',
          left: at.x - TIP.x,
          top: at.y - TIP.y,
          overflow: 'visible',
          transform: `scale(${1 - 0.14 * press})`,
          transformOrigin: `${TIP.x}px ${TIP.y}px`,
          filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.5))'
        }}
      >
        <path
          d="M2 1.5 V17.2 L6.2 13.4 L8.9 19.6 L11.7 18.4 L9 12.3 L14.6 12.2 Z"
          fill="#ffffff"
          stroke="#111111"
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
      </svg>
    </>
  )
}
```

- [ ] **Step 3: Wire everything into the composition**

Replace `video/src/PerchDemo.tsx`:

```tsx
import { AbsoluteFill, useCurrentFrame } from 'remotion'
import { ChatWindow } from './ChatWindow'
import { Composer } from './Composer'
import { Cursor } from './Cursor'
import { Desktop } from './Desktop'
import { CARD_INDICES, cardCenter } from './layout'
import { FONT, SPIN_DEG, TILT_DEG } from './perch'
import { PerchCard } from './PerchCard'
import { sceneAt } from './timeline'

export function PerchDemo(): React.JSX.Element {
  const scene = sceneAt(useCurrentFrame())

  return (
    <AbsoluteFill style={{ fontFamily: FONT, overflow: 'hidden' }}>
      <Desktop />
      <ChatWindow />
      <Composer expand={scene.composer.expand} glow={scene.composer.glow} tiles={scene.tiles} />

      {/* The shelf: cards stay put while a copy is dragged away, like the real app. */}
      {CARD_INDICES.map((i) => {
        const c = cardCenter(i)
        const s = scene.shelf[i]!
        return (
          <PerchCard
            key={i}
            index={i}
            x={c.x}
            y={c.y}
            rotateY={TILT_DEG}
            rotateZ={SPIN_DEG[i]}
            hover={s.hover}
            selected={s.selected}
            opacity={1 - 0.65 * s.ghost}
          />
        )
      })}

      {/* The drag stack. Painted trailing cards first so the grabbed card is on top. */}
      {scene.stack.visible &&
        scene.stack.cards
          .map((c, k) => (
            <PerchCard
              key={c.index}
              index={c.index}
              x={c.x}
              y={c.y}
              scale={c.scale}
              rotateY={c.rotateY}
              rotateZ={c.rotateZ}
              lift={c.lift}
              opacity={scene.stack.opacity}
              badge={k === 0 ? scene.stack.badge : 0}
              badgeText="3"
            />
          ))
          .reverse()}

      <Cursor at={scene.cursor} press={scene.press} ripples={scene.ripples} />
    </AbsoluteFill>
  )
}
```

- [ ] **Step 4: Typecheck and tests**

Run: `cd video && npm run typecheck && npm test`
Expected: typecheck exits 0; `Tests  23 passed (23)`.

- [ ] **Step 5: Render the review stills**

Run each (one command per frame):

```bash
cd video
for f in 0 11 29 38 50 70 95 117 130 149; do npm run still -- out/f$f.png --frame=$f; done
```

- [ ] **Step 6: Review the stills against this checklist**

Open each PNG and confirm:

| Frame | Must show |
| --- | --- |
| 0 | Cursor in the chat area left of the shelf; no rings; composer closed to one row; shelf pristine. |
| 11 | Cursor on the top card, hollow ring and bin/more chips on it only. |
| 29 | Top two cards have filled accent rings with a check; cursor clicking the bottom card. |
| 38 | All three cards have filled rings; cursor at the centre of the middle card. |
| 50 | Stack has lifted: three flat cards fanned under the cursor, a **3** badge on the lead card, shelf slots ghosted (~35 %), no rings left. |
| 70 | Stack mid-arc towards the composer, leaning with its motion, trailing cards offset behind. |
| 95 | Stack hovering over an opened composer with accent border, glow, dashed zone and "Drop to attach"; no tiles yet. |
| 117 | Stack shrinking and fading into the tile row; first tile appearing; glow easing off. |
| 130 | Three tiles in; at least one still shows its progress ring; shelf cards back to full opacity. |
| 149 | Three tiles with white checks on dark chips, composer border neutral, shelf at full opacity, cursor resting just below the tiles, no stray overlays. |

Fix anything that fails by editing the component or the schedule constants in `timeline.ts`, re-running `npm test` after any change to `timeline.ts`.

- [ ] **Step 7: Commit**

```bash
git add video/src
git commit -m "Composer, cursor and drag stack: the full demo composition" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Render, verify and document

**Files:**
- Create: `video/README.md`
- Output (git-ignored): `video/out/perch-demo.mp4`

**Interfaces:**
- Consumes: the `PerchDemo` composition and `npm run render`.
- Produces: `video/out/perch-demo.mp4`.

- [ ] **Step 1: Render the MP4**

Run: `cd video && npm run render`
Expected: `Rendered 150/150`, `Encoded 150/150`, and `out/perch-demo.mp4` is written.

- [ ] **Step 2: Verify the stream matches the spec**

Run:

```bash
ffprobe -v error -select_streams v:0 -count_frames -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,nb_read_frames,duration -of default=nw=1 video/out/perch-demo.mp4
```

Expected exactly:

```
codec_name=h264
width=1080
height=1350
pix_fmt=yuv420p
r_frame_rate=30/1
duration=5.000000
nb_read_frames=150
```

If `pix_fmt` is `yuvj420p`, `Config.setVideoImageFormat('png')` is missing from `remotion.config.ts`.

- [ ] **Step 3: Verify no un-synced CSS motion crept in**

Run: `grep -rnE "transition|animation|@keyframes" video/src || echo CLEAN`
Expected: `CLEAN`.

- [ ] **Step 4: Verify nothing outside `video/` and `docs/` changed**

Run: `git status --short`
Expected: only paths under `video/` and `docs/superpowers/` (plus the already-untracked `CLAUDE.md`). `video/out` and `video/node_modules` must not appear (git-ignored).

- [ ] **Step 5: Write the README**

`video/README.md`:

````markdown
# Perch demo video

Remotion source for the 5-second drag-and-drop demo: three screenshots are selected on the
Perch shelf, dragged into an AI chat composer, dropped, and land as attachments.
1080 × 1350 (4:5), 30 fps, 150 frames.

```bash
npm install
npm run studio     # live preview, scrub the timeline
npm test           # unit tests for the pure timeline
npm run render     # writes out/perch-demo.mp4
npm run still -- out/f95.png --frame=95
```

## How it is built

- `src/timeline.ts` is the only place that knows *when* anything happens. It is pure:
  `sceneAt(frame)` returns everything to draw. Tune timing and springs there, and run
  `npm test` after.
- `src/perch.ts` holds Perch's tokens, copied from `src/renderer/src/styles.css` and
  `dragImage.ts` in the app (scaled 1.43x for phone legibility). They are copied rather than
  imported because the app CSS uses animations that Remotion cannot frame-sync. Do not add
  CSS `transition` or `animation` to anything under `src/`.

## Gotchas

- **Windows path length.** Remotion launches Chrome from `node_modules/.remotion/...`. If the
  full path exceeds 260 characters the render fails with
  `spawn ...\chrome-headless-shell.exe ENOENT`. Keep the checkout path short.
- **First render** downloads headless Chrome (~220 MB).
- **Fonts.** Text uses Segoe UI Variable / Segoe UI like the app; render on Windows.
- **Pixel format.** Frames are PNG so the MP4 is `yuv420p`; JPEG frames produce `yuvj420p`.
- **npm.** `.npmrc` sets `legacy-peer-deps=true`, as in the app, to avoid an npm 10 resolver crash.
````

- [ ] **Step 6: Commit**

```bash
git add video/README.md
git commit -m "README for the demo video project" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 7: Hand the MP4 to the user**

Report the path `video/out/perch-demo.mp4`, the verified `ffprobe` output, and anything that was tuned from the plan's starting values. Motion quality (easing, weight, trailing) cannot be judged from stills, so ask the user to watch it and list what to adjust; apply feedback as edits to `timeline.ts` constants, re-run `npm test`, and re-render.

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
| --- | --- |
| MP4 h264 yuv420p, 1080×1350, 30 fps, 150 frames | Task 1 (config), Task 5 (ffprobe) |
| Real Perch tokens and drag-image look | Task 1 `perch.ts`, Task 3 `PerchCard` |
| Desktop, chat window, composer, three cards, geometry | Task 1 `layout.ts`, Tasks 3 and 4 |
| Timeline: select, lift, drag, hover, release, tiles, hold | Task 2 (schedule + tests), Task 4 (stills) |
| Motion rules: bezier cursor, springs, press, shadows | Task 2 `timeline.ts`, Task 4 `Cursor`, `PerchCard` |
| No captions, logos, transitions | Global constraints; Task 3 and 4 stills checklists |
| Structure: `video/`, own package, git-ignored output | Task 1, Task 5 step 4 |
| Verification: stills, render, ffprobe | Task 3 step 7, Task 4 steps 5–6, Task 5 |
| User reviews motion on the MP4 | Task 5 step 7 |

**Deviations from the spec**, all refinements the spec allowed ("frame numbers are starting values"), found while validating this plan's code:

- Clicks at frames 11 / 20 / 29 (spec: 12 / 19 / 26), with grab at 39 (spec 34), lift at 40, drag 43–91 (spec 38–86), release at 114 (spec 112) and tiles from 115. The spec's 7-frame click spacing forced 4-frame card-to-card hops that peaked at 130 px/frame; 9-frame spacing gives 6–7 frames per hop.
- Cursor starts at (600, 660), not (500, 700): the longer approach was the fastest move in the video.
- Cursor easing is `bezier(0.35, 0, 0.35, 1)`, not `(0.45, 0, 0.15, 1)`: the latter peaks at 3.1× average speed.
- The composer rests one row tall (96 px) and opens to the spec's 616 × 252 rectangle as the stack arrives, so it never shows an empty attachment area.
- Perch's tilt perspective is scaled with the cards (`760 × 1.43 ≈ 1087 px`) so foreshortening matches the app at the larger size.
- The drag stack is near-opaque (0.96) rather than the app's 0.88, because overlapping translucent thumbnails look muddy at this size.

**Placeholder scan:** none. Every code step shows complete file contents.

**Type consistency:** `Scene`, `StackCard`, `CardIndex`, `Point`, `PerchCardProps`, `Composer({ expand, glow, tiles })` and `Cursor({ at, press, ripples })` are defined once and used with the same names and shapes in later tasks. `STACK_ORDER = [1, 0, 2]` matches the `[1, 0, 2]` assertion in the tests.

**Verified before writing:** the timeline module, its 23 tests and all component files were type-checked (strict, `noUncheckedIndexedAccess`) and the tests run against Remotion 4.0.534 in a throwaway copy; three stills (frames 11, 70, 149) were rendered from the components to confirm they run. Visual tuning (colours, spacing, motion feel) is expected during Task 4 step 6 and Task 5 step 7.
