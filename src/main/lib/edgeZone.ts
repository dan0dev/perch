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

/** How thick the hot strip along the screen edge is, in DIPs. */
export const EDGE_ZONE_PX = 2

/**
 * True when the pointer rests in the thin strip along the shelf's screen
 * edge, within the shelf's own height (so corners, where close buttons and
 * the Start button live, never trigger it).
 */
export function inEdgeZone(p: Point, shelf: Rect, edge: 'left' | 'right', area: Rect): boolean {
  if (p.y < shelf.y || p.y >= shelf.y + shelf.height) return false
  if (edge === 'right') {
    const right = area.x + area.width
    return p.x >= right - EDGE_ZONE_PX && p.x < right
  }
  return p.x >= area.x && p.x < area.x + EDGE_ZONE_PX
}

export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height
}
