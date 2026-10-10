// Generates every app icon from assets/perch.svg.
// Run with: npm run icons   (uses Electron's Chromium to rasterise the SVG)
//
// Outputs (committed, so builds don't need this script):
//   resources/icon.ico         app, window and tray icon (16-256 px)
//   resources/icon-paused.ico  tray icon while capture is paused (greyed)
//   build/icon.png             512 px, for electron-builder

const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const SVG = path.join(root, 'assets/perch.svg')
const ICO_SIZES = [16, 20, 24, 32, 40, 48, 64, 256]
const PAD = 0.04 // share of the square left empty on each side

/** Renders the SVG, trimmed to its drawing and centred, at each size. Returns RGBA + PNG per size. */
async function render(win, sizes, paused) {
  const svg = fs.readFileSync(SVG).toString('base64')
  return win.webContents.executeJavaScript(`(async () => {
    const img = new Image()
    img.src = 'data:image/svg+xml;base64,${svg}'
    await img.decode()
    const B = 1024, probe = new OffscreenCanvas(B, B).getContext('2d')
    probe.drawImage(img, 0, 0, B, B)
    const d = probe.getImageData(0, 0, B, B).data
    let x0 = B, y0 = B, x1 = 0, y1 = 0
    for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) if (d[(y * B + x) * 4 + 3] > 8) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y
    }
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1, side = Math.max(bw, bh)
    const out = []
    for (const s of ${JSON.stringify(sizes)}) {
      const c = new OffscreenCanvas(s, s), ctx = c.getContext('2d')
      ctx.imageSmoothingQuality = 'high'
      if (${paused}) { ctx.filter = 'grayscale(1)'; ctx.globalAlpha = 0.6 }
      const k = (s * (1 - 2 * ${PAD})) / side
      ctx.drawImage(img, x0, y0, bw, bh, (s - bw * k) / 2, (s - bh * k) / 2, bw * k, bh * k)
      const rgba = Array.from(ctx.getImageData(0, 0, s, s).data)
      const png = new Uint8Array(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer())
      out.push({ size: s, rgba, png: Array.from(png) })
    }
    return out
  })()`)
}

/** 32-bit BMP icon entry (BGRA bottom-up rows plus an empty AND mask). */
function bmpEntry(size, rgba) {
  const header = Buffer.alloc(40)
  header.writeUInt32LE(40, 0)
  header.writeInt32LE(size, 4)
  header.writeInt32LE(size * 2, 8) // XOR + AND mask
  header.writeUInt16LE(1, 12)
  header.writeUInt16LE(32, 14)
  const pixels = Buffer.alloc(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const src = ((size - 1 - y) * size + x) * 4
      const dst = (y * size + x) * 4
      pixels[dst] = rgba[src + 2]
      pixels[dst + 1] = rgba[src + 1]
      pixels[dst + 2] = rgba[src]
      pixels[dst + 3] = rgba[src + 3]
    }
  }
  const maskRow = Math.ceil(size / 32) * 4
  return Buffer.concat([header, pixels, Buffer.alloc(maskRow * size)])
}

function writeIco(file, images) {
  const entries = images.map(({ size, rgba, png }) =>
    size >= 256 ? Buffer.from(png) : bmpEntry(size, rgba)
  )
  const dir = Buffer.alloc(6 + 16 * images.length)
  dir.writeUInt16LE(0, 0)
  dir.writeUInt16LE(1, 2)
  dir.writeUInt16LE(images.length, 4)
  let offset = dir.length
  images.forEach(({ size }, i) => {
    const e = 6 + i * 16
    dir.writeUInt8(size >= 256 ? 0 : size, e)
    dir.writeUInt8(size >= 256 ? 0 : size, e + 1)
    dir.writeUInt16LE(1, e + 4)
    dir.writeUInt16LE(32, e + 6)
    dir.writeUInt32LE(entries[i].length, e + 8)
    dir.writeUInt32LE(offset, e + 12)
    offset += entries[i].length
  })
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, Buffer.concat([dir, ...entries]))
  console.log('wrote', path.relative(root, file))
}

app.disableHardwareAcceleration()
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, webPreferences: { offscreen: true } })
  await win.loadURL('data:text/html,<html></html>')

  writeIco(path.join(root, 'resources/icon.ico'), await render(win, ICO_SIZES, false))
  writeIco(path.join(root, 'resources/icon-paused.ico'), await render(win, ICO_SIZES, true))

  const [big] = await render(win, [512], false)
  fs.mkdirSync(path.join(root, 'build'), { recursive: true })
  fs.writeFileSync(path.join(root, 'build/icon.png'), Buffer.from(big.png))
  console.log('wrote build/icon.png')
  app.quit()
})
