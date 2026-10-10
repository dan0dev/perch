import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { app, globalShortcut, ipcMain } from 'electron'
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

    ipcMain.on(IPC.startDrag, (e, ids: unknown) => {
      if (!Array.isArray(ids)) return
      const snips = ids.flatMap((id) => {
        const s = typeof id === 'string' ? store.get(id) : undefined
        return s && existsSync(s.filePath) ? [s] : []
      })
      const first = snips[0]
      if (!first) return
      shelf?.setDragging(true)
      try {
        // Blocks on Windows until the drop finishes or is cancelled.
        e.sender.startDrag({ file: first.filePath, files: snips.map((s) => s.filePath), icon: first.dragIcon })
        store.markDragged(snips.map((s) => s.id))
      } catch (err) {
        console.error('[perch] drag failed:', err)
      } finally {
        shelf?.setDragging(false)
      }
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
    if (!globalShortcut.register('Control+Alt+S', () => shelf?.toggle())) {
      console.warn('[perch] Ctrl+Alt+S is taken by another app.')
    }

    await watcher.start()
    pushState()
    console.log(`[perch] watching clipboard (${watcher.mode}), saving to ${store.dir}`)
  })

  // No windows in the taskbar: closing them must not quit the app.
  app.on('window-all-closed', () => {})
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    watcher?.stop()
    store.wipe()
  })
}
