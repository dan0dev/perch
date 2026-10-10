import { CARD_H, CARD_W, H, W } from './perch'

export interface Point {
  x: number
  y: number
}

export type CardIndex = 0 | 1 | 2
export const CARD_INDICES: readonly CardIndex[] = [0, 1, 2]
export const CARD_STEP = CARD_H + 22

export interface LayoutConfig {
  W: number
  H: number
  /** Left edge of the shelf cards, and the top of the first card. */
  shelfX: number
  cardTop: number
  window: { x: number; y: number; w: number; h: number }
  /** Composer: bottom-anchored. */
  composer: { x: number; w: number; bottom: number }
}

/** Everything that depends on the canvas shape: where the shelf, chat window, composer and tiles sit. */
export function makeLayout(c: LayoutConfig) {
  /** Composer rests one row tall and expands upward to hold the tiles. */
  const COMPOSER = { ...c.composer, restH: 96, fullH: 252 }
  const TILE = { w: 176, h: 110, gap: 14, padX: (COMPOSER.w - 3 * 176 - 2 * 14) / 2, padTop: 22 }

  const cardCenter = (i: CardIndex): Point => ({
    x: c.shelfX + CARD_W / 2,
    y: c.cardTop + CARD_H / 2 + CARD_STEP * i
  })
  const cardRect = (i: CardIndex): { x: number; y: number; w: number; h: number } => ({
    x: c.shelfX,
    y: c.cardTop + CARD_STEP * i,
    w: CARD_W,
    h: CARD_H
  })
  /** Where the pointer sits when it clicks a card (just off-centre so it doesn't hide the image). */
  const clickPoint = (i: CardIndex): Point => {
    const p = cardCenter(i)
    return { x: p.x - 29, y: p.y + 18 }
  }

  const composerHeight = (expand: number): number => COMPOSER.restH + (COMPOSER.fullH - COMPOSER.restH) * expand
  const composerTop = (expand: number): number => COMPOSER.bottom - composerHeight(expand)
  const tileCenter = (i: CardIndex): Point => ({
    x: COMPOSER.x + TILE.padX + i * (TILE.w + TILE.gap) + TILE.w / 2,
    y: COMPOSER.bottom - COMPOSER.fullH + TILE.padTop + TILE.h / 2
  })

  return {
    W: c.W,
    H: c.H,
    SHELF_X: c.shelfX,
    CARD_TOP: c.cardTop,
    WINDOW: c.window,
    COMPOSER,
    TILE,
    cardCenter,
    cardRect,
    clickPoint,
    composerHeight,
    composerTop,
    tileCenter,
    /** Where the drag ends: centre of the expanded composer. */
    DROP_CENTER: { x: COMPOSER.x + COMPOSER.w / 2, y: COMPOSER.bottom - COMPOSER.fullH / 2 } as Point
  }
}

export type Layout = ReturnType<typeof makeLayout>

/** 4:5 phone-first cut: the chat window and shelf sit side by side with almost no gap. */
export const PORTRAIT = makeLayout({
  W,
  H,
  shelfX: 714,
  cardTop: 269,
  window: { x: 36, y: 72, w: 680, h: 1168 },
  composer: { x: 68, w: 616, bottom: 1196 }
})

/** 16:10 cut: a wider chat window and a clear stretch of desktop between the composer and the shelf. */
export const WIDE = makeLayout({
  W: 1440,
  H: 900,
  shelfX: 1010,
  cardTop: 81,
  window: { x: 80, y: 56, w: 760, h: 752 },
  composer: { x: 112, w: 696, bottom: 764 }
})

export const LAYOUTS = { portrait: PORTRAIT, wide: WIDE } as const
export type Variant = keyof typeof LAYOUTS

/** The 4:5 layout's names, kept so the original code and tests read as before. */
export const { SHELF_X, CARD_TOP, WINDOW, COMPOSER, TILE, cardCenter, cardRect, composerHeight, composerTop, tileCenter, DROP_CENTER } = PORTRAIT
