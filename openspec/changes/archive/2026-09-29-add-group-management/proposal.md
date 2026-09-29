## Why

Split cannot do anything useful until a group exists: every expense needs a payer and beneficiaries, and every settlement needs a roster to balance. The Group screen is the entry point of the app, so it must establish the event name and participant list before the Expenses and Settlement tabs become meaningful.

## What Changes

- Add a **Group** tab as the first (and initially only enabled) tab of the app.
- Let the user name the event, with a 1–60 character limit and a `New Event` default.
- Let the user add participants by name: 1–30 characters after trimming, unique case-insensitively.
- Track group validity: a group is valid only with **at least 2 participants**. While invalid, the Expenses and Settlement tabs are disabled.
- Let the user remove participants, except those referenced by any expense as payer or beneficiary. Those removals are disabled with the message `Has associated expenses`.
- Preserve participant **insertion order** as a stable, documented ordering used for tie-breaking in balance and settlement calculations.
- Add pure domain functions for participant/event validation and group validity, plus the Zustand state slice and the Group screen UI.

## Capabilities

### New Capabilities
- `group-management`: Event naming, participant roster management (add/remove/uniqueness/ordering), group validity, and the resulting tab-enablement rules.

### Modified Capabilities
<!-- None: this is the first capability in the project. -->

## Impact

- **New domain module**: `src/domain/group.ts` (+ types in `src/domain/types.ts`) with pure validation and validity functions, fully unit-tested with Vitest.
- **New store slice**: `src/store/` Zustand store holding `eventName` and `participants`, persisted to `localStorage` via the `persist` middleware under a versioned key; invalid or unknown-version data is discarded.
- **New UI**: `src/components/GroupTab.tsx` plus the tab shell (`src/App.tsx`) that owns tab state and disables Expenses/Settlement while the group is invalid. English copy, MXN/`es-MX` conventions, mobile-first from 360px.
- **Icons**: Font Awesome Free only (e.g. user-plus, trash) via `@fortawesome/react-fontawesome`.
- **Dependencies**: no new runtime dependencies beyond the already-planned stack.
- **Downstream contract**: expenses and settlement will consume `participants` order for deterministic tie-breaking, and must report participant references so removal can be blocked.
