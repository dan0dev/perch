# Perch drag-and-drop demo video: design

Date: 2026-10-10. Status: awaiting spec review.

## Goal

A 5-second, premium, minimal product demo of Perch's core interaction: select three
screenshots on the shelf, drag them together into an AI chat upload area, drop, and see them
land as attachments. Motion style: Linear / Raycast. Natural cursor movement, subtle spring
physics, soft shadows, satisfying drop feedback.

## Requirements

| Item | Value |
| --- | --- |
| Output | MP4, H.264, `yuv420p` |
| Size | 1080 × 1350 (4:5 portrait) |
| Rate / length | 30 fps, 150 frames, exactly 5.000 s |
| Content | Drag-and-drop interaction only. No captions, logos, title cards or transitions |
| UI fidelity | Perch's real measurements and tokens (see "Perch fidelity") |
| Legibility | Everything large and readable at phone width |

Non-goals: audio, changes to the Perch app code, CI integration, a loopable cut, other
aspect ratios.

## Approach

Recreate the scene as React/CSS inside a Remotion composition. Rejected: animating over a
crop of `docs/screenshot.png` (soft at this zoom, UI baked in, no chat composer) and screen-
recording the real app (not scriptable, not frame-exact).

## Layout (canvas px)

- **Desktop:** dark abstract blue "bloom" wallpaper (radial gradients, no logo). Slim centred
  taskbar, y 1274–1350 (76 px), generic icon blobs only.
- **Chat window:** x 36–716, y 72–1240 (680 × 1168). Dark theme, 12 px corner radius, Windows 11
  style title bar with minimise / maximise / close glyphs at the right. Body is empty apart
  from the composer, so nothing competes with the interaction.
- **Composer:** x 68–684, y 944–1196 (616 × 252), 28 px radius. Top part is the attachment
  row (tiles 176 × 110, 14 px gaps, 30 px side padding); bottom part is a one-line input
  with placeholder "Ask anything…" and a round send button.
- **Perch shelf:** three cards 330 × 206 (16:10), 22 px gap, x 714–1044, y 269–931, floating
  over the desktop at the right edge. Perch tilt `rotateY(-9deg)` with the app's 760 px
  perspective scaled by the same 1.43× (≈1087 px) so the foreshortening matches the app,
  alternating spin +1.2° / −1.2° / +1.2°, 20 px image radius (14 × 1.43), same soft shadow as
  the app.
- **Cards:** three generated SVG thumbnails in the palette of the README screenshot: pink/blue
  abstract figure scene, orange/teal gradient, mountain sunset.

Cards are ≈1.4× real Perch size. Everything else is sized for phone legibility.

## Timeline (30 fps)

| Frames | Time | Event |
| --- | --- | --- |
| 0 | 0.00 s | Cursor idle at (600, 660). All three cards unselected. Composer rests one row tall. |
| 0–10 | 0–0.33 s | Cursor glides to card 1 (bezier ease-in-out, slight arc). |
| 11 | 0.37 s | Click card 1. Select ring springs to filled accent circle with check. |
| 20 | 0.67 s | Click card 2 (cursor hops down 228 px over 6 frames). |
| 29 | 0.97 s | Click card 3. All three selected. |
| 31–39 | 1.03–1.30 s | Cursor returns to card 2 centre (879, 600) and presses (frame 39). Press scale 0.86. |
| 40–48 | 1.33–1.60 s | Lift: three cards spring into a fanned stack under the cursor with the accent "3" badge. Shelf slots ghost to 35 % opacity. Shadow deepens. |
| 43–91 | 1.43–3.03 s | Drag along a curved path from (879, 600) to the composer centre (376, 1070). Eased in/out; control point bows the path up-and-left, so it arcs rather than travelling in a straight line. The stack leans into its velocity (±6° max, smoothed). Cards 2 and 3 trail card 1 by 3 and 6 frames. |
| 82–100 | 2.73–3.33 s | Proximity glow: as the stack nears the composer it springs open from one row to the full drop zone, with accent border, soft glow, and a dashed zone labelled "Drop to attach". |
| 91–113 | 3.03–3.77 s | Hover. Stack floats ±3 px (sine), scale 1.04. |
| 112–121 | 3.73–4.03 s | Release at 114 (3.80 s): stack dips to scale 0.94 and absorbs into the tile row (scale and fade). Cursor press ripple. |
| 115–136 | 3.83–4.53 s | Three attachment tiles spring in, 3-frame stagger. Each shows a progress ring filling over 10 frames, resolving to a white check on a dark chip. |
| 118–137 | 3.93–4.57 s | Glow and dashed zone ease back to a neutral border; the composer stays open around the tiles. Shelf cards ease back to full opacity (cards stay on the shelf, as in the real app). |
| 137–149 | 4.57–5.00 s | Hold. Cursor drifts 20 px away (frames 132–148) and settles. Final frame is clean and readable. |

