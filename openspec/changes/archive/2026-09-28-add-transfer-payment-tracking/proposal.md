## Why

The Settlement screen explains who owes whom, but it cannot record which payments have actually happened. A per-event checklist makes it possible to track progress without changing the accounting or transfer plan.

## What Changes

- Add a paid/unpaid checkbox for every computed transfer, identified by payer ID, receiver ID, and amount in integer cents; persist paid marks with their event.
- Reconcile paid marks whenever participant or expense changes recompute the transfer plan: keep identical transfers, discard marks for transfers no longer present.
- Show `X of Y paid` progress and, when a nonempty plan is fully checked, `All paid — event closed`. This is a checklist message, not a change to the event's Open/Archived status.
- Keep balances and transfers derived and unchanged by paid marks. Archived events remain viewable but their checkboxes are read-only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `settlement`: Add persistent event-scoped payment checklist and progress without persisting or changing calculated balances or transfers.

## Impact

Settlement view and copy, event-scoped persisted state and its validation/migration, checklist reconciliation on group and expense actions, and automated domain, store, and component tests. No backend or payment processing is introduced.