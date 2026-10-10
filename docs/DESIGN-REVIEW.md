# Design review: Perch shelf

Reviewed with [apple-design-skill](https://github.com/dickwu/apple-design-skill) (Apple HIG,
pulled 2026-10-02). Perch is an Electron app on Windows 11, so Apple's principles and foundations
apply in full; macOS-only conventions (menu bar, NSPanel title bars) are translated to their
Windows equivalents or noted as not applicable.

Files read: `SKILL.md`, `cross-platform.md`, `accessibility.md`, `color.md`, `typography.md`,
`dark-mode.md`, `materials.md`, `motion.md`, `panels.md`, `drag-and-drop.md`, `collections.md`,
`branding.md`, `designing-for-macos.md`.

## Summary

A floating shelf whose single job is to hand over a fresh screenshot as a file. The first build
works but reads as a generic "near-black with one bright accent" panel, uses the accent for four
different things, and has no element that says *temporary*, which is the whole point of the
product. Rating before changes: **Needs work**.

Thesis: *a quiet shelf where screenshots perch briefly, then leave.* The signature should be the
leaving.

## Improvements

**High: accent colour means four things.** Amber marked selection, the brand mark, the pinned
label, the "napping" status and the Clear link.
`color.md › Best practices`: "Avoid using the same color to mean different things."
Fix: amber now means *selected*, nothing else. Pinned uses the pin glyph in secondary text,
napping is a neutral pill, the mark is secondary text.

**High: small text below the recommended dark-mode contrast.** 11 px metadata `#8d9097` on
`#1f2125` was 5.04:1.
`dark-mode.md › Dark Mode colors`: "strive for a contrast ratio of 7:1, especially in small text."
Fix: secondary text `#c8c8c8` on card `#2f2f2f`, 8.00:1 (7.22:1 on hover).

**High: palette arrived without a reason.** Blue-black `#151619` plus a vivid accent is one of
the three looks the skill flags as generated defaults.
`cross-platform.md › Conventions to check`: "Prefer the platform's real materials and window
chrome over a web imitation."
Fix: neutral Windows 11 dark surfaces (`#262626` panel, white 5% card fill), Windows corner radii
(8 px overlay, 6 px card, 4 px control), Segoe UI Variable with the Small optical size for 11 px
text.

**Medium: selection is undiscoverable.** Clicking a card toggles selection, but nothing hints at
it until you try.
`collections.md › Best practices`: "Make it easy to choose an item."
Fix: an empty selection ring appears top-left on hover; selected cards show a filled check plus
the outline (shape, not colour alone).

**Medium: multi-item drag gives no count.**
`drag-and-drop.md › Desktop (macOS)`: "Consider displaying a badge during multi-item drag
operations."
Fix: the renderer draws the drag image (translucent thumbnail plus a count badge when dragging
more than one) and main uses it for `startDrag`.

**Medium: selection survives a drag.**
`drag-and-drop.md › Accepting drops`: "When people drag selected content to a different
container, deselect the content in the source."
Fix: selection clears once a drag starts.

**Medium: dragged state was opacity only.**
`color.md › Inclusive color`: "Avoid relying solely on color to differentiate…"
Fix: dragged cards keep the dim thumbnail and add an "out" glyph with the label "Dragged".

**Medium: action buttons were 26 × 26.** Desktop default is 28 × 28 (`SKILL.md › Lens 1`).
Fix: 28 × 28.

**Medium: no answer for Increase Contrast, Reduce Transparency or Windows contrast themes.**
`accessibility.md`, `dark-mode.md › Best practices`.
Fix: `prefers-contrast: more` raises strokes and secondary text; `prefers-reduced-transparency`
makes the action bar opaque; `forced-colors: active` maps to system colours.

**Low: white screenshots glow against the dark panel.**
`dark-mode.md › Icons and images`: "consider slightly darkening the image to prevent the
background from glowing."
Fix: thumbnails sit at 92% brightness and come to 100% on hover.

