export type Edge = 'left' | 'right'

export interface Settings {
  /** Minutes before an unpinned snip is deleted. */
  expiryMinutes: number
  /** Electron accelerator that toggles the shelf, e.g. "Control+Alt+S". */
  hotkey: string
  edge: Edge
  launchAtLogin: boolean
  /** Never auto-hide the shelf while it has cards. */
  alwaysOpen: boolean
  /** Slide the shelf out when the pointer rests at its screen edge. */
  showOnEdgeHover: boolean
}

/** What the renderer needs to draw one card. */
export interface ShelfItem {
  id: string
  fileName: string
  /** Small PNG data URL. */
  thumb: string
  width: number
  height: number
  createdAt: number
  /** Epoch ms, or null when pinned. */
  expiresAt: number | null
  pinned: boolean
  dragged: boolean
}

export interface ShelfState {
  items: ShelfItem[]
  paused: boolean
  edge: Edge
}

export type CardAction = 'copy' | 'save' | 'delete' | 'pin' | 'open'

export interface SettingsResult {
  ok: boolean
  /** Plain message when ok is false. */
  error?: string
  settings: Settings
}

export interface AppInfo {
  version: string
  isPackaged: boolean
  settingsPath: string
  snipFolder: string
}

/** The API exposed on window.perch by the preload script. */
export interface PerchApi {
  onState(cb: (state: ShelfState) => void): () => void
  onReveal(cb: (visible: boolean) => void): () => void
  ready(): void
  /** `dragImage` is a PNG data URL drawn by the renderer; main falls back to the thumbnail. */
  startDrag(ids: string[], dragImage?: string): void
  action(id: string, action: CardAction): void
  setHover(hovering: boolean): void
  reportHeight(px: number): void
  getSettings(): Promise<Settings>
  saveSettings(next: Settings): Promise<SettingsResult>
  closeSettings(): void
  appInfo(): Promise<AppInfo>
}
