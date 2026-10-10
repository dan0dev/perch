import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  acceleratorFromKey,
  isValidHotkey,
  normalizeSettings,
  parseSettingsFile,
  prettyHotkey,
  validateSettings
} from '../src/shared/settings'

const key = (code: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) => ({
  key: '',
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods
})

describe('normalizeSettings', () => {
  it('returns defaults for garbage', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings('nope')).toEqual(DEFAULT_SETTINGS)
    expect(normalizeSettings([])).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid fields and drops invalid ones', () => {
    const s = normalizeSettings({ expiryMinutes: 30, hotkey: 'banana', edge: 'top', launchAtLogin: true })
    expect(s).toEqual({ ...DEFAULT_SETTINGS, expiryMinutes: 30, launchAtLogin: true })
  })

  it('clamps and rounds expiry', () => {
    expect(normalizeSettings({ expiryMinutes: 0 }).expiryMinutes).toBe(1)
    expect(normalizeSettings({ expiryMinutes: 99999 }).expiryMinutes).toBe(1440)
    expect(normalizeSettings({ expiryMinutes: 7.6 }).expiryMinutes).toBe(8)
    expect(normalizeSettings({ expiryMinutes: Number.NaN }).expiryMinutes).toBe(15)
  })

  it('does not share the defaults object', () => {
    const s = normalizeSettings(null)
    s.expiryMinutes = 99
    expect(DEFAULT_SETTINGS.expiryMinutes).toBe(15)
  })
})

describe('validateSettings', () => {
  it('accepts defaults', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS })).toBeNull()
  })
  it('explains bad values', () => {
    expect(validateSettings({ ...DEFAULT_SETTINGS, expiryMinutes: 0 })).toMatch(/1 to 1440/)
    expect(validateSettings({ ...DEFAULT_SETTINGS, hotkey: 'S' })).toMatch(/Hotkey/)
  })
})

describe('hotkeys', () => {
  it('validates accelerators', () => {
    expect(isValidHotkey('Control+Alt+S')).toBe(true)
    expect(isValidHotkey('Super+Shift+F12')).toBe(true)
    expect(isValidHotkey('S')).toBe(false)
    expect(isValidHotkey('Control+Alt')).toBe(false)
    expect(isValidHotkey('Control+Control+S')).toBe(false)
    expect(isValidHotkey('Control++S')).toBe(false)
  })

  it('builds accelerators from key events', () => {
    expect(acceleratorFromKey(key('KeyS', { ctrlKey: true, altKey: true }))).toBe('Control+Alt+S')
    expect(acceleratorFromKey(key('Digit1', { shiftKey: true, metaKey: true }))).toBe('Shift+Super+1')
    expect(acceleratorFromKey(key('ControlLeft', { ctrlKey: true }))).toBeNull()
    expect(acceleratorFromKey(key('F5', { altKey: true }))).toBe('Alt+F5')
  })

  it('pretty-prints for display', () => {
    expect(prettyHotkey('Control+Alt+S')).toBe('Ctrl+Alt+S')
    expect(prettyHotkey('Super+Shift+S')).toBe('Win+Shift+S')
  })
})

describe('parseSettingsFile', () => {
  it('reads a saved file', () => {
    const text = JSON.stringify({ expiryMinutes: 45, hotkey: 'Control+Shift+P', edge: 'left', launchAtLogin: true })
    expect(parseSettingsFile(text)).toEqual({ expiryMinutes: 45, hotkey: 'Control+Shift+P', edge: 'left', launchAtLogin: true })
  })
  it('falls back to defaults for broken JSON', () => {
    expect(parseSettingsFile('{ not json')).toEqual(DEFAULT_SETTINGS)
    expect(parseSettingsFile('')).toEqual(DEFAULT_SETTINGS)
  })
})
