## Context

Settlement computes balances and a deterministic transfer plan from the selected event's participants and expenses. Only events and the last active ID are persisted; balances and transfers are never saved. Each event has an Open/Archived status, and its Group/Expenses changes funnel through store actions. The separate in-flight expense-category change also modifies persistence and plans a version bump, so the actual predecessor version must be checked when implementation starts.

## Goals / Non-Goals

**Goals:**

- Track paid transfers as a persistent checklist scoped to one event without modifying monetary calculations.
- Keep checked transfers only while the identical payer/receiver/cent amount exists in the recomputed plan.
- Show paid progress and completion only for nonempty plans; retain archived-event read-only behavior.

**Non-Goals:**

- Payment processing, actual money movement, automatic archiving, or changing the settlement algorithm.
- Storing calculated balances or the transfer plan.

## Decisions

### Persist only paid transfer identities

Add an event-scoped `paidTransfers` collection of records containing `fromId`, `toId`, and positive integer `amountCents`; an absent record means unpaid. Compare all three fields as a tuple so string-concatenation collisions cannot associate unrelated transfers. The event ID provides the outer scope, so identical triples in two events are independent. Do not store unchecked records, computed transfers, counts, or nets. Validate stored tuple shape and duplicate records on load, and treat well-formed marks absent from the recomputed plan as stale. A legacy event with no `paidTransfers` field starts with an empty collection.

Alternative rejected: an array of booleans keyed by transfer order. Editing expenses can reorder transfers, moving a paid flag onto the wrong debt. A timestamp/expense-ID based identity would also mark unchanged transfers as new unnecessarily.

### Reconcile synchronously with event mutations and rehydration

Use a pure intersection helper that takes the event's paid tuples and a newly derived plan from its participants and expenses. For successful group/expense mutations, compute balances and transfers from the updated event, intersect paid tuples with that plan, and store the updated event in the same action. Failed/no-op mutations keep existing marks. At rehydration, validate each event's shape and intersect well-formed marks with the recomputed plan before exposing state, so old marks cannot reappear after reload. An inconsistent plan has no trustworthy transfer identities and thus cannot retain marks. The existing derived settlement selectors remain unchanged and never inspect paid marks. Checking/unchecking a valid transfer updates only its event's marks, not its balances, transfers, or Open/Archived status; reject toggles on archived events and for transfers absent from the current plan. Keep `updatedAt` unchanged for checklist-only actions because no group or expense changed.

Alternative rejected: pruning in a React effect after a mutation. That permits a stale checked row/progress to render and persist between the expense change and the effect; reconciling inside the store is atomic.

### Progress and completion copy

Render a labeled native checkbox per transfer with payer, receiver, and formatted MXN amount; derive `X` by counting current-plan tuples found in the paid collection and `Y` from the plan length. Show `X of Y paid` while a plan is present and show the exact text `All paid — event closed` only for `Y > 0 && X === Y`. This is informational copy, not an event-status transition. If `Y === 0`, retain the existing `Everyone is settled up` state without declaring all paid. Archived events render checked state with disabled checkboxes.

Alternative rejected: treating zero transfers as vacuously all paid, which would show completion before any payments existed and conflict with the settled-up empty state.

### Versioned persistence alongside other changes

Extend event persistence parsing to recognize and validate paid tuples. Coordinate any schema-version increment with the category change instead of hard-coding its planned version; when migrating recognized predecessor payloads, initialize missing marks to an empty collection and preserve existing validated marks. Keep existing single-group migration behavior if still supported. As with other persisted event fields, malformed shapes or unknown storage versions should be discarded rather than crashing; stale but well-formed marks are pruned. Test literal predecessor data with no checklist field and current-version data with checked marks.

Alternative rejected: placing marks in a separate localStorage key, which complicates per-event deletion, migration, and atomic reconciliation.

## Risks / Trade-offs

- [A paid mark attaches to a changed transfer] -> Compare payer ID, receiver ID, and integer cents and test changed amounts, direction, and unchanged tuples through recomputation.
- [Stale marks survive a reload or reappear after subsequent edits] -> Reconcile on both mutation and rehydration; test disappearance followed by reappearance as unpaid.
- [Archive actions bypass read-only behavior] -> Guard toggle actions in the store and disable archived-event checkboxes; test both direct calls and UI.
- [Persistence work overlaps the in-flight category change] -> Use the actual predecessor version and compose migration/validation with its category rules without discarding either event data or checked marks.

## Migration Plan

1. Add a pure tuple-match/reconcile helper and tests, then store paid tuples on events and reconcile in the shared mutation path.
2. Add persisted-state validation and a migration from the actual previous format that defaults missing marks to none; preserve category migration and last-active-event behavior.
3. Add Settlement checkboxes and progress; run store, persistence, and UI tests. Rolling back to an older version may discard newer persisted data as unknown, consistent with the existing versioned-storage policy.

## Open Questions

None for product behavior. Confirm the storage version and category-change status at implementation time before updating the migration path.