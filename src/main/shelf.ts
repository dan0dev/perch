import { join } from 'node:path'
import { BrowserWindow, screen } from 'electron'
import { IPC } from '../shared/ipc'
import type { Edge, ShelfState } from '../shared/types'
import { appIcon } from './tray'
import { contains, inRevealZone, type Rect } from './lib/edgeZone'

/** Window width in DIPs, including the transparent margin for the shadow. */
const WIDTH = 284
const MIN_HEIGHT = 120
const SCREEN_MARGIN = 12
const AUTO_HIDE_MS = 4000
/** After an edge reveal, hide this soon once the pointer leaves. */
const EDGE_LEAVE_MS = 900
/** The pointer has to rest over the shelf's spot this long, so passing over it doesn't count. */
const EDGE_DWELL_MS = 300
const EDGE_POLL_MS = 120
/** Matches the CSS slide-out duration. */
const SLIDE_MS = 180

type ShowReason = 'snip' | 'user' | 'edge'

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
  /** Setting: never auto-hide while there are cards. */
  private alwaysOpen = false
  /** Hidden on purpose (hotkey or tray) while alwaysOpen is on; cleared by the next snip. */
  private userHidden = false
  private shownByEdge = false
  private edgePoll: NodeJS.Timeout | null = null
  private zoneSince: number | null = null

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
    // A reloaded renderer starts hidden; tell it where the shelf really is.
    if (this.visible) this.win.webContents.send(IPC.reveal, true)
  }

  pushState(state: ShelfState): void {
    this.lastState = state
    if (this.rendererReady) this.win.webContents.send(IPC.state, state)
    if (this.alwaysOpen) this.applyAlwaysOpen()
  }

  /** Setting: keep the shelf on screen while it has cards. */
  setAlwaysOpen(on: boolean): void {
    this.alwaysOpen = on
    this.userHidden = false
    if (on) this.applyAlwaysOpen()
    else this.scheduleHide()
  }

  /** Setting: slide out when the pointer rests where the cards appear. */
  setEdgeHover(on: boolean): void {
    if (on && !this.edgePoll) {
      this.edgePoll = setInterval(() => this.pollEdge(), EDGE_POLL_MS)
    } else if (!on && this.edgePoll) {
      clearInterval(this.edgePoll)
      this.edgePoll = null
      this.zoneSince = null
    }
  }

  private applyAlwaysOpen(): void {
    const count = this.lastState?.items.length ?? 0
    if (count > 0 && !this.visible && !this.userHidden) this.show('user')
    else if (count === 0 && this.visible && !this.shownByEdge) this.hide()
  }

  private pollEdge(): void {
    const p = screen.getCursorScreenPoint()
    if (!this.visible) {
      if (!inRevealZone(p, this.bounds())) {
        this.zoneSince = null
        return
      }
      this.zoneSince ??= Date.now()
      if (Date.now() - this.zoneSince >= EDGE_DWELL_MS) {
        this.zoneSince = null
        this.show('edge')
      }
    } else if (this.shownByEdge) {
      // The transparent margin around the cards gets no hover events, so watch the pointer here too.
      if (contains(this.bounds(), p)) this.clearHideTimer()
      else if (!this.hideTimer) this.scheduleHide()
    }
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
  show(reason: ShowReason = 'user'): void {
    this.userHidden = false
    this.shownByEdge = reason === 'edge'
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
    this.shownByEdge = false
    this.win.webContents.send(IPC.reveal, false)
    if (this.concealTimer) clearTimeout(this.concealTimer)
    this.concealTimer = setTimeout(() => {
      this.concealTimer = null
      if (!this.visible) this.win.hide()
    }, SLIDE_MS + 20)
  }

  toggle(): void {
    if (this.visible) {
      this.hide()
      this.userHidden = true
    } else {
      this.show('user')
    }
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
    if (this.alwaysOpen && !this.shownByEdge) return
    this.hideTimer = setTimeout(() => this.hide(), this.shownByEdge ? EDGE_LEAVE_MS : AUTO_HIDE_MS)
  }

  private clearHideTimer(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer)
    this.hideTimer = null
  }

  /** Where the shelf sits (or would sit) on the primary display. */
  private bounds(): Rect {
    const area = screen.getPrimaryDisplay().workArea
    const height = Math.min(this.contentHeight, area.height - SCREEN_MARGIN * 2)
    const x = this.edge === 'right' ? area.x + area.width - WIDTH : area.x
    const y = area.y + Math.round((area.height - height) / 2)
    return { x, y, width: WIDTH, height }
  }

  private position(): void {
    if (this.win.isDestroyed()) return
    this.win.setBounds(this.bounds())
  }
}
