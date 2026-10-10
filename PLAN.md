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
    lib/              pure, unit-tested logic
      filename.ts  dedupe.ts  expiry.ts  settings-schema.ts
  preload/index.ts    contextBridge API (typed)
  shared/types.ts     types shared by main/preload/renderer
  renderer/           React UI (index.html, src/…)
tests/                Vitest specs for src/main/lib
build/                icons for electron-builder
scripts/make-icons.mjs  generates the PNG icons (no external tools)
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

## Decisions not covered by the brief (simpler option picked)

- **Dedupe scope**: an image is a duplicate if it matches a card currently
  on the shelf, or an image Perch itself put on the clipboard. If you delete
  a card and copy the same image again, it comes back (that's intentional).
- **Startup**: whatever is already on the clipboard when Perch starts is
  ignored. Same when un-pausing: images copied while napping are not caught.
- **Fallback watcher** (if FFI fails) polls every 1000 ms instead of 300 ms,
  since it must read and hash the image to notice a change.
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
