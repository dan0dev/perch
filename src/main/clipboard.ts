import { createHash } from 'node:crypto'
import { clipboard, nativeImage, ClipboardItem, type NativeImage } from 'electron'

/** Polling interval when GetClipboardSequenceNumber is available. */
const FFI_INTERVAL_MS = 300
/** Polling interval for the fallback, which has to read and hash the image. */
const FALLBACK_INTERVAL_MS = 1000
/** Snipping Tool can render the clipboard lazily; give it one more chance. */
const RETRY_EMPTY_MS = 150
const PNG = 'image/png'

export type WatchMode = 'ffi' | 'fallback'

export interface ClipImage {
  png: Buffer
  image: NativeImage
  hash: string
}

type SeqFn = () => number

function loadSequenceNumber(): SeqFn | null {
  if (process.platform !== 'win32' || process.env.PERCH_NO_FFI === '1') return null
  try {
    const koffi = require('koffi') as typeof import('koffi')
    const user32 = koffi.load('user32.dll')
    const fn = user32.func('uint32_t __stdcall GetClipboardSequenceNumber()') as () => number
    fn() // make sure it actually runs
    return fn
  } catch (err) {
    console.warn('[perch] FFI unavailable, using fallback clipboard watcher:', err)
    return null
  }
}

export function hashImage(img: NativeImage): string {
  const { width, height } = img.getSize()
  return createHash('sha1').update(`${width}x${height}:`).update(img.toBitmap()).digest('hex')
}

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

/**
 * Reads the clipboard image as PNG, or null if there is none.
 * Only ever asks for image/png, so text is never read.
 */
async function readClipImage(): Promise<ClipImage | null> {
  if (!(await clipboard.has(PNG))) return null
  const items = await clipboard.read()
  const item = items.find((i) => i.types.includes(PNG))
  if (!item) return null
  const blob = (await item.getType(PNG)) as Blob
  const png = Buffer.from(await blob.arrayBuffer())
  const image = nativeImage.createFromBuffer(png)
  if (image.isEmpty()) return null
  return { png, image, hash: hashImage(image) }
}

/** Puts a PNG on the clipboard. */
export async function writeClipImage(png: Buffer): Promise<void> {
  await clipboard.write([new ClipboardItem({ [PNG]: new Blob([new Uint8Array(png)], { type: PNG }) })])
}

/**
 * Watches the clipboard for new images. Electron has no change event, so
 * this polls the cheap Win32 sequence number and reads only on change.
 */
export class ClipboardWatcher {
  readonly mode: WatchMode
  private readonly seq: SeqFn | null
  private timer: NodeJS.Timeout | null = null
  private lastSeq = -1
  private lastHash: string | null = null
  private paused = false
  private busy = false

  constructor(private readonly onImage: (clip: ClipImage) => void) {
    this.seq = loadSequenceNumber()
    this.mode = this.seq ? 'ffi' : 'fallback'
  }

  async start(): Promise<void> {
    if (this.timer) return
    await this.baseline()
    const interval = this.seq ? FFI_INTERVAL_MS : FALLBACK_INTERVAL_MS
    this.timer = setInterval(() => void this.tick(), interval)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  get isPaused(): boolean {
    return this.paused
  }

  setPaused(paused: boolean): void {
    if (paused === this.paused) return
    this.paused = paused
    // Whatever was copied while napping stays uncaught.
    if (!paused) void this.baseline()
  }

  /** Call right after Perch writes to the clipboard so it is not re-captured. */
  async ignoreCurrent(): Promise<void> {
    await this.baseline()
  }

  /** Treat the current clipboard as already seen. */
  private async baseline(): Promise<void> {
    if (this.seq) {
      this.lastSeq = this.seq()
    } else {
      this.lastHash = (await readClipImage().catch(() => null))?.hash ?? null
    }
  }

  private async tick(): Promise<void> {
    if (this.paused || this.busy) return
    this.busy = true
    try {
      if (this.seq) await this.tickSeq()
      else await this.tickFallback()
    } catch (err) {
      console.warn('[perch] clipboard read failed:', err)
    } finally {
      this.busy = false
    }
  }

  private async tickSeq(): Promise<void> {
    const s = this.seq!()
    if (s === this.lastSeq) return
    this.lastSeq = s
    let clip = await readClipImage().catch(() => null)
    if (!clip && (await clipboard.has(PNG).catch(() => false))) {
      // Image announced but not readable yet (delayed rendering or clipboard busy).
      await wait(RETRY_EMPTY_MS)
      clip = await readClipImage()
    }
    if (clip && !this.paused) this.onImage(clip)
  }

  private async tickFallback(): Promise<void> {
    const clip = await readClipImage()
    if (!clip) {
      this.lastHash = null
      return
    }
    if (clip.hash === this.lastHash) return
    this.lastHash = clip.hash
    if (!this.paused) this.onImage(clip)
  }
}
