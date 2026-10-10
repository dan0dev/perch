# Perch — plan

## Architecture

One Electron app, three processes' worth of code:

```
main (Node)                                  renderer (React, sandboxed)
├─ clipboard watcher  ──new image──┐         ├─ Shelf (tray window)
│   koffi → GetClipboardSequenceNumber        │   cards, select, drag, actions
│   fallback: formats + bitmap hash │         └─ Settings (separate window)
├─ store (items, dedupe, expiry) ◄──┘                 ▲
│   writes PNGs to %TEMP%\Perch                        │ typed IPC via preload
├─ shelf window (frameless, non-focusable) ◄──────────┘   (window.perch)
├─ system tray, global hotkey, settings.json
└─ network guard (cancels every non-local request)
```

- **Main is the source of truth.** It owns the item list and pushes the
  full list to the renderer on every change. The renderer only renders and
  sends intents (drag, copy, pin, delete, select is local UI state).
- **Thumbnails** are small PNG data URLs made in main at capture time, so
  the renderer never touches `file://` (works the same in dev and prod).
- **Drag out**: renderer `dragstart` → `preventDefault()` → IPC →
  `webContents.startDrag({ file, files, icon })` in main.
- **Never steal focus**: shelf window is `focusable: false` and shown with
  `showInactive()`. Settings lives in a separate normal window because it
  needs keyboard input.

## File layout

```
src/
  main/
    index.ts          app lifecycle, single-instance, wiring
    clipboard.ts      watcher (FFI + fallback)
    store.ts          items, files on disk, expiry timer
    shelf.ts          shelf window: position, slide, auto-hide
    tray.ts           system tray menu
    settings.ts       load/save settings.json
    netguard.ts       blocks all network
    lib/              pure, unit-tested logic (filename.ts, dedupe.ts)
  preload/index.ts    contextBridge API (typed)
  shared/             types, IPC names and pure logic used by both sides
                      (expiry.ts, settings.ts are unit-tested)
  renderer/           React UI (index.html, src/…)
tests/                Vitest specs for src/main/lib
assets/perch.svg      logo, source of every icon
resources/            runtime icons (icon.ico, icon-paused.ico)
build/                electron-builder resources (icon.png)
scripts/make-icons.cjs  renders the icons from the SVG with Electron
scripts/drop-test.html  local page that shows what a drop zone receives
docs/DESIGN-REVIEW.md   HIG review and design decisions
```

## Risks

| Risk | Mitigation |
|---|---|
| koffi native binary missing in packaged app | `asarUnpack` koffi + `@koromix/*`; fallback watcher if load fails |
| Snipping Tool uses delayed clipboard rendering, first read empty | retry the read once after 150 ms |
| Big screenshots (4K) slow to encode | hash bitmap first (skip dupes before encoding); write file async |
| Shelf hides mid-drag | auto-hide suspended while `startDrag` runs |
| Drag into elevated (admin) apps | Windows UIPI blocks it; documented, not fixable |
| Browser reads file after drop | never delete on drop; only expiry/user deletes |
| Electron/Chromium phoning home | spellcheck off, all non-local requests cancelled |
| npm 10 arborist crash (`edgesOut`) on vitest peer deps | `.npmrc` sets `legacy-peer-deps=true` |

## Distribution

**Decision: a per-user NSIS installer** (`Perch-Setup-<version>.exe`, one click, no admin
prompt, installs to `%LOCALAPPDATA%\Programs\Perch`). Configured in `electron-builder.yml`,
not built yet.

Why not a single portable `.exe`:

- **Launch at login needs a stable path.** electron-builder's portable target unpacks the whole
  app (~100 MB) into a temp folder on every start, so each launch costs seconds and the path it
  runs from changes. An installed app starts instantly from the same place every time.
- **Notifications need a Start menu shortcut.** Windows only shows toast notifications (used for
  plain error messages like "Ctrl+Alt+S is taken") for unpackaged apps that have a Start menu
  shortcut carrying their AppUserModelID (`app.perch`). The installer creates it.
- **No admin needed.** Per-user install means no UAC prompt, and Perch never runs elevated.
- **Clean removal** from Settings → Apps, like any other app.

Both options are unsigned, so SmartScreen warns either way. If a no-install option is wanted
later, a zip of the unpacked app is the easy add-on.

## Icons

`assets/perch.svg` (the hummingbird) is the single source. `npm run icons` renders it with
Electron's Chromium into `resources/icon.ico` (16–256 px; app, window and tray),
`resources/icon-paused.ico` (greyed tray icon while capture is paused) and `build/icon.png`.
The UI accent `#6BAFD0` is the logo's wing blue. Check glyphs on it are `#0B2233` (6.7:1).
Because the glass cards sit over whatever is on the desktop, selection is never colour alone:
it is a 2 px ring plus a filled check.

## Decisions not covered by the brief (simpler option picked)

- **Dedupe scope**: an image is a duplicate if it matches a card currently
  on the shelf, or an image Perch itself put on the clipboard. If you delete
  a card and copy the same image again, it comes back (that's intentional).
- **Startup**: whatever is already on the clipboard when Perch starts is
  ignored. Same when un-pausing: images copied while napping are not caught.
- **Fallback watcher** (if FFI fails) polls every 1000 ms instead of 300 ms,
  since it must read and hash the image to notice a change.
- **Card actions** live behind a round "…" button (menu: Copy, Save as…, Pin, Delete), matching
  the reference design. Pinned cards show a pin chip that unpins on click.
- **Thumbnails** are cropped to 16:10 in main (wide images keep their centre, tall ones keep
  their top) so every card has the same shape. The file on disk is always the full image.
- **Selection**: click a card to toggle selection. Dragging a selected card
  drags every selected card; dragging an unselected card drags just that one.
- **Screen edge**: left or right of the primary display (no top/bottom).
- **Auto-hide**: same rule whether the shelf opened on a new snip or by
  hotkey: hides 4 s after the pointer leaves (or 4 s after showing if never
  hovered). The hotkey toggles it.
- **Expiry** is measured from capture time. Unpinning restarts nothing: a
  card unpinned after its time is up flies off at the next sweep.
- **Launch at login** is only applied in the packaged app (in dev it would
  register the bare electron.exe).
- **Filename collisions** within the same second get `-2`, `-3`, … suffixes.
- **Settings UI**: expiry in minutes (1–1440), hotkey captured by pressing
  it, edge, launch at login. Invalid JSON on disk → defaults.
