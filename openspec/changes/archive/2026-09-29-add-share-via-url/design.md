## Context

Split is a browser-only app deployed to GitHub Pages: no backend, no accounts,
no database. An event currently lives in one browser's `localStorage` behind a
versioned Zustand `persist` key. Getting an event onto a second device today
means retyping it.

The existing model is small and self-contained: a `SplitEvent` holds `name`,
`participants`, `expenses` (with `category`, `splitMode`, `shares`, `tip`) and
`paidTransfers`, all money as integer cents. Balances and transfers are derived,
never stored — so a share payload only needs the stored fields.

Constraints that shape this design:
- No server may ever see the event data. GitHub Pages logs request URLs; the
  fragment is not sent to the server, the query string is.
- URLs have practical length limits (~2000 characters in the worst browsers,
  far more in modern ones), so the payload must be compressed.
- Navigation is tab-based, not routed, precisely because GitHub Pages 404s on
  client routes. Share must not introduce a router.

## Goals / Non-Goals

**Goals:**
- Encode one event into a URL fragment and decode it back byte-for-byte.
- Copy the URL with one action and confirm with `Link copied`.
- Import an incoming payload as a brand-new event, never touching existing data.
- Fail closed: any unreadable payload leaves state untouched and says
  `This link is invalid`.
- Clear the fragment after a load attempt so reloads never duplicate an import.
- Keep all encode/decode logic pure and unit-testable in `src/domain`.

**Non-Goals:**
- Live collaboration, syncing, or merging two copies of the same event.
- Encryption or access control — anyone with the link has the data.
- Sharing several events at once, or sharing the full event history.
- Short links, a URL shortener, or any network call.
- Backwards or forwards compatibility with payload versions other than v1
  (unknown versions are simply invalid).

## Decisions

### Payload goes in the hash, not the query string
The fragment is never transmitted to the origin server, so the event data is
never written into GitHub Pages access logs or a referrer header. Format:
`https://host/<base>/#share=<compressed>`.

*Alternative considered:* query string (`?share=...`). Rejected — the data would
be sent to the host on every load, violating the "no backend sees your data"
premise.

*Alternative considered:* a routed `/share/:payload` path. Rejected — client-side
routes 404 on GitHub Pages, which is why the app is tab-based.

### `lz-string` with `compressToEncodedURIComponent`
`compressToEncodedURIComponent` emits URL-safe characters directly, so no extra
`encodeURIComponent` pass is needed and no `+`/`/`/`=` escaping bugs appear. It
compresses the highly repetitive JSON of an event well, which matters for URL
length.

*Alternative considered:* plain `btoa(JSON.stringify(...))`. Rejected — base64
is ~33% larger than the input and not URL-safe, so realistic events would blow
past conservative URL limits.

*Alternative considered:* `CompressionStream` (gzip) + base64url. Rejected — it
is async, needs a base64url step anyway, and has weaker coverage than a tiny
well-known library.

### A versioned, explicit payload shape
The payload is `{ v: 1, name, participants, expenses, paidTransfers }` — the
stored event fields only. `id`, `status`, `createdAt` and `updatedAt` are
deliberately excluded: the importing browser mints its own, which is what makes
"never overwrite" structurally true rather than a runtime check. A payload with
`v !== 1` is invalid.

*Alternative considered:* serialize the whole `SplitEvent` including `id`.
Rejected — it invites id collisions and tempts an "update existing" code path
that the requirements forbid.

### Decoding validates, it does not repair
`decodeShare` returns a `Result`, matching the existing domain convention. It
checks: decompression succeeded, JSON parsed, `v === 1`, participant ids are
unique, every expense `payerId` and share `participantId` refers to a known
participant, every money value is a safe non-negative integer, categories and
split modes are known, and `paidTransfers` reference known participants. Any
failure returns `ok: false` and the caller shows `This link is invalid`. Nothing
is coerced or partially imported.

### Import is a store action, reading the hash is an effect
`src/domain/share.ts` stays pure (encode/decode/validate). `useAppStore` gains
`importEvent(payload)`, which appends a new event with a fresh id from
`lib/ids` and timestamps from `lib/clock`, sets it active, and returns success.
`App` runs a one-shot mount effect that reads `location.hash`, clears it via
`history.replaceState`, and then imports or reports the error. Clearing before
importing guarantees the fragment is gone on every path, including a thrown
error, and `replaceState` avoids a reload and leaves no back-button entry.

### Clipboard with a fallback
`src/lib/clipboard.ts` wraps `navigator.clipboard.writeText` and falls back to a
hidden textarea + `document.execCommand('copy')` for non-secure contexts. It
returns a boolean; `Link copied` is shown only on success. This keeps the
browser API out of components and out of the domain, matching how `ids` and
`clock` are already isolated.

### Messages live in `src/ui/messages.ts`
`Link copied`, `Event imported` and `This link is invalid` join the existing
English copy module so tests can assert on the exported constants rather than
duplicated string literals.

## Risks / Trade-offs

- **Very large events produce URLs some clients truncate** → Compression buys
  roughly an order of magnitude of headroom for realistic events (tens of
  participants, hundreds of expenses). Truncation surfaces as a decode failure,
  which already fails closed with `This link is invalid` rather than importing
  partial data.
- **Anyone with the link sees the event** → Documented as an accepted trade-off;
  the app has no accounts, so there is no identity to authorize against. The
  hash at least keeps the payload out of server logs.
- **Re-sharing creates duplicate events** → Intentional. Merging is out of
  scope, and silently overwriting a local event is explicitly forbidden by the
  spec. Users can delete the duplicate through the existing confirmation flow.
- **A new runtime dependency (`lz-string`)** → Small, dependency-free, widely
  used, and confined behind `src/domain/share.ts`, so swapping the codec later
  touches one file.
- **`document.execCommand('copy')` is deprecated** → Only a fallback; the
  primary path is the async Clipboard API, and failure simply means no
  `Link copied` message.
- **Hash cleared before the import runs** → If importing threw, the link would
  be lost from the URL. Accepted: the payload is still in memory for that
  attempt, and the alternative — leaving it in place — risks the re-import loop
  the spec forbids.

## Migration Plan

Purely additive. No persisted-state shape change, so no `persist` version bump
and no migration function. Rollback is removing the Share control and the mount
effect; previously shared links simply stop importing.

## Open Questions

- Should the Share control also appear on the Events home per-event row, or only
  in the open-event header? Starting with the header only.
- Should archived events be shareable? Current assumption: yes — sharing reads
  data and never mutates, so the archived guard does not apply.
