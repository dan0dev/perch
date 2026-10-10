import { join } from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { IPC } from '../shared/ipc'
import type { Edge, ShelfState } from '../shared/types'
import { appIcon } from './tray'

/** Window width in DIPs, including the transparent margin for the shadow. */
const WIDTH = 284
const MIN_HEIGHT = 120
const SCREEN_MARGIN = 12
const AUTO_HIDE_MS = 4000
/** Matches the CSS slide-out duration. */
const SLIDE_MS = 180

export function loadRenderer(win: BrowserWindow, hash: string): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(`${process.env.ELECTRON_RENDERER_URL}#${hash}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

export const secureWebPreferences = (): Electron.WebPreferences => ({
  preload: join(__dirname, '../preload/index.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
  spellcheck: false
})

/**
 * The shelf: a frameless, always-on-top, non-focusable window docked to a
 * screen edge. It never takes focus from the app you are working in.
 */
export class Shelf {
  readonly win: BrowserWindow
  private visible = false
  private hovering = false
  private busy = false
  private hideTimer: NodeJS.Timeout | null = null
  private concealTimer: NodeJS.Timeout | null = null
  private contentHeight = MIN_HEIGHT
  private rendererReady = false
  private lastState: ShelfState | null = null

  constructor(private edge: Edge) {
    this.win = new BrowserWindow({
      width: WIDTH,
      height: MIN_HEIGHT,
      show: false,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      focusable: false,
      hasShadow: false,
      title: 'Perch',
      icon: appIcon(),
      webPreferences: secureWebPreferences()
    })
    this.win.setAlwaysOnTop(true, 'pop-up-menu')
    this.win.setVisibleOnAllWorkspaces(true)
    loadRenderer(this.win, 'shelf')
    screen.on('display-metrics-changed', () => this.position())
    screen.on('display-removed', () => this.position())
  }

  get isVisible(): boolean {
    return this.visible
  }

  onRendererReady(): void {
    this.rendererReady = true
    if (this.lastState) this.win.webContents.send(IPC.state, this.lastState)
  }

  pushState(state: ShelfState): void {
    this.lastState = state
    if (this.rendererReady) this.win.webContents.send(IPC.state, state)
  }

  setEdge(edge: Edge): void {
    this.edge = edge
    this.position()
  }

  setContentHeight(px: number): void {
    if (!Number.isFinite(px)) return
    this.contentHeight = Math.max(MIN_HEIGHT, Math.ceil(px))
    this.position()
  }

  /** Slide in without taking focus. */
  show(): void {
    if (this.concealTimer) clearTimeout(this.concealTimer)
    this.concealTimer = null
    this.position()
    if (!this.win.isVisible()) this.win.showInactive()
    this.win.moveTop()
    if (!this.visible) {
      this.visible = true
      this.win.webContents.send(IPC.reveal, true)
    }
    this.scheduleHide()
  }

  hide(): void {
    this.clearHideTimer()
    if (!this.visible) return
    this.visible = false
    this.hovering = false
    this.win.webContents.send(IPC.reveal, false)
    if (this.concealTimer) clearTimeout(this.concealTimer)
    this.concealTimer = setTimeout(() => {
      this.concealTimer = null
      if (!this.visible) this.win.hide()
    }, SLIDE_MS + 20)
  }

  toggle(): void {
    if (this.visible) this.hide()
    else this.show()
  }

  setHover(hovering: boolean): void {
    this.hovering = hovering
    if (hovering) this.clearHideTimer()
    else this.scheduleHide()
  }

  /** Auto-hide is suspended while a drag or a Save dialog is in progress. */
  setBusy(busy: boolean): void {
    this.busy = busy
    if (busy) this.clearHideTimer()
    else this.scheduleHide()
  }

  private scheduleHide(): void {
    this.clearHideTimer()
    if (!this.visible || this.hovering || this.busy) return
    this.hideTimer = setTimeout(() => this.hide(), AUTO_HIDE_MS)
  }

  private clearHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = null
  }

  private position(): void {
    if (this.win.isDestroyed()) return
    const area = screen.getPrimaryDisplay().workArea
    const height = Math.min(this.contentHeight, area.height - SCREEN_MARGIN * 2)
    const x = this.edge === 'right' ? area.x + area.width - WIDTH : area.x
    const y = area.y + Math.round((area.height - height) / 2)
    this.win.setBounds({ x, y, width: WIDTH, height })
  }
}
