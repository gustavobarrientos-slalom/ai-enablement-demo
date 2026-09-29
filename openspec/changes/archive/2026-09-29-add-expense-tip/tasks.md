## 1. Types and error codes

- [x] 1.1 Add the `Tip` discriminated union to `src/domain/types.ts`: `{ kind: 'percent'; percent: number; amountCents: number }` and `{ kind: 'fixed'; amountCents: number }`
- [x] 1.2 Add `tip: Tip | null` to `Expense`
- [x] 1.3 Add `tipMode: 'none' | 'percent' | 'fixed'` and `tipValue: string` to `ExpenseDraft`
- [x] 1.4 Add `NEGATIVE_TIP`, `TIP_PERCENT_OUT_OF_RANGE`, `TIP_PERCENT_NOT_INTEGER` and `TIP_TOO_MANY_DECIMALS` to `ExpenseError`
- [x] 1.5 Run `npx tsc -b` and record every resulting error; this list is the authoritative audit of sites that assumed `amountCents` was the total

## 2. Tip computation in the domain

- [x] 2.1 Add `tipCentsFromPercent(amountCents, percent)` to `src/domain/money.ts` using `Math.floor(amountCents * percent / 100)` with integer arithmetic only
- [x] 2.2 Add `parseTipPercent(raw)` returning `Result<number, ExpenseError>`, rejecting non-integers, values below 0 and above 100
- [x] 2.3 Add `parseTipFixed(raw)` returning `Result<number, ExpenseError>`, rejecting negatives and more than 2 decimals; reuse the existing amount parser where possible
- [x] 2.4 Write tests in `src/domain/money.test.ts` covering `15%` of `100.01` flooring to 1500, `10%` of `250.00` giving 2500, `0%` giving 0, and each rejection

## 3. Proportional tip distribution

- [x] 3.1 Add `distributeProportionally(totalCents, weights)` to `src/domain/split.ts`: floor of each proportional part, leftovers handed out one each by largest fractional remainder, ties broken by index order
- [x] 3.2 Guard the `weights` sum of zero case so it cannot divide by zero
- [x] 3.3 Write tests in `src/domain/split.test.ts`: parts always sum to the total, `10%` on `300/200/100` giving `3000/2000/1000`, a zero weight receiving nothing, and the tie-break following index order
- [x] 3.4 Add a test that `250.00` split equally three ways with a `10%` tip produces tip parts `834/833/833`

## 4. Expense total and validation

- [x] 4.1 Add `expenseTotalCents(expense)` to `src/domain/expense.ts` returning `amountCents + (tip?.amountCents ?? 0)`; this is the single definition of an expense total
- [x] 4.2 Extend `validateExpense` to parse the tip after the amount validates, recomputing a percentage tip's `amountCents` on every save
- [x] 4.3 Add `expenseShares(expense)` returning base shares plus each beneficiary's tip part, derived on read; stored `shares` keep summing to `amountCents`
- [x] 4.4 Change `isExpenseConsistent` to compare `expenseShares` total against `expenseTotalCents`
- [x] 4.5 Change `expensesTotal` to sum `expenseTotalCents`
- [x] 4.6 Extend `draftFromExpense` to round-trip `tipMode` and `tipValue`, keeping `amount` as the base amount
- [x] 4.7 Write tests in `src/domain/expense.test.ts` for every scenario in the `Expense may include an optional tip` requirement, including all five rejection cases
- [x] 4.8 Write a test that derived shares sum to the tip-inclusive total for `100.00` with a fixed `10.00` tip split three ways, giving `36.68 / 36.66 / 36.66`
- [x] 4.9 Write a test that a tipped custom-split expense survives an edit round trip: `draftFromExpense` then `validateExpense` reproduces the same expense

## 5. Balances

- [x] 5.1 Change `paid` in `src/domain/balance.ts` to use `expenseTotalCents` and `consumed` to use `expenseShares`
- [x] 5.2 Add a test that `Ana` paying `100.00` with a `10%` tip split with `Luis` yields nets `+55.00` and `-55.00`
- [x] 5.3 Add a test asserting nets sum to exactly zero across a mixed set of tipped and untipped expenses; this is the guard against a missed call site

