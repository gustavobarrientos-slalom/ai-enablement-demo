## Why

Share via URL copies a link to the clipboard. That works for chat apps, but it's
awkward when people are sitting at the same table, for example at the end of a
dinner. A QR code lets someone point their phone camera at the organizer's
screen and import the event right away. It uses the same link, so there is no
new import path to build or secure.

## What Changes

- The top-bar Share action opens a Share sheet with two options: **Copy link**
  (the current behaviour, including the `Link copied` confirmation) and **Show
  QR code**.
- **Show QR code** opens a sheet with a QR code that encodes exactly the same
  URL that **Copy link** writes to the clipboard. The event name appears below
  the code.
- The QR code is generated locally with the `qrcode` npm package, using error
  correction level **L** to fit as much data as possible. The URL is never sent
  to any external service.
- If the URL is too long for a QR code, the sheet shows `Too much data for a QR
  code — use the link instead` and still offers **Copy link**.
- The QR code is always drawn with dark modules on a white background, with a
  white quiet zone around it, in both light and dark themes. It is at least
  240px wide.
- Scanning the code opens the web app with the `#share=` hash, which imports
  the event through the existing shared-link flow. Import behaviour does not
  change.
- **BREAKING (UX)**: Share no longer copies the link in one tap. Copying now
  takes a second tap on **Copy link**.

## Capabilities

### New Capabilities
- `share-qr-code`: The Share sheet (Copy link / Show QR code), local QR
  generation with error correction level L, the QR sheet layout and fixed
  colors, the "too much data" fallback, and the guarantee that scanning imports
  the event the same way the shared link does.

### Modified Capabilities
<!-- None. The original `event-sharing` capability from the archived
`add-share-via-url` change was never copied into `openspec/specs/`, so there is
no main spec to write a delta against. The Share-action change is described in
`share-qr-code`. -->

## Impact

- **Code**: `src/App.tsx` (Share opens a sheet instead of copying directly).
  New `src/components/ShareSheet.tsx` and `src/components/QrCode.tsx`. New
  `src/lib/qr.ts` (wraps `qrcode`, returns a module matrix or `too-large`).
  `src/ui/messages.ts` (QR copy). `src/ui/theme.ts` (theme-invariant QR
  colors).
- **Dependencies**: `qrcode` (runtime), `@types/qrcode` and `jsqr`
  (dev-only, used to decode generated codes in tests).
- **Bundle**: `qrcode` is loaded with a dynamic import only when **Show QR
  code** is chosen, so the initial bundle size doesn't change.
- **Platforms**: works the same on web and desktop. On desktop the share base
  URL is the GitHub Pages URL, so scanning opens the web app. No new Tauri
  permissions.
- **Privacy**: no network requests. The payload stays in the URL hash as
  before.
