## Context

Expenses have a base `amountCents`, an optional tip, and stored base shares. `expenseTotalCents` is the tip-inclusive amount used by `expensesTotal`, event cards, and settlement paid amounts. The store now persists an event collection at `STORAGE_VERSION = 4` under `split:v2`, with version 3 single-group data migrated into an event. Each event owns its own expenses and the active event is selected for Group / Expenses / Settlement. The canonical expense spec still describes single-group persistence, while the in-flight multiple-events change updates that requirement; this delta describes the combined event-scoped behavior without editing the other change's files.

## Goals / Non-Goals

**Goals:**

- Give every new and restored expense exactly one of six fixed categories and show its matching Font Awesome Free icon.
- Preserve valid event history, tip data, and expense ordering when migrating uncategorized expenses.
- Derive a breakdown from the active event's tip-inclusive expenses with cents that exactly match its group total.

**Non-Goals:**

- Custom categories, budgets, persisted breakdowns, or changes to the balance and transfer algorithms.
- Rounding category monetary totals or forcing rounded display percentages to add to 100.

## Decisions

### One canonical domain category, UI-only icon mapping

Add a fixed category union/list in the domain, include the category in `Expense` and `ExpenseDraft`, default `createEmptyDraft` to Other, and preserve it in `draftFromExpense`. Validate incoming drafts against the list, including direct store action calls, rather than coercing unknown values. Define the category-to-Font-Awesome-Free icon map in the UI registry so domain code stays independent of icons and React. Select it in the form and render it next to each expense row; event archive rules continue to govern editability.

Alternative rejected: free-form categories or icon types on persisted expenses; both weaken validation and couple domain data to presentation.

### Derive totals from the active event's existing cents

Add a pure domain calculation that aggregates `expenseTotalCents(expense)` into the expense's single category using the selected event's expenses. Return only categories with expenses sorted by descending integer-cent total, breaking ties in fixed-list order. The Settlement tab formats the cents using the existing MXN formatter and derives percentage text as `(categoryCents / groupTotalCents) * 100` to one decimal place. Those floating-point percentages are strictly display-only and never feed monetary calculations. Empty groups produce no rows and never divide by zero. Compute during render, not in a Zustand selector producing a fresh array each call, to avoid `useSyncExternalStore` loops; neither category totals nor percentages are persisted.

Alternative rejected: summing base `amountCents` or rounding cents from displayed percentages; both diverge from the tip-inclusive event total.

### Known-version migration without changing the storage key

Bump `STORAGE_VERSION` from 4 to 5 and keep the current `split:v2` key so Zustand's `migrate` can read existing version 4 data. For a version 4 event collection, validate its shape and expenses using the predecessor rules, add Other to each missing-category expense in every event without changing the event IDs, status, dates, participant order, tips, shares, or last-active ID, then pass it through strict new-version validation. Unknown explicit categories are invalid even in a predecessor payload. Preserve the existing recognized version 3 single-group migration by composing its validated result with the category migration, including `tip: null` for pre-tip expenses. For current version 5 payloads, `parseEventsState` must require a valid category for every expense; malformed payloads and unknown versions become empty state. Test with literal version 4 multi-event and version 3 legacy payloads, not payloads produced by the new code.

Alternative rejected: renaming the storage key in the same change, which would make Zustand miss existing `split:v2` records without a separate bootstrap reader. A key rename can be done separately with an explicit cross-key migration; the persisted envelope's version is the authoritative schema discriminator here.

## Risks / Trade-offs

- [Current parsing accepts uncategorized data accidentally] -> Make the current-version parser strict and normalize only inside recognized predecessor migrations; test missing and unknown categories separately.
- [Archived or non-active events are skipped] -> Migrate all event expenses and assert unchanged IDs, statuses, timestamps, and active selection with both archived and open fixtures.
- [The total drifts by a tipped cent] -> Aggregate via `expenseTotalCents` and test a tip-inclusive example and exact equality to `expensesTotal` in integer cents.
- [Spec deltas overlap with the in-flight multiple-events change] -> Keep its event-scoping and pre-tip restoration scenarios intact in this delta; reconcile requirements when archiving either change.

## Migration Plan

1. Add category types, form default and validation, category mapping, and derived breakdown with focused tests.
2. Bump envelope version to 5 under the existing key; migrate recognized v4 event collections (and still-supported v3 single groups) before strict v5 parsing. Reject unknown versions and invalid categories.
3. Run migration, component, domain, and build tests against literal persisted fixtures. Rollback to the previous build can discard v5 records as unknown; retain the old build's known-version behavior and avoid deleting the storage key.

## Open Questions

None for product behavior. Verify the actual current storage version when applying this proposal if the in-flight multiple-events work changes before implementation.