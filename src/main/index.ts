import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app } from 'electron'
import { ClipboardWatcher } from './clipboard'
import { SnipStore } from './store'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  const store = new SnipStore(join(tmpdir(), 'Perch'), () => 15)

  app.whenReady().then(() => {
    store.wipe()
    const watcher = new ClipboardWatcher((clip) => {
      const t0 = performance.now()
      store
        .add(clip)
        .then((snip) => {
          if (!snip) return console.log('[perch] duplicate image skipped')
          const ms = Math.round(performance.now() - t0)
          console.log(`[perch] captured ${snip.fileName} ${snip.width}x${snip.height} in ${ms} ms -> ${snip.filePath}`)
        })
        .catch((err) => console.error('[perch] could not save snip:', err))
    })
    void watcher.start().then(() => console.log(`[perch] watching clipboard (${watcher.mode}), saving to ${store.dir}`))
  })

  app.on('will-quit', () => store.wipe())
}
