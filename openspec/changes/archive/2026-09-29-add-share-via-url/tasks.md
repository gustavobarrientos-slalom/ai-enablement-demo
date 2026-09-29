## 1. Setup

- [x] 1.1 Add `lz-string` and `@types/lz-string` (or rely on bundled types) to `package.json` and install
- [x] 1.2 Add `LINK_COPIED`, `EVENT_IMPORTED` and `INVALID_SHARE_LINK` to `src/ui/messages.ts` with the exact copy `Link copied`, `Event imported`, `This link is invalid`
- [x] 1.3 Add the share icon to `src/ui/icons.ts`

## 2. Domain: encode and decode

- [x] 2.1 Define the v1 share payload type in `src/domain/share.ts`: `{ v: 1, name, participants, expenses, paidTransfers }`, excluding `id`, `status`, `createdAt` and `updatedAt`
- [x] 2.2 Implement `encodeShare(event)` returning the `lz-string` `compressToEncodedURIComponent` string of the JSON payload
- [x] 2.3 Implement `decodeShare(text)` returning a `Result`, validating: decompression, JSON parse, `v === 1`, unique participant ids, known `payerId` and share `participantId`, known `category` and `splitMode`, tip shape, safe non-negative integer cents, and `paidTransfers` referencing known participants
- [x] 2.4 Add a `SHARE_INVALID` error to the domain error union and wire it into `AppError`
- [x] 2.5 Write `src/domain/share.test.ts` covering round-trip equality for multi-participant events with equal and custom splits, percent and fixed tips, every category, and paid transfers
- [x] 2.6 Add round-trip tests for exact cent preservation at 1 cent, 99999999 cents and a percent tip
- [x] 2.7 Add decode-failure tests for truncated payloads, altered payloads, non-JSON, wrong `v`, missing fields, and an unknown payer

## 3. URL helpers

- [x] 3.1 Implement `buildShareUrl(origin, pathname, payload)` producing `#share=<payload>` and assert in a test that no event data lands in the query string
- [x] 3.2 Implement `readSharePayload(hash)` returning the payload text or `null`
- [x] 3.3 Implement `src/lib/clipboard.ts` `copyText(text)` using `navigator.clipboard.writeText` with a hidden-textarea `execCommand` fallback, returning a boolean

## 4. Store: import

- [x] 4.1 Add `importEvent(payload)` to `src/store/useAppStore.ts`, appending a new event with a fresh id from `lib/ids` and `createdAt`/`updatedAt` from `lib/clock`
- [x] 4.2 Make `importEvent` set the new event active and open, with status `open`
- [x] 4.3 Add a store test proving an import with two pre-existing events adds a third and leaves the originals byte-identical
- [x] 4.4 Add a store test proving importing a payload derived from an existing event creates a separate event rather than overwriting it

## 5. UI: sharing

- [x] 5.1 Add a Share button to the open-event header in `src/App.tsx` that encodes the active event, builds the URL and copies it
- [x] 5.2 Show `Link copied` only after a successful clipboard write, dismissing after a short delay
- [x] 5.3 Write a component test asserting the copied string is a URL with the payload in the hash and an empty query string

## 6. UI: importing on load

- [x] 6.1 Add a one-shot mount effect in `src/App.tsx` that reads `location.hash`, clears it with `history.replaceState`, then decodes and imports
- [x] 6.2 Show `Event imported` on success and `This link is invalid` on a decode failure
- [x] 6.3 Write a test asserting the hash is cleared after a successful import and after an invalid payload
- [x] 6.4 Write a test asserting a remount with the cleared URL creates no additional event
- [x] 6.5 Write a test asserting an invalid payload leaves stored events, the active event and persisted state unchanged

## 7. Verification

- [x] 7.1 Run `npm test` and confirm every scenario in `specs/event-sharing/spec.md` has a covering test
- [x] 7.2 Run `npm run build` to confirm the type-check and production build pass
- [ ] 7.3 Manually verify a generated link imports correctly in a fresh browser profile under the GitHub Pages `base` path
