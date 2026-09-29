## Why

Split currently persists just one event, so starting another event replaces the context for the previous one. An Events home and per-event history let people revisit past groups without mixing their participants, expenses, or settlement results.

## What Changes

- **BREAKING**: Replace the single persistent event with a collection of independently stored events and a last-active-event selection; bump the storage version and migrate a nonempty legacy event as the first event.
- Add an Events home showing name, creation date, participant count, group total, and Open/Archived status, ordered by most recent update, with an empty-state Create event action and All/Open/Archived filters.
- Create events with a validated name (default `New event`), open the selected event on its existing Group / Expenses / Settlement tabs, and return to the Events list through the header.
- Support renaming, confirmed deletion, archiving, and unarchiving. Archived events remain viewable but read-only.
- Track creation and last-update timestamps per event; group and expense changes update only that event.
- Creating a new event replaces the former reset-event workflow. No reset-event requirement exists in the current group-management spec, so there is no obsolete requirement block to remove.

## Capabilities

### New Capabilities

- `event-management`: Events home, event lifecycle, sorting, filtering, timestamps, per-event isolation, read-only archive, active-event restoration, and legacy migration.

### Modified Capabilities

- `group-management`: Event naming and participant persistence are scoped to the selected event rather than one implicit global group; the default name applies on creation, not on an empty app.
- `expense-tracking`: Expense persistence is scoped to the owning event rather than one global expense list.

## Impact

The app shell and tabs, group and expense store actions, persisted-state schema and migration, event/domain validation and derived totals, confirmation UI, and automated tests. No backend or client-side router is required.