## Craft notes

**Signature: the perch line.** A 3 px branch under each thumbnail that shortens as the snip's
time runs out, so the shelf shows at a glance what is about to fly off. It encodes real data
(remaining time), it exists only because Perch is temporary, and it is neutral grey so it never
competes with selection. Pinned snips drop the line for a pin glyph.

**Removed: the checkerboard.** Screenshots have no transparency, so the pattern behind tall
thumbnails was decoration. A plain recessed well replaces it.

**Kept quiet:** the header is the panel's title ("Perch") with a small secondary-colour mark,
per `branding.md`: "Ensure branding always defers to content."

## What works

- Copy voice: "Nothing perched yet. Press Win+Shift+S." invites the next action
  (`writing.md`).
- Motion is brief (≤ 190 ms), tied to real events (arrival, expiry) and disabled under reduced
  motion (`motion.md › Best practices`).
- Copy-to-clipboard is an alternative to dragging (`drag-and-drop.md › Best practices`).
- Dragging an unselected card leaves the selection alone (`drag-and-drop.md › Desktop`).

## Platform notes

- **Dark only, on purpose.** `dark-mode.md` asks for both appearances but allows "in rare cases"
  a dark-only interface for media that should recede. Perch's content is screenshots and the
  brief asks for dark, so it stays dark. A light theme is a small token swap if wanted later.
- **No acrylic.** The shelf is never the active window (it must not steal focus), and Windows
  draws acrylic as a solid fallback for inactive windows, so a real material would never show.
  A solid flyout-grey surface is the honest equivalent.
- **Menus.** `cross-platform.md` expects every command in a menu: the tray menu (milestone 4)
  carries show/hide, pause, clear and settings, and a right-click context menu on cards will
  mirror the hover actions.
- **Alternative accent.** Windows exposes the user's accent colour
  (`systemPreferences.getAccentColor()`); using it for selection would follow `color.md`'s
  "prefer system colors". Kept amber for personality; switching is a one-line change.

---

## Revision 2: glass shelf (from the owner's reference)

The owner supplied a reference: same-ratio frosted cards floating on the desktop, images filling
the frame, a slight 3D tilt with the right edge toward the viewer, and round dark buttons. What
changed from the review above, and what the guidelines say about it:

- **Panel removed; cards float.** No header or panel surface, so branding defers to content
  completely (`branding.md › Best practices`). The logo appears in the empty state only.
- **Same shape for every card.** Thumbnails are cropped to 16:10 in the main process (wide images
  keep their centre, tall ones their top). The file you drag is always the full image.
- **Tilt.** `perspective(760px) rotateY(-9deg)`, easing to `-4deg` on hover. It is static, so it
  costs nothing under Reduce Motion; only the hover ease is dropped there.
- **Actions behind "…".** The hover toolbar became a round "…" chip with a small menu (Copy,
  Save as…, Pin, Delete), plus a pin chip on pinned cards. Chips are 30 × 30 (desktop default is
  28). Dimensions and the expiry text moved to the tooltip; the perch line stays as the at-a-glance
  cue.
- **Accent is the logo's wing blue `#6BAFD0`.** Still means "selected" only.
- **Glass without blur.** A transparent Electron window can't blur the desktop behind it, and
  Windows acrylic turns solid on inactive windows (the shelf is never active). So the glass is a
  tinted, semi-transparent fill with a sheen and a light edge.
  - Image cards use 56% tint: they carry no text, and chip icons stay at 7.9:1 even over a white
    window.
  - Glass that carries text (empty state, pills) uses 86% tint: secondary text measures 7.7:1
    over white, 4.7:1 at the brightest corner of the sheen.
  - The "Clear" link is light text with a blue underline, because blue text on glass over white
    measured 2.9:1.
  - Reduce Transparency switches all glass to solid `#1B2330`.
- **Known trade-off.** Over a white window, the blue selection ring is only 1.7:1 against the
  glass. Selection never relies on it alone: the filled check on the image carries it.
