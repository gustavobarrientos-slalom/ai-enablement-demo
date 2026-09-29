## Why

Split has no backend and no accounts, so an event lives only in the browser that
created it. Today the only way to get a shared dinner or trip onto a friend's
phone is to retype every participant and expense by hand. A shareable link makes
the app usable by a group without adding a server, an account system, or any
network round-trip for the data itself.

## What Changes

- Add a **Share** action on the active event that copies a URL to the clipboard.
  The URL carries the whole event — name, participants, expenses (including
  categories, splits and tips), and paid-transfer marks — encoded in the URL
  **hash**, compressed with `lz-string`'s `compressToEncodedURIComponent`.
- Data MUST live in the fragment (`#`), never in the query string, so the
  payload is never transmitted to the GitHub Pages host.
- Show the confirmation `Link copied` after a successful copy.
- On app start, if the hash carries shared data, decode it and **import it as a
  new event** with a fresh id and fresh timestamps. Existing events are never
  overwritten or modified. The imported event is opened and `Event imported` is
  shown.
- Invalid, truncated or corrupted payloads show `This link is invalid` and leave
  the stored events untouched.
- After a load attempt — success or failure — the shared data is removed from
  the hash so reloading the page does not re-import.
- The encoder and decoder are round-trip exact: decoding an encoded event yields
  an identical event.
- New dependency: `lz-string`.

## Capabilities

### New Capabilities
- `event-sharing`: encoding an event into a shareable URL hash, copying that
  link, and importing an event from an incoming link, including invalid-payload
  handling and hash cleanup.

### Modified Capabilities
<!-- None. Existing event, expense and settlement requirements are unchanged;
     import reuses the existing event creation path. -->

## Impact

- **New** `src/domain/share.ts` — pure encode/decode plus payload validation.
- **New** `src/lib/clipboard.ts` — clipboard write with a fallback.
- **Store** `src/store/useAppStore.ts` — an `importEvent` action that appends a
  new event and makes it active.
- **UI** a Share control in the event header; `src/ui/messages.ts` gains
  `Link copied`, `Event imported`, `This link is invalid`.
- **App** `src/App.tsx` reads and clears the hash once on mount.
- **Dependencies** adds `lz-string`.
- No change to persistence format, to existing specs, or to the GitHub Pages
  deployment setup.