## 6. Persistence

- [x] 6.1 Extend the persisted-expense guard in `src/domain/group.ts` to accept an absent or null tip and to validate a present tip's `kind`, integer `amountCents` and non-negative value
- [x] 6.2 Include the tip when rebuilding expenses in the sanitize path around `group.ts:259`
- [x] 6.3 Bump `STORAGE_VERSION` to 3 in `src/store/useAppStore.ts`
- [x] 6.4 Replace the unconditional discard in `migrate` with a v2 handler that preserves state and defaults each expense to `tip: null`, keeping the discard for every other version
- [x] 6.5 Write a store test that seeds `localStorage` with a literal hand-written version-2 payload and asserts the expenses load with no tip and correct totals
- [x] 6.6 Write a store test that an unknown version still discards, and one that a malformed tip discards
- [x] 6.7 Write a store test that a tipped expense survives a save and rehydrate round trip

## 7. Copy and icons

- [x] 7.1 Add English copy to `src/ui/messages.ts` for the tip label, the three tip modes, and a per-row tip indicator
- [x] 7.2 Map the four new error codes to their messages exactly as worded in the spec
- [x] 7.3 Add a Font Awesome Free icon for the tip if one is needed, keeping to the existing solid set
- [x] 7.4 Write tests in `src/ui/messages.test.ts` asserting every new error code maps to a non-empty message

## 8. Expense form

- [x] 8.1 Add a tip mode selector (none / percentage / fixed) and a single numeric input to `src/components/ExpenseForm.tsx`
- [x] 8.2 Namespace the new field ids with the existing `useId()` prefix, since create and edit forms mount simultaneously
- [x] 8.3 Show a live preview of the computed tip and the resulting total
- [x] 8.4 Surface tip validation errors against the tip field and block saving
- [x] 8.5 Ensure switching to `none` clears any tip on save
- [x] 8.6 Verify the form remains usable at 360px

## 9. Expense list

- [x] 9.1 Show the tip-inclusive total per row in `src/components/ExpensesTab.tsx`
- [x] 9.2 Show the tip on rows that carry one
- [x] 9.3 Confirm the group total is tip-inclusive via the already-updated `expensesTotal`
- [x] 9.4 Write component tests for a tipped row, the tip-inclusive group total of `$160.00`, and an untipped row that is unchanged

## 10. Golden scenario

- [x] 10.1 Add the `10` percent tip to `Dinner` in `src/domain/settlement.golden.test.ts`, still building fixtures through `validateExpense`
- [x] 10.2 Update expected nets to `Ana +776.65`, `Luis -73.33`, `Carla +176.67`, `Beto -439.99`, `Diana -440.00`
- [x] 10.3 Update expected transfers to `Diana -> Ana 440.00`, `Beto -> Ana 336.65`, `Beto -> Carla 103.34`, `Luis -> Carla 73.33`
- [x] 10.4 Add the golden tip distribution assertion: tip of 10000, 2000 each, 22000 consumed each, `Ana` paid `110000`
- [x] 10.5 Keep a variant of the case with no tip asserting the original nets, proving the tip is the only difference
- [x] 10.6 Confirm the plan is still 4 transfers, the `N-1` bound

## 11. Verification

- [x] 11.1 Run the full suite and confirm every scenario in both delta specs maps to a passing test
- [x] 11.2 Confirm the domain stays pure: no react, zustand, `localStorage`, `document` or `window` under `src/domain`
- [x] 11.3 Grep the tip and total paths for floating-point money operations and confirm none were introduced
- [x] 11.4 Confirm no balance or transfer value is written to `localStorage`
- [x] 11.5 Re-run `npx tsc -b` and confirm the audit list from task 1.5 is fully resolved
- [x] 11.6 Run the production build and preview it at the configured base path
- [x] 11.7 Run `openspec validate add-expense-tip`
