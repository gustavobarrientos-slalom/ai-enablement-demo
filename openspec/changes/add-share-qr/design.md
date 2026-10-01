## Context

`src/App.tsx` shows a Share icon button in the app bar. When tapped, it builds
`buildShareUrl(getShareBaseUrl(), encodeShare(activeEvent))`, copies the URL
through the platform `copyText`, and shows `Link copied`. On load, the web app
imports `#share=` payloads through `readSharePayload` → `decodeShare` →
`importEvent`. The desktop build skips that import, and its share base URL is
the GitHub Pages URL.

The UI already has a `BottomSheet` component (a native `<dialog>` with a
fallback) and semantic theme tokens. The ui-theme spec forbids hardcoding
per-component light/dark colours outside the token system, and there is
already a precedent for fixed light-only output (the PDF export).

## Goals / Non-Goals

**Goals:**
- Add a two-option Share sheet and a QR sheet built from the same URL string.
- Generate the code offline with `qrcode` at level L, and handle the capacity
  limit cleanly.
- Keep the QR readable whatever the theme.
- Add no new import path and no network use.

**Non-Goals:**
- Shortening or compressing the URL further, or splitting data across several
  QR codes.
- Scanning QR codes inside the app (the phone camera does this).
- Downloading or sharing the QR image as a file.
- Changing the share payload format or the import rules.

## Decisions

### 1. Single source for the share URL
Move the URL construction in `App.tsx` into one `activeShareUrl` value,
computed once per open sheet with `buildShareUrl(getShareBaseUrl(),
encodeShare(activeEvent))`. Both `Copy link` and `QrCode` get that same string
as a prop, so the two can't drift apart. The value is derived, not stored in
Zustand.

### 2. Matrix-based rendering, not `toDataURL`/`toString`
`src/lib/qr.ts` exposes:
```ts
type QrResult = { kind: 'ok'; size: number; modules: boolean[] } | { kind: 'too-large' };
async function createQr(text: string): Promise<QrResult>
```
It dynamically imports `qrcode`, calls `QRCode.create(text, {
errorCorrectionLevel: 'L' })`, and copies `modules.size` and `modules.data`.
`QrCode.tsx` draws a React `<svg viewBox="0 0 size+8 size+8">` with a white
`<rect>` background and a single `<path>` for the dark modules, offset by a
4-module quiet zone. It uses `shape-rendering="crispEdges"` and `role="img"`.

- *Why not `toDataURL`*: it needs canvas (not in jsdom) and produces a raster
  that blurs when scaled.
- *Why not `toString({ type: 'svg' })`*: it would need
  `dangerouslySetInnerHTML`. Building the SVG from the matrix avoids injecting
  HTML and lets tests read the modules directly.

### 3. Capacity detection
`qrcode` throws when the data doesn't fit in version 40 at the chosen level.
`createQr` catches only that case, which is identified by the library's
`"The amount of data is too big to be stored in a QR Code"` message, and
returns `{ kind: 'too-large' }`. Any other error is rethrown, so real bugs are
not hidden as "too large". Level L in byte mode holds up to 2953 bytes, which
is the most any level allows.

- *Alternative*: compare against a hard-coded 2953-byte limit before encoding.
  Rejected: segment mixing can change the real limit, so the library's own
  check is the reliable one.

### 4. Lazy loading
`qrcode` is only imported inside `createQr`, which runs when the QR sheet
mounts. This follows the PDF renderer pattern and keeps the initial bundle the
same. While it loads, the sheet shows a fixed-size 240px placeholder, so the
layout doesn't jump.

### 5. Fixed QR colours
Add `QR_COLORS = { dark: '#000000', light: '#FFFFFF' } as const` to
`src/ui/theme.ts`, next to the existing light-only PDF palette, and document it
as theme-invariant for scanner reliability. `QrCode` uses these as SVG `fill`
attributes. It does not use Tailwind `dark:` classes or tokens. The ui-theme
rule stays satisfied because the values come from the central theme module.

### 6. Sizing
The SVG gets `className="block w-full min-w-[240px] max-w-[320px] h-auto
aspect-square"` and sits in a centred white wrapper. At a 360px viewport the
sheet's content width is 320px (after the 20px side padding), so 240px always
fits. The event name is rendered in a `<p>` right after the SVG. The SVG's
`aria-label` is `QR code for <event name>`.

### 7. Sheet flow
`ShareSheet` is a `BottomSheet` titled `Share event` with two full-width
buttons. Choosing `Show QR code` switches the same sheet's content to the QR
view (title `QR code`), instead of stacking a second `<dialog>`. This avoids
nested modals and focus-trap problems. The QR view shows either the code and
event name, or the capacity message and a `Copy link` button. `Copy link`
closes the sheet after a successful copy and shows `Link copied` through the
existing toast.

### 8. Testing the "same URL" guarantee
The dev dependency `jsqr` decodes a raster built in plain JS from the
`modules` matrix (RGBA `Uint8ClampedArray`, scaled ×4, including the quiet
zone). Tests check that the decoded text equals the copied URL, including a
URL near the capacity limit. The no-network test spies on `fetch`,
`XMLHttpRequest.prototype.open` and `Image`, and asserts that none of them is
called.

## Risks / Trade-offs

- **Large events produce dense codes** that some phone cameras struggle with,
  even when they fit. → Level L keeps density as low as possible, and a 240px
  minimum size plus a quiet zone help. Users can still use `Copy link`.
- **An extra tap to copy** is a small UX regression. → Accepted in exchange for
  a single, discoverable Share entry point. The Share sheet opens with
  `Copy link` first.
- **Matching the library's error message** is fragile if `qrcode` changes its
  wording. → Pin the major version, and add a unit test that feeds an
  oversized string and expects `too-large`.
- **Desktop QR opens the web app, not the desktop app.** → This is intentional
  and matches the desktop-app spec (shared links are web-only).

## Open Questions

- Should the QR view offer a "Back" action to return to the two options, or is
  closing and reopening enough? Default: closing is enough.
