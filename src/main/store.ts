import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { NativeImage } from 'electron'
import type { ClipImage } from './clipboard'
import { Deduper } from './lib/dedupe'
import { uniqueSnipName } from './lib/filename'
import { overCap } from './lib/cap'
import { expiresAt, splitExpired } from '../shared/expiry'
import type { ShelfItem } from '../shared/types'

/** Cards show every snip at the same 16:10 shape. */
const THUMB_W = 480
const THUMB_H = 300
const DRAG_ICON_WIDTH = 96

export interface Snip {
  id: string
  fileName: string
  filePath: string
  hash: string
  thumb: string
  dragIcon: NativeImage
  width: number
  height: number
  createdAt: number
  pinned: boolean
  dragged: boolean
}

function fit(img: NativeImage, maxW: number, maxH: number): NativeImage {
  const { width, height } = img.getSize()
  const scale = Math.min(1, maxW / width, maxH / height)
  if (scale === 1) return img
  return img.resize({
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    quality: 'good'
  })
}

/**
 * Crops to 16:10 like CSS object-fit: cover. Wide images keep their centre;
 * tall ones keep their top, where a page's useful part usually is.
 */
function cover(img: NativeImage, w: number, h: number): NativeImage {
  const { width, height } = img.getSize()
  const target = w / h
  let crop = { x: 0, y: 0, width, height }
  if (width / height > target) {
    const cw = Math.round(height * target)
    crop = { x: Math.round((width - cw) / 2), y: 0, width: cw, height }
  } else {
    crop = { x: 0, y: 0, width, height: Math.round(width / target) }
  }
  const cropped = img.crop(crop)
  const { width: cw2 } = cropped.getSize()
  return cw2 > w ? cropped.resize({ width: w, height: h, quality: 'good' }) : cropped
}

/**
 * Owns the snips: PNG files on disk in `dir`, dedupe and expiry.
 * Emits 'change' whenever the list changes.
 */
export class SnipStore extends EventEmitter {
  private items: Snip[] = [] // newest first
  private readonly dedupe = new Deduper()

  constructor(
    readonly dir: string,
    private readonly expiryMinutes: () => number
  ) {
    super()
  }

  /** Empty the folder. Sync, so it is safe on quit. */
  wipe(): void {
    rmSync(this.dir, { recursive: true, force: true, maxRetries: 3 })
    mkdirSync(this.dir, { recursive: true })
    this.items = []
    this.dedupe.clear()
  }

  list(): readonly Snip[] {
    return this.items
  }

  get(id: string): Snip | undefined {
    return this.items.find((s) => s.id === id)
  }

  markSelf(hash: string): void {
    this.dedupe.markSelf(hash)
  }

  /** Saves a new snip. Returns null if it is a duplicate. */
  async add({ png, image: img, hash }: ClipImage, now = new Date()): Promise<Snip | null> {
    if (this.dedupe.isDuplicate(hash)) return null
    const fileName = uniqueSnipName(now, (n) => this.items.some((s) => s.fileName === n) || existsSync(join(this.dir, n)))
    const filePath = join(this.dir, fileName)
    const id = randomUUID()
    // Claim the hash before awaiting so a second poll can't add it twice.
    this.dedupe.track(id, hash)

    try {
      mkdirSync(this.dir, { recursive: true })
      const tw = performance.now()
      await writeFile(filePath, png)
      if (process.env.PERCH_DEBUG) console.log(`[perch] write ${Math.round(performance.now() - tw)} ms`)
    } catch (err) {
      this.dedupe.untrack(id)
      throw err
    }

    const { width, height } = img.getSize()
    const snip: Snip = {
      id,
      fileName,
      filePath,
      hash,
      thumb: cover(img, THUMB_W, THUMB_H).toDataURL(),
      dragIcon: fit(img, DRAG_ICON_WIDTH, DRAG_ICON_WIDTH),
      width,
      height,
      createdAt: now.getTime(),
      pinned: false,
      dragged: false
    }
    this.items.unshift(snip)
    this.emit('change')
    // A long burst of copies shouldn't pile up: the oldest unpinned cards fly off early.
    const evict = overCap(this.items)
    if (evict.length) await this.remove(evict)
    return snip
  }

  async remove(ids: readonly string[]): Promise<void> {
    const gone = this.items.filter((s) => ids.includes(s.id))
    if (gone.length === 0) return
    this.items = this.items.filter((s) => !ids.includes(s.id))
    for (const s of gone) this.dedupe.untrack(s.id)
    this.emit('change')
    await Promise.all(gone.map((s) => rm(s.filePath, { force: true }).catch((err) => console.warn('[perch] could not delete', s.filePath, err))))
  }

  async clear(): Promise<void> {
    await this.remove(this.items.map((s) => s.id))
  }

  togglePin(id: string): void {
    const s = this.get(id)
    if (!s) return
    s.pinned = !s.pinned
    this.emit('change')
  }

  markDragged(ids: readonly string[]): void {
    let changed = false
    for (const s of this.items) {
      if (ids.includes(s.id) && !s.dragged) {
        s.dragged = true
        changed = true
      }
    }
    if (changed) this.emit('change')
  }

  /** Deletes expired snips. Returns how many flew off. */
  async sweep(now = Date.now()): Promise<number> {
    const { expired } = splitExpired(this.items, now, this.expiryMinutes())
    if (expired.length) await this.remove(expired.map((s) => s.id))
    return expired.length
  }

  toShelf(): ShelfItem[] {
    const minutes = this.expiryMinutes()
    return this.items.map((s) => ({
      id: s.id,
      fileName: s.fileName,
      thumb: s.thumb,
      width: s.width,
      height: s.height,
      createdAt: s.createdAt,
      expiresAt: expiresAt(s, minutes),
      pinned: s.pinned,
      dragged: s.dragged
    }))
  }
}
