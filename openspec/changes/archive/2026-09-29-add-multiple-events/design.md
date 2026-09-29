## Context

The app shell currently opens directly on Group and the Zustand store holds a single `GroupState` (`eventName`, `participants`, `expenses`) with persistence in `localStorage`. Existing balance, settlement, expense-total, and group-validation functions already take group data as arguments, so they can operate on one selected event without persisting derived values. The current store advertises `STORAGE_VERSION = 3` at `split:v2`; concurrent tip and category changes may alter the version and key before this change is implemented. There is no reset-event requirement in the canonical group-management spec to remove.

## Goals / Non-Goals

**Goals:**

- Keep an ordered history of independent events with stable IDs, lifecycle status, and timestamps.
- Open a selected event on Group and return to a filterable Events home without adding a router.
- Make archived events read-only in both UI and store actions, while retaining read access and confirmed deletion.
- Preserve valid legacy single-event data, reject unknown or malformed storage, and restore the last selected event.

**Non-Goals:**

- Backend accounts, cross-device synchronization, editing archived events, or changing split/settlement algorithms.
- A reset-event action: creating a new event serves that purpose, and no existing reset requirement needs a removal delta.

## Decisions

### Per-event data in one collection

Introduce an `Event` with an ID, validated name, participant array, expense array, `Open | Archived` status, `createdAt`, and `updatedAt`; store `events` and `lastActiveEventId` together. Keep the current view selection separate from the persisted last-active identity so Back to Events shows the home immediately, but a reload can reopen the last selected event. Creating or opening an event makes it active and selects Group; deleting the active event clears both selection and the persisted last-active identity. Rehydration resolves IDs against the validated event list and falls back to home for a missing ID. Use no client-side routes.

Move group and expense mutations to actions targeting the active event ID and create updated event objects without modifying other events. Guard each mutation if no event is active or its status is Archived; verify this at the store boundary even if controls are hidden or disabled. Use the existing domain functions on the selected event's arrays. Read selectors and components derive balances, transfers, and totals solely from the selected event; no derived values are persisted. Keep event IDs stable and reject duplicate IDs on rehydration.

Alternative rejected: swapping a single mutable `GroupState` in and out of separate event records, which risks writing one event's changes to another and stale per-tab form state. Key the tab content by event ID to reset local drafts on switch.

### Lifecycle and dates

Create an event with `createdAt` and `updatedAt` set to the same ISO timestamp from one clock call. Successful rename, archive/unarchive, participant, and expense mutations advance only that event's `updatedAt`; no-op, invalid, cancelled, or blocked actions leave timestamps untouched. Compare time values to sort descending, keeping a stable event-ID/order tie-break. Use a supplied/testable clock or timestamp helper so tests can assert chronological behavior without timing flakiness. Display creation dates in an English-friendly short format; format totals with the existing MXN formatter. The event list filter changes only what is displayed.

Default the name only when the creation input is omitted; explicitly submitted whitespace is invalid. Reuse the existing 1-to-60-character name validation for creating and renaming events. Confirm deletion with the specified text before calling the delete action; archived events can be unarchived or deleted but not renamed. The group name editing control may remain in Group for open events if it targets only the active event.

Alternative rejected: sorting by `createdAt`, which hides edits to older events, or deriving timestamps from render time, which would reorder untouched records.

### Guarded version migration

Increment the actual storage version in use at implementation time and use an appropriately versioned key; if the predecessor key differs, read it before the new empty store writes. Validate both the storage envelope/version and legacy group with `parseGroupState` (including any tip/category migrations from changes landed earlier). A legacy group with no participants and no expenses is empty even if it has a custom name: discard it. Otherwise wrap it into one Open event with a new ID, `createdAt = updatedAt` at migration time, preserve name, participant order, expenses, and shares, and set its ID as last active. Persist the migrated collection once under the new key. Validate all current events, timestamps, unique IDs, participant references, and last-active identity on rehydration; an orphan last-active ID clears selection, while invalid event data or unknown versions discard the payload. Do not treat missing or invalid legacy data as a new event.

Alternative rejected: blindly replacing the storage key or converting every legacy `New Event` to a real event, which would silently lose history or create an empty placeholder. If category and tip changes land first, migrate their then-current format without bypassing their validation.

## Risks / Trade-offs

- [An archived event is edited through an old action or a stale form] -> Reject all group and expense mutations in store actions and key forms by event ID; test both UI and direct action calls.
- [An unrelated event receives a change or a stale settlement] -> Derive all selectors from the active event and assert isolation for two events through edits, switching, reload, and settlement.
- [Migration races with persistence initialization or conflicts with other in-flight migrations] -> Bootstrap only a recognized predecessor before writing the new key; test a literal predecessor payload from the version actually shipping and check migrated storage after reload.
- [A corrupted active ID or timestamp breaks the list] -> Validate IDs/dates and use home fallback for orphan IDs; test malformed envelopes and unsupported versions.
- [Returning home then reloading unexpectedly reopens the last event] -> This follows the stated last-active-on-reload requirement; keep transient home view separate from persisted last-active identity.

## Migration Plan

1. Add domain event structure and tests, then convert store mutations/selectors and the app shell to operate on the selected event.
2. Bump the current storage version, detect and validate only the known single-event predecessor, migrate nonempty data and discard empty/invalid data; support a differing predecessor key if present.
3. Verify reload, event isolation, archive guards, and the previous tip/category flows. A rollback to an older app may not read the new schema and can lose changes made after migration; retain the predecessor key until migration succeeds.

## Open Questions

None for the product behavior. Confirm the actual preceding key/version and expense shape when implementation begins because the in-flight tip and category changes also touch persistence.