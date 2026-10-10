import { existsSync } from 'node:fs'
import { copyFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { Notification, app, dialog, globalShortcut, ipcMain, nativeImage, nativeTheme, shell } from 'electron'
import { ClipboardWatcher, writeClipImage } from './clipboard'
import { SnipStore, type Snip } from './store'
import { Shelf } from './shelf'
import { installNetGuard } from './netguard'
import { PerchTray, appIcon } from './tray'
import { loadSettings, saveSettings, settingsPath } from './settings'
import { closeSettings, openSettings } from './settingsWindow'
import { IPC } from '../shared/ipc'
import { prettyHotkey, validateSettings } from '../shared/settings'
import type { CardAction, Settings, SettingsResult } from '../shared/types'

/** How often expired snips are swept off the shelf and the disk. */
const SWEEP_MS = 5_000

// `--quit` only ever stops a running Perch; with none running it must not start one.
if (!app.requestSingleInstanceLock() || process.argv.includes('--quit')) {
  app.quit()
} else {
  app.setAppUserModelId('app.perch')
  nativeTheme.themeSource = 'dark' // dark title bar and tray menu

  let settings: Settings
  const store = new SnipStore(join(tmpdir(), 'Perch'), () => settings.expiryMinutes)
  let shelf: Shelf | null = null
  let watcher: ClipboardWatcher | null = null
  let tray: PerchTray | null = null

  const pushState = (): void => {
    shelf?.pushState({ items: store.toShelf(), paused: watcher?.isPaused ?? false, edge: settings.edge })
  }

  /** Plain, actionable messages. Errors only; Perch never nags. */
  const notify = (body: string): void => {
    console.warn('[perch]', body)
    if (Notification.isSupported()) new Notification({ title: 'Perch', body, icon: appIcon(), silent: true }).show()
  }

  const toggleShelf = (): void => shelf?.toggle()

  /** Swaps the global hotkey. Restores the old one if the new one is taken. */
  const applyHotkey = (next: string, prev: string | null): boolean => {
    if (prev === next && globalShortcut.isRegistered(next)) return true
    if (prev) globalShortcut.unregister(prev)
    let ok = false
    try {
      ok = globalShortcut.register(next, toggleShelf)
    } catch {
      ok = false
    }
    if (!ok && prev) globalShortcut.register(prev, toggleShelf)
    return ok
  }

  const applyLoginItem = (openAtLogin: boolean): void => {
    // In development this would register the bare electron.exe, so only the installed app does it.
    if (app.isPackaged) app.setLoginItemSettings({ openAtLogin })
  }

  const setPaused = (paused: boolean): void => {
    watcher?.setPaused(paused)
    tray?.setPaused(paused)
    pushState()
  }

  // ---------- Card actions ----------

  const copySnip = async (snip: Snip): Promise<void> => {
    try {
      const png = await readFile(snip.filePath)
      store.markSelf(snip.hash) // never re-capture our own copy
      await writeClipImage(png)
      await watcher?.ignoreCurrent()
    } catch (err) {
      notify(`Couldn't copy ${snip.fileName}. The file may be gone; take the snip again.`)
      console.error(err)
    }
  }

  const saveSnipAs = async (snip: Snip): Promise<void> => {
    shelf?.setBusy(true)
    try {
      const res = await dialog.showSaveDialog({
        title: 'Save snip',
        defaultPath: join(app.getPath('pictures'), snip.fileName),
        filters: [{ name: 'PNG image', extensions: ['png'] }]
      })
      if (!res.canceled && res.filePath) await copyFile(snip.filePath, res.filePath)
    } catch (err) {
      notify(`Couldn't save ${snip.fileName}: ${(err as Error).message}. Try another folder.`)
    } finally {
      shelf?.setBusy(false)
    }
  }

  const runAction = async (id: unknown, action: unknown): Promise<void> => {
    const snip = typeof id === 'string' ? store.get(id) : undefined
    if (!snip) return
    switch (action as CardAction) {
      case 'copy':
        return copySnip(snip)
      case 'save':
        return saveSnipAs(snip)
      case 'pin':
        return store.togglePin(snip.id)
      case 'delete':
        return store.remove([snip.id])
      case 'open': {
        // Opens in the default image viewer, to check a snip before sending it.
        const err = await shell.openPath(snip.filePath)
        if (err) notify(`Couldn't open ${snip.fileName}: ${err}. Drag it into an image app instead.`)
        return
      }
    }
  }

  // ---------- Settings ----------

  const updateSettings = (raw: unknown): SettingsResult => {
    if (typeof raw !== 'object' || raw === null) return { ok: false, error: 'Settings were not readable.', settings }
    const r = raw as Partial<Settings>
    const next: Settings = {
      expiryMinutes: Number(r.expiryMinutes),
      hotkey: String(r.hotkey ?? ''),
      edge: r.edge as Settings['edge'],
      launchAtLogin: r.launchAtLogin === true,
      alwaysOpen: r.alwaysOpen === true,
      showOnEdgeHover: r.showOnEdgeHover === true
    }
    const problem = validateSettings(next)
    if (problem) return { ok: false, error: problem, settings }

    if (next.hotkey !== settings.hotkey && !applyHotkey(next.hotkey, settings.hotkey)) {
      return {
        ok: false,
        error: `${prettyHotkey(next.hotkey)} is taken by another app. Pick a different one.`,
        settings
      }
    }
    try {
      saveSettings(next)
    } catch (err) {
      if (next.hotkey !== settings.hotkey) applyHotkey(settings.hotkey, next.hotkey)
      return { ok: false, error: `Couldn't save settings to ${settingsPath()}: ${(err as Error).message}`, settings }
    }

    const edgeChanged = next.edge !== settings.edge
    if (next.launchAtLogin !== settings.launchAtLogin) applyLoginItem(next.launchAtLogin)
    settings = next
    if (edgeChanged) shelf?.setEdge(next.edge)
    shelf?.setAlwaysOpen(next.alwaysOpen)
    shelf?.setEdgeHover(next.showOnEdgeHover)
    pushState() // expiry times shown on cards follow the new setting
    void store.sweep()
    return { ok: true, settings }
  }

  /** `Perch.exe --settings` opens settings, `--quit` quits a running Perch; anything else shows the shelf. */
  const handleArgs = (argv: readonly string[], firstRun: boolean): void => {
    if (argv.includes('--quit')) return void app.quit()
    if (argv.includes('--settings')) return openSettings()
    if (!firstRun) shelf?.show()
  }
  app.on('second-instance', (_e, argv) => handleArgs(argv, false))

  app.whenReady().then(async () => {
    installNetGuard()
    settings = loadSettings()
    store.wipe()

    shelf = new Shelf(settings.edge)
    shelf.setAlwaysOpen(settings.alwaysOpen)
    shelf.setEdgeHover(settings.showOnEdgeHover)
    tray = new PerchTray({
      isShelfVisible: () => shelf?.isVisible ?? false,
      toggleShelf,
      isPaused: () => watcher?.isPaused ?? false,
      setPaused,
      hasSnips: () => store.list().length > 0,
      shooAll: () => void store.clear(),
      openSettings
    })
    store.on('change', pushState)

    ipcMain.on(IPC.ready, () => shelf?.onRendererReady())
    ipcMain.on(IPC.hover, (_e, hovering: unknown) => shelf?.setHover(hovering === true))
    ipcMain.on(IPC.height, (_e, px: unknown) => {
      if (typeof px === 'number') shelf?.setContentHeight(px)
    })
    ipcMain.on(IPC.action, (_e, id: unknown, action: unknown) => void runAction(id, action))
    ipcMain.handle(IPC.getSettings, () => settings)
    ipcMain.handle(IPC.saveSettings, (_e, raw: unknown) => updateSettings(raw))
    ipcMain.on(IPC.closeSettings, () => closeSettings())
    ipcMain.handle(IPC.appInfo, () => ({
      version: app.getVersion(),
      isPackaged: app.isPackaged,
      settingsPath: settingsPath(),
      snipFolder: store.dir
    }))

    ipcMain.on(IPC.startDrag, (e, ids: unknown, dragImage: unknown) => {
      if (!Array.isArray(ids)) return
      const snips = ids.flatMap((id) => {
        const s = typeof id === 'string' ? store.get(id) : undefined
        return s && existsSync(s.filePath) ? [s] : []
      })
      const first = snips[0]
      if (!first) return
      const drawn =
        typeof dragImage === 'string' && dragImage.startsWith('data:image/png;base64,')
          ? nativeImage.createFromDataURL(dragImage)
          : null
      const icon = drawn && !drawn.isEmpty() ? drawn : first.dragIcon
      shelf?.setBusy(true)
      try {
        // Blocks on Windows until the drop finishes or is cancelled.
        e.sender.startDrag({ file: first.filePath, files: snips.map((s) => s.filePath), icon })
        store.markDragged(snips.map((s) => s.id))
      } catch (err) {
        console.error('[perch] drag failed:', err)
      } finally {
        shelf?.setBusy(false)
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
          shelf?.show('snip')
        })
        .catch((err) => notify(`Couldn't save the snip: ${(err as Error).message}. Check free space on your system drive.`))
    })

    if (!applyHotkey(settings.hotkey, null)) {
      notify(`${prettyHotkey(settings.hotkey)} is taken by another app. Pick a different hotkey in Settings.`)
    }

    setInterval(() => {
      if (store.list().length) store.sweep().catch((err) => console.error('[perch] sweep failed:', err))
    }, SWEEP_MS)

    await watcher.start()
    pushState()
    handleArgs(process.argv, true)
    console.log(`[perch] watching clipboard (${watcher.mode}), saving to ${store.dir}, expiry ${settings.expiryMinutes} min`)
  })

  // No windows in the taskbar: closing them must not quit the app.
  app.on('window-all-closed', () => {})
  app.on('will-quit', () => {
    globalShortcut.unregisterAll()
    tray?.destroy()
    watcher?.stop()
    store.wipe()
  })
}
