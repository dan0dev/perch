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
