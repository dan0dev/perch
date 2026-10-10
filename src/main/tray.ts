import { Menu, Tray, app, nativeImage } from 'electron'
import iconPath from '../../resources/icon.ico?asset'
import pausedIconPath from '../../resources/icon-paused.ico?asset'

export const appIcon = (): Electron.NativeImage => nativeImage.createFromPath(iconPath)

export interface TrayHandlers {
  isShelfVisible: () => boolean
  toggleShelf: () => void
}

/** System tray icon. Milestone 4 adds pause, clear all and settings. */
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
      { type: 'separator' },
      { label: 'Quit Perch', click: () => app.quit() }
    ])
  }

  destroy(): void {
    this.tray.destroy()
  }
}
