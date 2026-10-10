import type { Edge, Settings } from './types'

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  expiryMinutes: 15,
  hotkey: 'Control+Alt+S',
  edge: 'right',
  launchAtLogin: false
}

export const EXPIRY_MIN = 1
export const EXPIRY_MAX = 1440

const MODIFIERS = new Set([
  'Control', 'Ctrl', 'CommandOrControl', 'CmdOrCtrl', 'Alt', 'AltGr', 'Option',
  'Shift', 'Super', 'Meta', 'Command', 'Cmd'
])

const KEYS = new RegExp(
  '^(' +
    [
      '[A-Z0-9]', 'F([1-9]|1[0-9]|2[0-4])', 'Space', 'Tab', 'Backspace', 'Delete', 'Insert',
      'Return', 'Enter', 'Up', 'Down', 'Left', 'Right', 'Home', 'End', 'PageUp', 'PageDown',
      'Escape', 'Esc', 'Plus', 'PrintScreen', 'num[0-9]', '[-=\\[\\]\\\\;\',./`]'
    ].join('|') +
    ')$'
)

/**
 * Loose structural check for an Electron accelerator: at least one modifier
 * and exactly one non-modifier key, last. Whether the OS lets us register it
 * is only known when globalShortcut.register runs.
 */
export function isValidHotkey(accel: string): boolean {
  const parts = accel.split('+')
  if (parts.length < 2 || parts.some((p) => p === '')) return false
  const key = parts[parts.length - 1]!
  const mods = parts.slice(0, -1)
  if (!KEYS.test(key)) return false
  if (!mods.every((m) => MODIFIERS.has(m))) return false
  return new Set(mods).size === mods.length
}

const isEdge = (v: unknown): v is Edge => v === 'left' || v === 'right'

/** Turns whatever was in settings.json into valid settings, keeping what it can. */
export function normalizeSettings(raw: unknown): Settings {
  const out: Settings = { ...DEFAULT_SETTINGS }
  if (typeof raw !== 'object' || raw === null) return out
  const r = raw as Record<string, unknown>

  if (typeof r.expiryMinutes === 'number' && Number.isFinite(r.expiryMinutes)) {
    out.expiryMinutes = Math.min(EXPIRY_MAX, Math.max(EXPIRY_MIN, Math.round(r.expiryMinutes)))
  }
  if (typeof r.hotkey === 'string' && isValidHotkey(r.hotkey)) out.hotkey = r.hotkey
  if (isEdge(r.edge)) out.edge = r.edge
  if (typeof r.launchAtLogin === 'boolean') out.launchAtLogin = r.launchAtLogin
  return out
}

/** Same as normalizeSettings, but says what was wrong instead of fixing it silently. */
export function validateSettings(s: Settings): string | null {
  if (!Number.isInteger(s.expiryMinutes) || s.expiryMinutes < EXPIRY_MIN || s.expiryMinutes > EXPIRY_MAX) {
    return `Expiry must be a whole number of minutes from ${EXPIRY_MIN} to ${EXPIRY_MAX}.`
  }
  if (!isValidHotkey(s.hotkey)) {
    return 'Hotkey needs at least one of Ctrl, Alt, Shift or Win plus one other key.'
  }
  if (!isEdge(s.edge)) return 'Screen edge must be left or right.'
  return null
}

export interface KeyLike {
  key: string
  code: string
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
  metaKey: boolean
}

/**
 * Builds an accelerator from a keydown event. Returns null while only
 * modifiers are held. Uses `code` so Shift+1 gives "1", not "!".
 */
export function acceleratorFromKey(e: KeyLike): string | null {
  let key: string | null = null
  const c = e.code
  if (/^Key[A-Z]$/.test(c)) key = c.slice(3)
  else if (/^Digit[0-9]$/.test(c)) key = c.slice(5)
  else if (/^Numpad[0-9]$/.test(c)) key = 'num' + c.slice(6)
  else if (/^F([1-9]|1[0-9]|2[0-4])$/.test(c)) key = c
  else {
    const map: Record<string, string> = {
      Space: 'Space', Tab: 'Tab', Backspace: 'Backspace', Delete: 'Delete', Insert: 'Insert',
      Enter: 'Enter', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right',
      Home: 'Home', End: 'End', PageUp: 'PageUp', PageDown: 'PageDown', Escape: 'Escape',
      Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
      Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backquote: '`'
    }
    key = map[c] ?? null
  }
  if (key === null) return null

  const mods: string[] = []
  if (e.ctrlKey) mods.push('Control')
  if (e.altKey) mods.push('Alt')
  if (e.shiftKey) mods.push('Shift')
  if (e.metaKey) mods.push('Super')
  return [...mods, key].join('+')
}

/** "Control+Alt+S" → "Ctrl+Alt+S" for display. */
export function prettyHotkey(accel: string): string {
  return accel
    .split('+')
    .map((p) => (p === 'Control' || p === 'CommandOrControl' || p === 'CmdOrCtrl' ? 'Ctrl' : p === 'Super' || p === 'Meta' ? 'Win' : p))
    .join('+')
}
