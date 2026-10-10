const BOX = 112
const PAD = 10

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/**
 * Draws the image shown under the pointer while dragging: a translucent
 * thumbnail, plus a count badge when more than one snip is in the drag.
 * Returns a PNG data URL, or undefined if the thumbnail isn't ready.
 */
export function drawDragImage(img: HTMLImageElement, count: number, accent: string, accentInk: string): string | undefined {
  if (!img.complete || img.naturalWidth === 0) return undefined
  const scale = Math.min(BOX / img.naturalWidth, BOX / img.naturalHeight)
  const w = Math.round(img.naturalWidth * scale)
  const h = Math.round(img.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w + PAD * 2
  canvas.height = h + PAD * 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return undefined

  // Stacked edge hints that there is more than one file.
  if (count > 1) {
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#3a3a3a'
    roundRect(ctx, PAD + 5, PAD - 4, w - 10, h, 6)
    ctx.fill()
  }

  ctx.globalAlpha = 0.88
  ctx.save()
  roundRect(ctx, PAD, PAD, w, h, 6)
  ctx.clip()
  ctx.drawImage(img, PAD, PAD, w, h)
  ctx.restore()
  ctx.globalAlpha = 1
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1
  roundRect(ctx, PAD + 0.5, PAD + 0.5, w - 1, h - 1, 6)
  ctx.stroke()

  if (count > 1) {
    const label = String(count)
    ctx.font = '600 12px "Segoe UI Variable Text", "Segoe UI", sans-serif'
    const bw = Math.max(22, ctx.measureText(label).width + 12)
    const bx = PAD + w - bw / 2 - 2
    const by = 12
    ctx.fillStyle = accent
    roundRect(ctx, bx - bw / 2, by - 11, bw, 22, 11)
    ctx.fill()
    ctx.fillStyle = accentInk
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, bx, by + 0.5)
  }
  return canvas.toDataURL('image/png')
}
