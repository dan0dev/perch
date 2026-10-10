# Perch guide

Everything the README leaves out.

## All the ways to use it

| Do this | To |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> | Show or hide the shelf (change it in Settings). |
| Click a card | Select it. Drag any selected card to take them all; **Clear** under the cards deselects. |
| Double-click a card | Open it in your default image viewer. |
| **…** on a card (on hover) | Copy, Save as…, Pin, Delete. |
| Pin | Keep a card past its expiry. Click the pin badge to unpin. |
| Rest the pointer where the cards appear | Slides the shelf out, if *Show on hover* is on. |
| Tray icon, click | Show or hide the shelf. |
| Tray icon, right-click | Pause capture, Shoo everything, Settings, Quit. |

Hover a card to see how long it has left. The shelf holds up to 30 cards: when more arrive, the
oldest unpinned ones fly off early.

## Settings

Right-click the tray icon → **Settings…**. Changes apply right away.

- **Snips fly off after**: 1 minute to 24 hours (default 15 minutes). Applies to cards already
  on the shelf.
- **Hotkey** to show or hide the shelf.
- **Screen edge**: left or right.
- **Keep the shelf open**: it stays on screen while it has cards (the hotkey still hides it).
- **Show on hover**: rest the pointer for a moment over the spot where the cards appear and they
  slide out. Just passing over it doesn't trigger it.
- **Launch at login.**

Settings are saved in `%APPDATA%\Perch\settings.json`. From a terminal, `Perch.exe --settings`
opens settings and `Perch.exe --quit` quits a running Perch.

## Install options

- `Perch-Setup-x.y.z.exe`: one click, no admin rights, installs just for you, uninstalls from
  *Settings → Apps*.
- `Perch-x.y.z-win-x64.zip`: no installer. Unzip anywhere and run `Perch.exe`. Keep the folder
  where it is if you turn on *Launch at login*.
- `SHA256SUMS.txt`: check a download with `Get-FileHash .\Perch-Setup-0.1.0.exe`.

Every release is built from the tagged source by
[GitHub Actions](../.github/workflows/release.yml).

## Known limits

- **SmartScreen warning** on first run, until the project is code-signed: click
  **More info → Run anyway**.
- **Apps running as administrator** don't accept drops from normal apps; Windows blocks it. Use
  **… → Copy** and paste instead.
- **Size.** Perch is built on Electron: the installer is about 100 MB and the app takes about
  320 MB on disk. While idle it uses well under 1% of one CPU core.
- **Windows only**, and the shelf always appears on the main display.
- If another app already uses <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd>, Perch tells you, and
  you can pick a different hotkey in Settings.

## Privacy in detail

- No network calls of any kind: no telemetry, no update checks. The app also cancels any
  outgoing request from its own windows.
- It only ever asks the clipboard for images, never text.
- Images are written to `%TEMP%\Perch`, deleted when they expire, and the folder is emptied when
  Perch starts and quits.

## Development

Other scripts: `npm run typecheck`, `npm run build:dir` (unpacked app only, faster),
`npm run icons` (regenerate icons from `assets/perch.svg`). `.npmrc` sets `legacy-peer-deps`
to work around an npm 10 resolver crash.

How it works: Electron has no clipboard-change event, so Perch polls the cheap Win32
`GetClipboardSequenceNumber` (through [koffi](https://koffi.dev)) every 300 ms and reads the
clipboard only when it changes.

More: [PLAN.md](../PLAN.md) (architecture and decisions),
[DESIGN-REVIEW.md](DESIGN-REVIEW.md) (design), [RELEASING.md](RELEASING.md) (releases and
winget).

Contributions are welcome. Please keep the two rules that make Perch what it is: no network
calls, and never read text from the clipboard.
