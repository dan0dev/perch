import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import { DEFAULT_SETTINGS, parseSettingsFile } from '../shared/settings'
import type { Settings } from '../shared/types'

const file = (): string => join(app.getPath('userData'), 'settings.json')

/** Reads settings.json from userData. Missing or broken files give defaults. */
export function loadSettings(): Settings {
  const path = file()
  if (!existsSync(path)) return { ...DEFAULT_SETTINGS }
  try {
    return parseSettingsFile(readFileSync(path, 'utf8'))
  } catch (err) {
    console.warn('[perch] could not read settings, using defaults:', err)
    return { ...DEFAULT_SETTINGS }
  }
}

/** Writes atomically so a crash mid-write can't leave half a file. */
export function saveSettings(s: Settings): void {
  const path = file()
  const tmp = `${path}.tmp`
  writeFileSync(tmp, JSON.stringify(s, null, 2) + '\n', 'utf8')
  renameSync(tmp, path)
}

export const settingsPath = file
