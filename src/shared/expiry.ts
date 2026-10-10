export interface Expirable {
  createdAt: number
  pinned: boolean
}

const MINUTE = 60_000

/** When the item flies off, or null if pinned. */
export function expiresAt(item: Expirable, expiryMinutes: number): number | null {
  return item.pinned ? null : item.createdAt + expiryMinutes * MINUTE
}

export function isExpired(item: Expirable, now: number, expiryMinutes: number): boolean {
  const at = expiresAt(item, expiryMinutes)
  return at !== null && now >= at
}

export function splitExpired<T extends Expirable>(
  items: readonly T[],
  now: number,
  expiryMinutes: number
): { keep: T[]; expired: T[] } {
  const keep: T[] = []
  const expired: T[] = []
  for (const it of items) (isExpired(it, now, expiryMinutes) ? expired : keep).push(it)
  return { keep, expired }
}

/** Tooltip text: "Flies off in 12 min". */
export function flyOffLabel(expiresAtMs: number | null, now: number): string {
  if (expiresAtMs === null) return 'Pinned. Stays until you let it go.'
  const ms = expiresAtMs - now
  if (ms < MINUTE) return 'Flies off in under a minute'
  const mins = Math.ceil(ms / MINUTE)
  if (mins < 60) return `Flies off in ${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `Flies off in ${h} h` : `Flies off in ${h} h ${m} min`
}
