## 1. Expense Categories

- [x] 1.1 Define the six fixed categories in the domain; add category to expense and draft types, default new drafts to Other, preserve edits, and reject unknown categories in validation.
- [x] 1.2 Add domain tests for all six choices, default Other, editing a category without altering other expense fields, and rejected invalid categories.
- [x] 1.3 Add the Font Awesome Free icon map and category selector to the create/edit expense form; show the matching icon beside every active-event expense row, including archived read-only lists.
- [x] 1.4 Add form and list tests for the six labels/icons, default/edit behavior, tip-inclusive amount display, and empty state.

## 2. Persisted Event Migration

- [x] 2.1 Bump the envelope storage version from the actual current value; map uncategorized expenses in every supported predecessor event to Other while preserving event metadata, active ID, order, tips, shares, and participants.
- [x] 2.2 Preserve the existing known single-group/pre-tip migration; require a valid category in current-version event data and discard malformed, unknown-category, or unsupported-version payloads.
- [x] 2.3 Add literal persisted-payload tests for open and archived multi-event migration, legacy single-group migration, current-version valid reload, missing/unknown category rejection, invalid tips, and unknown versions.

## 3. Settlement Breakdown

- [x] 3.1 Add pure category aggregation using `expenseTotalCents` on the active event's expenses, omit unused categories, sort by cents descending with a deterministic tie-break, and test that category cents sum to `expensesTotal` exactly.
- [x] 3.2 Render each category's MXN total and display-only one-decimal percentage on Settlement without persisting derived results or mixing expenses from different events.
- [x] 3.3 Add Settlement tests for tip-inclusive totals, ordering, 1-cent percentage rounding, updates after edits and deletions, switching events, and the no-expenses state.

## 4. Verification

- [x] 4.1 Run focused category, store, Expenses, and Settlement tests, then `npm test` and `npm run build`; resolve change-related failures.