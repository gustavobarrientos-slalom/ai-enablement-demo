## 1. Event Model and Store

- [x] 1.1 Add an event model with stable ID, name, participants, expenses, Open/Archived status, and creation/update timestamps; validate event data and unique IDs on restoration.
- [x] 1.2 Replace the single-group store state with an events collection and last-active identity; implement create, open, return-home, rename, archive, unarchive, and confirmed-delete actions with name validation.
- [x] 1.3 Scope group and expense actions and derived totals, balances, and transfers to the selected event; block all archived/no-active mutations at the store boundary and update only the changed event's `updatedAt`.
- [x] 1.4 Add store/domain tests for default and invalid names, CRUD, timestamps, isolation, read-only archives, and event-scoped settlement without changing the existing split rules.

## 2. Storage Migration

- [x] 2.1 Bump the actual current version and key and persist only the event collection and last-active ID; validate envelopes, event IDs, timestamps, references, and status on rehydration.
- [x] 2.2 Import the supported preceding single-event payload before any empty new-key write: wrap valid nonempty data into one Open event preserving its group and expenses, discard empty legacy events, and account for tip/category migrations that landed first.
- [x] 2.3 Add literal localStorage payload tests for valid legacy migration, empty legacy discard, separate event reloads, last-active reopening, orphan-ID fallback to Events, malformed data, and unsupported versions.

## 3. Events Home and Navigation

- [x] 3.1 Add the Events home with name, creation date, participant count, MXN total, status, descending `updatedAt` order, All/Open/Archived filter, and `No events yet` with `Create event` action.
- [x] 3.2 Add event creation and opening flows, Group-on-open behavior, header return action, and existing Group / Expenses / Settlement tab gating keyed by the selected event.
- [x] 3.3 Add validated rename, archive/unarchive, and delete controls; require the exact `Delete this event? This cannot be undone.` confirmation and preserve data on cancel.
- [x] 3.4 Make archived Group and Expenses forms and mutations unavailable while leaving valid tabs readable; add component tests for filters, order, empty state, navigation, confirmation, and archive read-only behavior.

## 4. Verification

- [x] 4.1 Run focused event, store, Group, Expenses, and Settlement tests, then `npm test` and `npm run build`; resolve failures introduced by this change.