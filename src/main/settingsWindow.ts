import { BrowserWindow } from 'electron'
import { loadRenderer, secureWebPreferences } from './shelf'
import { appIcon } from './tray'

let win: BrowserWindow | null = null

/** Opens the settings window, or brings it forward if it is already open. */
export function openSettings(): void {
  if (win && !win.isDestroyed()) {
    if (win.isMinimized()) win.restore()
    win.focus()
    return
  }
  win = new BrowserWindow({
    width: 440,
    height: 640,
    useContentSize: true,
    resizable: false,
    maximizable: false,
    minimizable: true,
    fullscreenable: false,
    show: false,
    title: 'Perch Settings',
    icon: appIcon(),
    backgroundColor: '#11161d',
    autoHideMenuBar: true,
    webPreferences: secureWebPreferences()
  })
  win.setMenu(null)
  loadRenderer(win, 'settings')
  win.once('ready-to-show', () => win?.show())
  win.on('closed', () => {
    win = null
  })
}

export function closeSettings(): void {
  win?.close()
}
