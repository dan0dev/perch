/** The shelf holds at most this many cards. */
export const MAX_CARDS = 30

/**
 * Ids to drop so at most `cap` cards remain. `items` is newest first.
 * The oldest unpinned cards go first; pinned cards are never dropped, so
 * a shelf of pinned cards can exceed the cap.
 */
export function overCap<T extends { id: string; pinned: boolean }>(items: readonly T[], cap = MAX_CARDS): string[] {
  let excess = items.length - cap
  const out: string[] = []
  for (let i = items.length - 1; i >= 0 && excess > 0; i--) {
    const item = items[i]!
    if (item.pinned) continue
    out.push(item.id)
    excess--
  }
  return out
}
