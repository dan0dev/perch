import { useEffect, useState, type KeyboardEvent } from 'react'
import type { AppInfo, Edge, Settings } from '@shared/types'
import { EXPIRY_MAX, EXPIRY_MIN, acceleratorFromKey, prettyHotkey } from '@shared/settings'
import logoUrl from '../../../assets/perch.svg'

const PRESETS = [5, 15, 30, 60, 240]

const presetLabel = (m: number): string => (m < 60 ? `${m} min` : `${m / 60} h`)

function Switch({ on, labelledBy, onToggle }: { on: boolean; labelledBy: string; onToggle: () => void }): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelledBy}
      className={on ? 's-switch is-on' : 's-switch'}
      onClick={onToggle}
    >
      <span />
    </button>
  )
}

export function SettingsView(): React.JSX.Element {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [info, setInfo] = useState<AppInfo | null>(null)
  const [expiryText, setExpiryText] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    void window.perch.getSettings().then((s) => {
      setSettings(s)
      setExpiryText(String(s.expiryMinutes))
    })
    void window.perch.appInfo().then(setInfo)
  }, [])

  // Settings apply as soon as they change, like Windows Settings.
  const apply = async (patch: Partial<Settings>): Promise<void> => {
    if (!settings) return
    const res = await window.perch.saveSettings({ ...settings, ...patch })
    setSettings(res.settings)
    setExpiryText(String(res.settings.expiryMinutes))
    setError(res.ok ? null : (res.error ?? 'That setting could not be saved.'))
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 1400)
    }
  }

  const commitExpiry = (): void => {
    if (!settings) return
    const n = Number(expiryText.trim())
    if (expiryText.trim() === '' || n === settings.expiryMinutes) {
      setExpiryText(String(settings.expiryMinutes))
      return
    }
    void apply({ expiryMinutes: n })
  }

  const onHotkeyKey = (e: KeyboardEvent<HTMLButtonElement>): void => {
    if (!capturing) return
    e.preventDefault()
    if (e.key === 'Escape') return setCapturing(false)
    const accel = acceleratorFromKey(e)
    if (!accel) return // only modifiers so far
    setCapturing(false)
    void apply({ hotkey: accel })
  }

  if (!settings) return <main className="settings" />

  return (
    <main className="settings">
      <header className="s-head">
        <img src={logoUrl} alt="" width={36} height={36} />
        <div>
          <h1>Perch</h1>
          <p>{info ? `Version ${info.version}` : ' '}</p>
        </div>
        <span className={saved ? 'saved is-on' : 'saved'} aria-live="polite">
          {saved ? 'Saved' : ''}
        </span>
      </header>

      {error && (
        <p className="s-error" role="alert">
          {error}
        </p>
      )}

      <section className="s-group">
        <label className="s-label" htmlFor="expiry">
          Snips fly off after
        </label>
        <div className="s-row">
          <input
            id="expiry"
            className="s-input"
            type="number"
            inputMode="numeric"
            min={EXPIRY_MIN}
            max={EXPIRY_MAX}
            value={expiryText}
            onChange={(e) => setExpiryText(e.target.value)}
            onBlur={commitExpiry}
            onKeyDown={(e) => e.key === 'Enter' && commitExpiry()}
          />
          <span className="s-unit">minutes</span>
        </div>
        <div className="s-presets" role="group" aria-label="Quick picks">
          {PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className={settings.expiryMinutes === m ? 's-chip is-on' : 's-chip'}
              aria-pressed={settings.expiryMinutes === m}
              onClick={() => void apply({ expiryMinutes: m })}
            >
              {presetLabel(m)}
            </button>
          ))}
        </div>
        <p className="s-hint">
          From {EXPIRY_MIN} minute to {EXPIRY_MAX / 60} hours. Applies to snips already on the shelf. Pinned snips stay
          until you unpin them.
        </p>
      </section>

      <section className="s-group">
        <span className="s-label" id="hotkey-label">
          Show or hide the shelf
        </span>
        <button
          type="button"
          className={capturing ? 's-key is-capturing' : 's-key'}
          aria-labelledby="hotkey-label"
          onClick={() => setCapturing(true)}
          onKeyDown={onHotkeyKey}
          onBlur={() => setCapturing(false)}
        >
          {capturing ? 'Press the new keys…' : prettyHotkey(settings.hotkey)}
        </button>
        <p className="s-hint">{capturing ? 'Esc cancels.' : 'Click, then press a combination with Ctrl, Alt, Shift or Win.'}</p>
      </section>

      <section className="s-group">
        <span className="s-label" id="edge-label">
          Screen edge
        </span>
        <div className="s-segment" role="radiogroup" aria-labelledby="edge-label">
          {(['left', 'right'] as Edge[]).map((edge) => (
            <button
              key={edge}
              type="button"
              role="radio"
              aria-checked={settings.edge === edge}
              className={settings.edge === edge ? 'is-on' : undefined}
              onClick={() => void apply({ edge })}
            >
              {edge === 'left' ? 'Left' : 'Right'}
            </button>
          ))}
        </div>
      </section>

      <section className="s-group">
        <div className="s-toggle-row">
          <div>
            <span className="s-label" id="open-label">
              Keep the shelf open
            </span>
            <p className="s-hint">It stays on screen while it has cards. The hotkey still hides it.</p>
          </div>
          <Switch
            on={settings.alwaysOpen}
            labelledBy="open-label"
            onToggle={() => void apply({ alwaysOpen: !settings.alwaysOpen })}
          />
        </div>
        <div className="s-toggle-row">
          <div>
            <span className="s-label" id="edge-hover-label">
              Show at the screen edge
            </span>
            <p className="s-hint">Rest the pointer at the {settings.edge} edge of the screen for a moment.</p>
          </div>
          <Switch
            on={settings.showOnEdgeHover}
            labelledBy="edge-hover-label"
            onToggle={() => void apply({ showOnEdgeHover: !settings.showOnEdgeHover })}
          />
        </div>
      </section>

      <section className="s-group s-toggle-row">
        <div>
          <span className="s-label" id="login-label">
            Launch at login
          </span>
          {info && !info.isPackaged && <p className="s-hint">Takes effect in the installed app.</p>}
        </div>
        <Switch
          on={settings.launchAtLogin}
          labelledBy="login-label"
          onToggle={() => void apply({ launchAtLogin: !settings.launchAtLogin })}
        />
      </section>

      <footer className="s-foot">
        <p className="s-path" title={info?.settingsPath}>
          Snips live in {info?.snipFolder ?? '…'} and are cleared on quit.
        </p>
        <button type="button" className="s-done" onClick={() => window.perch.closeSettings()}>
          Done
        </button>
      </footer>
    </main>
  )
}
