import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, ipcMain } from 'electron'
import { ClipboardWatcher } from './clipboard'
import { SnipStore } from './store'
import { Shelf } from './shelf'
import { installNetGuard } from './netguard'
import { IPC } from '../shared/ipc'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.setAppUserModelId('app.perch')
  const store = new SnipStore(join(tmpdir(), 'Perch'), () => 15)
  let shelf: Shelf | null = null
  let watcher: ClipboardWatcher | null = null

  const pushState = (): void => {
    shelf?.pushState({ items: store.toShelf(), paused: watcher?.isPaused ?? false, edge: 'right' })
  }

  app.on('second-instance', () => shelf?.show())

  app.whenReady().then(async () => {
    installNetGuard()
    store.wipe()

    shelf = new Shelf('right')
    store.on('change', pushState)

    ipcMain.on(IPC.ready, () => shelf?.onRendererReady())
    ipcMain.on(IPC.hover, (_e, hovering: unknown) => shelf?.setHover(hovering === true))
    ipcMain.on(IPC.height, (_e, px: unknown) => {
      if (typeof px === 'number') shelf?.setContentHeight(px)
    })

    watcher = new ClipboardWatcher((clip) => {
      const t0 = performance.now()
      store
        .add(clip)
        .then((snip) => {
          if (!snip) return console.log('[perch] duplicate image skipped')
          const ms = Math.round(performance.now() - t0)
          console.log(`[perch] captured ${snip.fileName} ${snip.width}x${snip.height} in ${ms} ms`)
          shelf?.show()
        })
        .catch((err) => console.error('[perch] could not save snip:', err))
    })
    await watcher.start()
    pushState()
    console.log(`[perch] watching clipboard (${watcher.mode}), saving to ${store.dir}`)
  })

  // No windows in the taskbar: closing them must not quit the app.
  app.on('window-all-closed', () => {})
  app.on('will-quit', () => {
    watcher?.stop()
    store.wipe()
  })
}
