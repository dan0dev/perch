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
