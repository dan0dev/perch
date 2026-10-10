import { Menu, Tray, app, nativeImage } from 'electron'
import iconPath from '../../resources/icon.ico?asset'
import pausedIconPath from '../../resources/icon-paused.ico?asset'

export const appIcon = (): Electron.NativeImage => nativeImage.createFromPath(iconPath)

export interface TrayHandlers {
  isShelfVisible: () => boolean
  toggleShelf: () => void
  isPaused: () => boolean
  setPaused: (paused: boolean) => void
  hasSnips: () => boolean
  shooAll: () => void
  openSettings: () => void
}

/** System tray icon: click toggles the shelf, right-click opens the menu. */
export class PerchTray {
  private readonly tray: Tray

  constructor(private readonly h: TrayHandlers) {
    this.tray = new Tray(appIcon())
    this.tray.setToolTip('Perch')
    this.tray.on('click', () => this.h.toggleShelf())
    this.tray.on('right-click', () => this.tray.popUpContextMenu(this.menu()))
  }

  setPaused(paused: boolean): void {
    this.tray.setImage(nativeImage.createFromPath(paused ? pausedIconPath : iconPath))
    this.tray.setToolTip(paused ? 'Perch is napping.' : 'Perch')
  }

  private menu(): Menu {
    return Menu.buildFromTemplate([
      { label: this.h.isShelfVisible() ? 'Hide shelf' : 'Show shelf', click: () => this.h.toggleShelf() },
      {
        label: 'Pause capture',
        type: 'checkbox',
        checked: this.h.isPaused(),
        click: (item) => this.h.setPaused(item.checked)
      },
      { label: 'Shoo everything', enabled: this.h.hasSnips(), click: () => this.h.shooAll() },
      { type: 'separator' },
      { label: 'Settings…', click: () => this.h.openSettings() },
      { label: 'Quit Perch', click: () => app.quit() }
    ])
  }

  destroy(): void {
    this.tray.destroy()
  }
}
