# Perch demo video

Remotion source for the 5-second drag-and-drop demo: three screenshots are selected on the
Perch shelf, dragged into an AI chat composer, dropped, and land as attachments.
1080 × 1350 (4:5), 30 fps, 150 frames.

```bash
npm install
npm run studio     # live preview, scrub the timeline
npm test           # unit tests for the pure timeline
npm run render     # writes out/perch-demo.mp4
npm run still -- out/f95.png --frame=95
```

## How it is built

- `src/timeline.ts` is the only place that knows *when* anything happens. It is pure:
  `sceneAt(frame)` returns everything to draw. Tune timing and springs there, and run
  `npm test` after.
- `src/perch.ts` holds Perch's tokens, copied from `src/renderer/src/styles.css` and
  `dragImage.ts` in the app (scaled 1.43x for phone legibility). They are copied rather than
  imported because the app CSS uses animations that Remotion cannot frame-sync. Do not add
  CSS `transition` or `animation` to anything under `src/`.

## Gotchas

- **Windows path length.** Remotion launches Chrome from `node_modules/.remotion/...`. If the
  full path exceeds 260 characters the render fails with
  `spawn ...\chrome-headless-shell.exe ENOENT`. Keep the checkout path short.
- **First render** downloads headless Chrome (~220 MB).
- **Fonts.** Text uses Segoe UI Variable / Segoe UI like the app; render on Windows.
- **Pixel format.** Frames are PNG so the MP4 is `yuv420p`; JPEG frames produce `yuvj420p`.
- **npm.** `.npmrc` sets `legacy-peer-deps=true`, as in the app, to avoid an npm 10 resolver crash.
