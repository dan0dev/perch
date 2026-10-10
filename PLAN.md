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

## Status (2026-10-10)

| Milestone | State |
| --- | --- |
| 1. Clipboard capture to PNG in temp | Done |
| 2. Shelf window with thumbnails | Done |
| 3. Drag out into Explorer and browser upload zones | Done, manually tested by the owner (single and batch) |
| 4. Expiry, card actions, tray, settings | Done; Copy, Save as, Pin, Delete confirmed by the owner |
| 5. Polish, README, installer | Done: installer built, installed, run, quit and uninstalled on Windows 11 |
| After 5: owner's additions | Keep the shelf open, Show on hover, 30-card cap, double-click to open, image-only redesign |

Measured on the installed build: a capture is saved in about 10 ms after the clipboard read
(4K: about 20 ms; reading a 4K image from the clipboard takes about 150 ms), idle CPU about 0.4%
of one core, installer 103 MB, installed size 323 MB.

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

A **portable zip** is published next to the installer for people who don't want to install
anything. Releases are built by GitHub Actions from the tag (`.github/workflows/release.yml`) and
published with SHA-256 checksums; see `docs/RELEASING.md`, which also covers winget and free
code signing through SignPath Foundation.

**No auto-update.** The brief rules out network calls, so Perch never checks for updates; people
update through winget or a new download. MSIX / Microsoft Store is out of scope.

Packaging trims: only the `en-US` Chromium locale ships (the UI is English; saves about 48 MB),
React is bundled into the renderer instead of shipping in `node_modules`, and no update metadata
is generated (`publish: null`).

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
- **Keep the shelf open** (setting) never auto-hides while there are cards. Hiding it with the
  hotkey or the tray keeps it hidden until the next snip lands. With no cards it hides.
- **Show on hover** (setting, stored as `showOnEdgeHover`) polls the pointer every 120 ms, only
  while the setting is on. The hot area is the whole spot where the cards appear (the shelf's
  window rectangle), and the pointer must rest there 300 ms. After a hover reveal the shelf hides
  0.9 s after the pointer leaves. (First version used only the outermost 2 px of the screen edge;
  the owner wanted the cards' own spot.)
- **30-card cap.** When a new card pushes the shelf past 30, the oldest unpinned cards fly off
  early. Pinned cards are never removed this way (they still count toward the 30).
- **Double-click** opens the snip in the default image viewer (`shell.openPath`).
- **No "used" look.** The brief asked to dim a card once dragged; the owner removed that
  (2026-10-10). Dragged cards look the same; only their tooltip says "Dragged out".
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
- **Expiry sweep** runs every 5 s, so a snip leaves at most 5 s after its time is up. Changing
  the expiry setting applies to snips already on the shelf.
- **Settings apply instantly** (no Save button), like Windows Settings. A hotkey that another app
  owns is rejected with a plain message and the old one stays active.
- **Command-line switches**: `--settings` opens settings, `--quit` quits a running Perch (both
  work on an already-running instance).
- **Launch at login** is only applied in the packaged app (in dev it would
  register the bare electron.exe).
- **Filename collisions** within the same second get `-2`, `-3`, … suffixes.
- **Settings UI**: expiry in minutes (1–1440), hotkey captured by pressing
  it, edge, launch at login. Invalid JSON on disk → defaults.
