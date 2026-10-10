<p align="center">
  <img src="assets/perch.svg" width="120" alt="Perch logo: a blue hummingbird" />
</p>

<h1 align="center">Perch</h1>

<p align="center">A temporary screenshot shelf for Windows 11.<br/>Snips land, perch for a while, then fly off.</p>

---

Windows' <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> only puts a screenshot on the clipboard, so
you can paste it but can't drag it into an upload box. Perch catches every image that lands on
the clipboard, shows it as a card at the edge of your screen, and lets you drag it into any app or
browser drop zone as a real PNG file. Snips expire on their own.

> **Status:** in development. Milestones 1–3 (capture, shelf, drag out) are built; expiry,
> card actions, tray menu, settings and the installer are next. See [PLAN.md](PLAN.md).

## Shortcuts

| Keys | What it does |
| --- | --- |
| <kbd>Win</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd> | Take a snip (Windows). It lands on the shelf. |
| <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>S</kbd> | Show or hide the shelf. |
| Click a card | Select it. Drag any selected card to take them all. |
| Tray icon | Click to show or hide the shelf; right-click for the menu. |

## Privacy

Perch makes no network calls and has no telemetry. Images are only read from the clipboard
(never text), stored in `%TEMP%\Perch`, and that folder is emptied on start and on quit.

## Develop

Requires Node 20+ and Windows 10/11.

```bash
npm install        # .npmrc sets legacy-peer-deps (works around an npm 10 resolver crash)
npm run dev        # run with hot reload
npm test           # unit tests (Vitest)
npm run typecheck
npm run icons      # regenerate all icons from assets/perch.svg
```

`npm run build` will produce `dist/Perch-Setup-<version>.exe` (not built yet).

## Known limits

- **SmartScreen warning.** The installer is unsigned, so Windows shows "Windows protected your
  PC" on first run. Choose *More info* → *Run anyway*.
- **Admin apps.** Windows blocks drag and drop from a normal app into an app running as
  administrator. Copy the card (… → Copy) and paste instead.
