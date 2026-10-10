/**
 * Decides whether a freshly captured image is new.
 *
 * Duplicate = same hash as a card currently on the shelf, or an image Perch
 * itself recently put on the clipboard.
 */
export class Deduper {
  private readonly live = new Map<string, string>() // id -> hash
  private readonly self: string[] = []

  constructor(private readonly selfLimit = 20) {}

  isDuplicate(hash: string): boolean {
    if (this.self.includes(hash)) return true
    for (const h of this.live.values()) if (h === hash) return true
    return false
  }

  track(id: string, hash: string): void {
    this.live.set(id, hash)
  }

  untrack(id: string): void {
    this.live.delete(id)
  }

  /** Remember an image Perch wrote to the clipboard so it is not re-captured. */
  markSelf(hash: string): void {
    if (this.self.includes(hash)) return
    this.self.push(hash)
    if (this.self.length > this.selfLimit) this.self.shift()
  }

  clear(): void {
    this.live.clear()
  }
}