Frame numbers are refined during implementation; the authoritative values are the schedule
constants at the top of `video/src/timeline.ts`, which the implementation plan lists in full.
The total stays at 150 frames. Revised during planning: clicks spaced 9 frames apart (was 7)
because 7 forced 4-frame card-to-card hops at ~130 px/frame, which read as teleporting.

## Motion rules

- Cursor movement: `Easing.bezier(0.35, 0, 0.35, 1)` between waypoints (peak speed 2.1× the
  average; the originally planned `0.45, 0, 0.15, 1` peaks at 3.1×); no linear tweens, no
  random jitter. A test keeps every per-frame move under 90 px.
- Springs (Remotion `spring`): selection ring `{damping 14, stiffness 220, mass 0.6}`;
  tiles `{damping 16, stiffness 170}`; composer glow `{damping 20, stiffness 140}`.
- Clicks: cursor scales to 0.86 over 3 frames and back, plus a faint expanding ring.
- Composer: rests 96 px tall (input row only) and opens upward to the 252 px rectangle above
  as the stack arrives, so it never shows an empty attachment area.
- Shadows layered: close and tight plus far and soft; the lifted stack uses
  `0 30px 60px rgba(0,0,0,0.45)`.
- Only accent blue `#6bafd0` is used for emphasis: selection and the drop zone. Success check
  is white on a dark chip.

## Perch fidelity

Copied into `video/src/perch.ts` with a comment citing the source file:

- tokens from `src/renderer/src/styles.css`: `--accent`, `--accent-ink`, `--r-image`, tilt
  perspective and angle, spin values, frame shadow, select-ring geometry and colours, chip
  styling;
- drag-image look from `src/renderer/src/dragImage.ts`: stacked edge hint (50 % alpha
  second layer, offset up and inward), 0.88 image alpha, white 25 % hairline, accent count
  badge with ink text.

Why copy instead of importing `styles.css`: the app CSS relies on CSS `animation` and
`transition`, which are not frame-synced during Remotion rendering.

Deliberate departures: the drag stack is enlarged for mobile legibility, with the "3" badge
scaled with it, and drawn near-opaque (0.96, not the app's 0.88) because overlapping
translucent thumbnails look muddy at this size.

Font: `Segoe UI Variable Text` / `Segoe UI` / `system-ui`, as in the app. This relies on the
rendering machine being Windows; renders elsewhere would fall back and differ.

## Structure

```
video/
  package.json            own deps: remotion, @remotion/cli, react, react-dom (+ typescript, vitest)
  .npmrc                  legacy-peer-deps=true (npm 10 resolver crash, as in the root project)
  tsconfig.json
  remotion.config.ts      codec h264, PNG frames, pixel format yuv420p, crf 16
  vitest.config.mts
  README.md
  src/
    index.ts  Root.tsx    registerRoot; <Composition id="PerchDemo" 1080×1350, 30 fps, 150 frames>
    PerchDemo.tsx         assembles layers, reads the timeline
    timeline.ts           pure: frame → { cursor, press, shelf, stack, composer, tiles }
    perch.ts  layout.ts   copied Perch tokens; scene geometry
    Desktop.tsx  ChatWindow.tsx  Composer.tsx  PerchCard.tsx
    Cursor.tsx  thumbs.tsx  icons.tsx
  tests/timeline.test.ts  unit tests on the pure timeline
  out/                    rendered MP4 and stills (git-ignored)
```

`timeline.ts` is pure and has no React so every frame's state can be computed and inspected
without rendering. The root `.gitignore` already covers `video/node_modules/` and `video/out/`
(its `node_modules/` and `out/` patterns match at any depth), so it needs no change.
Nothing in `src/`, `electron.vite.config.ts` or the root `package.json` changes.

## Verification

1. `npm test`: 23 unit tests on the pure timeline (selection order, drag path monotonic,
   per-frame cursor speed, value ranges, final-frame state).
2. `remotion still` at frames 0, 11, 29, 38, 50, 70, 95, 117, 130, 149; review each image
   against a checklist for layout, clipping and legibility at 1080 wide.
3. `remotion render PerchDemo out/perch-demo.mp4`.
4. `ffprobe` confirms 150 frames, 30 fps, 1080×1350, duration 5.000 s, codec h264, `yuv420p`.
5. Motion quality (easing, weight, trailing) cannot be judged from stills; the user reviews
   the MP4 and feedback is applied as timing and spring tweaks.

## Risks

- First Remotion render downloads a headless Chrome (~220 MB).
- npm reads `.npmrc` from the project directory only, so `video/` needs its own
  `legacy-peer-deps=true`; without it npm 10 crashed (`edgesOut`) installing the dev
  dependencies when this was tried.
- Windows path length: Remotion spawns Chrome from `node_modules/.remotion/...`; a full path
  over 260 characters fails with `spawn ... ENOENT`. The repo path is short enough (~173).
- Frames must be PNG; the default JPEG frames make the MP4 `yuvj420p` instead of `yuv420p`.
- Generated thumbnails are approximations of the README screenshot's images, not copies.
