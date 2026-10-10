<p align="center">
  <img src="assets/perch.svg" width="120" alt="Perch logo: a blue hummingbird" />
</p>

<h1 align="center">Perch</h1>

<p align="center">
  A temporary screenshot shelf for Windows 11.<br/>
  Snips land, perch for a while, then fly off.
</p>

<p align="center">
  <a href="https://github.com/dan0dev/perch/releases/latest"><b>Download for Windows</b></a> ·
  <a href="#install">Install</a> ·
  <a href="#use">Use</a> ·
  <a href="#privacy">Privacy</a> ·
  <a href="#build-from-source">Build</a>
</p>

<p align="center">
  <img src="docs/screenshot.png" width="860" alt="Perch's stack of slightly tilted screenshot cards at the right edge of the screen, next to a web form with an upload drop zone" />
</p>

---

<kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> only puts a screenshot on the clipboard. You can
paste it, but you can't drag it into an upload box. Perch fixes that: every image that lands on
the clipboard appears as a card at the edge of your screen, and you can drag it into any app or
browser drop zone as a real PNG file. Cards fly off on their own after 15 minutes.

- **Fast.** A card appears within a second of the snip, and your window keeps focus.
- **Drag anywhere.** Explorer, browser upload zones, chat apps, email. Select several cards and
  drag them as one batch.
- **Temporary by design.** Files live in `%TEMP%\Perch`, expire on a timer you choose, and are
  wiped when Perch quits. Pin the ones you want to keep around.
- **Private.** No network, no telemetry, no accounts. Perch never reads text from your
  clipboard.

## Install

Download from the [latest release](https://github.com/dan0dev/perch/releases/latest):

| File | For |
| --- | --- |
| `Perch-Setup-x.y.z.exe` | **Most people.** One click, no admin rights, installs just for you. Adds a Start menu entry and uninstalls from *Settings → Apps*. |
| `Perch-x.y.z-win-x64.zip` | No installer. Unzip anywhere and run `Perch.exe`. Keep the folder where it is if you turn on *Launch at login*. |
| `SHA256SUMS.txt` | Checksums, to verify the download. |

Requires Windows 10 or 11, 64-bit.

> [!NOTE]
> **"Windows protected your PC"?** Perch isn't code-signed yet, so SmartScreen warns about it on
> first run. Click **More info → Run anyway**. Every release is built from the tagged source by
> [GitHub Actions](.github/workflows/release.yml), and you can check your download against
> `SHA256SUMS.txt` with `Get-FileHash .\Perch-Setup-0.1.0.exe`.

### Updating

Perch never connects to the internet, so it doesn't update itself. To update, download the new
release and run it; your settings are kept.

## Use

1. Take a snip with <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> (or copy any image).
2. It lands on the shelf at the edge of your screen. The shelf slides away after a few seconds;
   hover it to keep it open, or turn on *Keep the shelf open* in Settings.
3. Drag the card wherever the image needs to go.

| Do this | To |
| --- | --- |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> | Show or hide the shelf (change it in Settings). |
| Click a card | Select it. Drag any selected card to take them all; **Clear** under the cards deselects. |
| Double-click a card | Open it in your default image viewer, to check it before sending. |
| **…** on a card (on hover) | Copy, Save as…, Pin, Delete. |
| Pin | Keep a card past its expiry. Click the pin badge to unpin. |
| Rest the pointer at the screen edge | Slides the shelf out, if *Show at the screen edge* is on. |
| Tray icon, click | Show or hide the shelf. |
| Tray icon, right-click | Pause capture, Shoo everything, Settings, Quit. |

Hover a card to see how long it has left ("Flies off in 12 min"). The shelf holds up to 30
cards: when more arrive, the oldest unpinned ones fly off early.

### Settings

Right-click the tray icon → **Settings…**. Changes apply right away.

- **Snips fly off after**: 1 minute to 24 hours (default 15 minutes). Applies to cards already
  on the shelf.
- **Hotkey** to show or hide the shelf.
- **Screen edge**: left or right.
- **Keep the shelf open**: it stays on screen while it has cards (the hotkey still hides it).
- **Show at the screen edge**: rest the pointer at the shelf's edge for a moment and it slides
  out. Quick flicks to a scrollbar or a window corner don't trigger it.
- **Launch at login.**

Settings are saved in `%APPDATA%\Perch\settings.json`. From a terminal, `Perch.exe --settings`
opens settings and `Perch.exe --quit` quits a running Perch.

## Privacy

- Perch makes **no network calls** of any kind: no telemetry, no update checks. The app also
  cancels any outgoing request from its own windows.
- It only ever asks the clipboard for images, never text.
- Images are written to `%TEMP%\Perch`, deleted when they expire, and the folder is emptied when
  Perch starts and quits.

## Known limits

- **SmartScreen warning** on first run, until the project is code-signed (see [Install](#install)).
- **Apps running as administrator** don't accept drops from normal apps; Windows blocks it. Use
  **… → Copy** and paste instead.
- **Size.** Perch is built on Electron, so the installer is about 100 MB and the app takes about
  320 MB on disk. While idle it uses well under 1% of one CPU core.
- **Windows only**, and the shelf always appears on the main display.
- If another app already uses <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd>, Perch tells you, and
  you can pick a different hotkey in Settings.

## Build from source

Requires Node.js 22+ (tested with 24) and Windows.

```bash
git clone https://github.com/dan0dev/perch.git
cd perch
npm install        # .npmrc sets legacy-peer-deps (works around an npm 10 resolver crash)
npm run dev        # run with hot reload
npm test           # unit tests (Vitest)
npm run build      # typecheck, test, then dist/Perch-Setup-x.y.z.exe and the zip
```

Other scripts: `npm run typecheck`, `npm run build:dir` (unpacked app only, faster),
`npm run icons` (regenerate icons from `assets/perch.svg`).

How it works: Electron has no clipboard-change event, so Perch polls the cheap Win32
`GetClipboardSequenceNumber` (through [koffi](https://koffi.dev)) every 300 ms and reads the
clipboard only when it changes. See [PLAN.md](PLAN.md) for the architecture and decisions,
[docs/DESIGN-REVIEW.md](docs/DESIGN-REVIEW.md) for the design, and
[docs/RELEASING.md](docs/RELEASING.md) for how releases are made.

## Contributing

Issues and pull requests are welcome. Please keep the two rules that make Perch what it is:
no network calls, and never read text from the clipboard.

## License

[MIT](LICENSE) © 2026 Dániel K
