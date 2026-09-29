## Why

Real event spending rarely stops at the listed price: restaurants and bars add a
tip, and today the only way to record one is to fold it silently into the
expense amount. That hides how much of a bill was tip and, worse, splits it
evenly even when the underlying consumption was not even. Someone who ordered a
`$300.00` bottle and someone who ordered a `$100.00` plate should not owe the
same tip.

## What Changes

- An expense MAY carry an optional tip, entered either as an integer percentage
  of the amount or as a fixed amount in MXN.
- The tip is distributed across the beneficiaries of the expense
  **proportionally to what each one consumed**, reusing the existing
  leftover-cent rule so the parts always sum exactly to the tip.
- A percentage tip converts to cents by flooring, so the recorded tip never
  exceeds the stated percentage.
- The expense **total** becomes `amount + tip`. This is the number the payer
  actually paid and the number the shares sum to.
- **BREAKING (internal invariant):** `isExpenseConsistent` and the `paid` side of
  balance computation currently treat `amountCents` as the total. Both move to
  the new total. Leaving either behind would silently break the zero-sum
  invariant by exactly the tip.
- The expense list and the group total show the tip-inclusive total, and an
  expense with a tip is visibly labelled as such.
- The settlement golden scenario gains a 10% tip on Dinner, with recalculated
  nets and transfers.
- Persisted data moves to storage version 3 with a real migration, so expenses
  saved before tips existed keep working and simply carry no tip.

## Capabilities

### New Capabilities

None. This change extends two existing capabilities.

### Modified Capabilities

- `expense-tracking`: adds the optional tip — its input forms, its validation,
  its proportional distribution rule, and the redefinition of an expense total
  as `amount + tip`.
- `settlement`: the golden scenario is restated with a 10% tip on Dinner and new
  expected nets and transfers. The balance requirement is clarified so that
  `paid` is the tip-inclusive total rather than the bare amount.

## Impact

**Domain (pure, integer cents)**

- `src/domain/types.ts` — new `Tip` type and an optional `tip` on `Expense`;
  tip fields on `ExpenseDraft`; new tip error codes.
- `src/domain/split.ts` — new proportional distribution helper, alongside the
  existing `splitEqually`.
- `src/domain/expense.ts` — `validateExpense` parses and validates the tip;
  `expensesTotal` and `isExpenseConsistent` move to the tip-inclusive total; a
  new `expenseTotalCents` helper becomes the single definition of "total".
- `src/domain/balance.ts` — `paid` uses the tip-inclusive total.
- `src/domain/group.ts` — the persisted-expense guard accepts and validates the
  optional tip.
- `src/domain/settlement.golden.test.ts` — restated with the tipped Dinner.

**Store**

- `src/store/useAppStore.ts` — `STORAGE_VERSION` 2 → 3 with a v2 → v3 migration
  that preserves existing expenses and leaves them untipped. Unknown versions
  still discard, as before.

**UI**

- `src/components/ExpenseForm.tsx` — tip controls (none / percentage / fixed).
- `src/components/ExpensesTab.tsx` — totals become tip-inclusive; tip shown per
  row.
- `src/ui/messages.ts` — new English copy for tip labels and tip errors.

**Explicitly unchanged**

- Money stays integer cents throughout; no floating-point math is introduced.
- Balances and transfers remain derived on read and are still never persisted.
- The greedy transfer algorithm and its N-1 bound are untouched.
