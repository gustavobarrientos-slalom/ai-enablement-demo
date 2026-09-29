## 1. Payment Identity and Reconciliation

- [x] 1.1 Add a pure tuple matcher for payer ID, receiver ID, and integer-cent amount, plus a helper that retains only paid tuples in a computed transfer plan.
- [x] 1.2 Add focused domain tests for identical tuple retention, different payer/receiver/amount rejection, empty plans, disappearance and reappearance as unpaid, and per-event independence.

## 2. Event-Scoped Store and Persistence

- [x] 2.1 Persist only paid transfer tuples on each event; implement a store toggle for transfers in the current plan, rejecting archived events and invalid or absent transfers without changing nets, plan, or event status.
- [x] 2.2 Reconcile marks atomically with successful participant and expense mutations and on rehydration; keep failed/no-op mutations and other events' marks unchanged.
- [x] 2.3 Validate persisted tuples, default recognized older event payloads without marks to an empty checklist, and coordinate any storage-version migration with the expense-category change.
- [x] 2.4 Add store tests for toggling, archive guards, unchanged calculations, mutation pruning/retention, two-event isolation, reload, stale-mark cleanup, malformed data, and supported predecessor payloads.

## 3. Settlement Checklist UI

- [x] 3.1 Add labeled paid/unpaid native checkboxes to transfer rows, disabled for archived events, and show derived `X of Y paid` progress for nonempty plans.
- [x] 3.2 Show exact `All paid — event closed` copy for a fully checked nonempty plan without archiving; keep `Everyone is settled up` and no completion message for empty plans.
- [x] 3.3 Add component tests for check/uncheck, partial and full progress, reload, archived read-only display, recomputation, and zero-transfer state.

## 4. Verification

- [x] 4.1 Run focused domain, store, and Settlement tests, then `npm test` and `npm run build`; resolve failures caused by this change.