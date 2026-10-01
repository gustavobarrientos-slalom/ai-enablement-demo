## 1. Setup

- [x] 1.1 Add `qrcode` (pinned major) to dependencies and `@types/qrcode` and `jsqr` to devDependencies
- [x] 1.2 Add `SHARE_EVENT_TITLE`, `COPY_LINK`, `SHOW_QR_CODE`, `QR_CODE_TITLE` and `QR_TOO_LARGE = 'Too much data for a QR code — use the link instead'` to `src/ui/messages.ts`
- [x] 1.3 Add theme-invariant `QR_COLORS` (`#000000` / `#FFFFFF`) to `src/ui/theme.ts`

## 2. QR generation

- [x] 2.1 Create `src/lib/qr.ts` with `createQr(text)`: dynamic `import('qrcode')`, `QRCode.create(text, { errorCorrectionLevel: 'L' })`, return `{ kind: 'ok', size, modules }`. Map only the capacity error to `{ kind: 'too-large' }` and rethrow any other error
- [x] 2.2 Add a test helper that rasterizes a module matrix (with a 4-module quiet zone) to RGBA for `jsqr`
- [x] 2.3 Add `src/lib/qr.test.ts`: decoded text equals the input URL, the create call uses level L and the result reports level L, an oversized string returns `too-large`, and a non-capacity error is rethrown

## 3. Components

- [x] 3.1 Create `src/components/QrCode.tsx`: an inline `<svg role="img" aria-label="QR code for {name}">` with a white background rect, a single dark path, a 4-module quiet zone, `crispEdges`, 240px minimum width, and a 240px placeholder while loading
- [x] 3.2 Create `src/components/ShareSheet.tsx`: a `BottomSheet` titled `Share event` with `Copy link` and `Show QR code`. The QR view (title `QR code`) shows the code with the event name below it, or `QR_TOO_LARGE` plus a `Copy link` button
- [x] 3.3 Update `src/App.tsx`: Share opens `ShareSheet`, and one derived share URL is passed to both copy and QR. `Copy link` uses platform `copyText`, shows `Link copied` and closes the sheet

## 4. Tests

- [x] 4.1 `ShareSheet` / `App` tests: Share opens the sheet without copying, `Copy link` copies the URL and shows `Link copied`, and `Show QR code` shows the QR view
- [x] 4.2 Test that the decoded QR (from the rendered component's matrix) equals the string passed to `copyText`, including after adding an expense
- [x] 4.3 Capacity test: an event whose URL exceeds the level-L limit shows `QR_TOO_LARGE`, no `role="img"` QR, and a working `Copy link`
- [x] 4.4 Layout and colour tests: SVG has the 240px min-width class, fills are `#FFFFFF`/`#000000` with the `dark` class on `<html>`, the event name follows the SVG, and the accessible name is `QR code for <name>`
- [x] 4.5 No-network test: spy on `fetch`, `XMLHttpRequest.prototype.open` and `Image` while showing the QR code, and assert none of them is called
- [x] 4.6 Lazy-load test: opening the Share sheet without `Show QR code` never calls `createQr` or imports `qrcode`
- [x] 4.7 Import round-trip test: load `App` with `window.location` set to the URL decoded from a generated QR code, and assert the event is imported and `Event imported` is shown
- [x] 4.8 Desktop test: with the desktop platform mocked, the decoded QR URL starts with the configured share base URL followed by `#share=`

## 5. Verification

- [x] 5.1 `npm run typecheck`, `npm run test:run` and `npm run build` pass, and `qrcode` ends up in a separate lazy chunk
- [ ] 5.2 Manual check: at a 360px viewport in light and dark themes, scan with a phone camera and confirm the event imports
