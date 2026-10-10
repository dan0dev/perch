export interface Shown<T> {
  item: T
  leaving: boolean
}

/**
 * Merges a new item list with what is on screen so removed cards can stay
 * a moment longer, marked `leaving`, at the spot they occupied.
 */
export function mergeLeaving<T extends { id: string }>(prev: readonly Shown<T>[], next: readonly T[]): Shown<T>[] {
  const nextIds = new Set(next.map((i) => i.id))
  const out: Shown<T>[] = next.map((item) => ({ item, leaving: false }))
  const at = (id: string): number => out.findIndex((s) => s.item.id === id)
  prev.forEach((p, index) => {
    if (nextIds.has(p.item.id)) return
    const ghost = { item: p.item, leaving: true }
    // Sit right after the neighbour that was above it, or else right before the one below it.
    const above = index > 0 ? at(prev[index - 1]!.item.id) : -1
    if (above >= 0) return void out.splice(above + 1, 0, ghost)
    const below = prev.slice(index + 1).map((s) => at(s.item.id)).find((i) => i >= 0)
    out.splice(below ?? out.length, 0, ghost)
  })
  return out
}

/** Drops the given leaving ghosts once their animation is done. */
export function dropLeaving<T extends { id: string }>(shown: readonly Shown<T>[], ids: ReadonlySet<string>): Shown<T>[] {
  return shown.filter((s) => !(s.leaving && ids.has(s.item.id)))
}
