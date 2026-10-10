export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height
}

/**
 * True when the pointer is over the spot where the shelf's cards appear,
 * whether the shelf is showing or not.
 */
export function inRevealZone(p: Point, shelf: Rect): boolean {
  return contains(shelf, p)
}
