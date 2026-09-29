## Why

The group roster from `add-group-management` is only useful once the group can record what was actually spent. Expenses are the raw input for every balance and every transfer, so without them the Expenses and Settlement tabs stay empty and the app cannot answer its core question: who owes whom.

## What Changes

- Add a working **Expenses** tab, enabled once the group is valid (2+ participants).
- Introduce the expense model: a concept (1–60 chars), a positive MXN amount with at most 2 decimals, exactly one payer, and at least one beneficiary. The payer need not be a beneficiary.
- Add **equal split**: divide the total across beneficiaries, distributing leftover cents one each in participant order so the parts always sum exactly to the total.
- Add **custom split**: an explicit amount per beneficiary, with saving blocked until the parts sum exactly to the total, and a live `$X remaining` / `$X over` indicator.
- Allow **editing and deleting** expenses.
- Show the expense list with a **group total** and an empty state reading `No expenses yet` with a matching icon.
- Persist expenses alongside the existing group state so they survive reloads.
- Replace the provisional `Expense` type introduced by `add-group-management` with the full shape, keeping participant-removal blocking correct.

## Capabilities

### New Capabilities
- `expense-tracking`: Expense creation, validation, equal and custom splitting, editing, deletion, list presentation with totals and empty state, and persistence of expenses.

### Modified Capabilities
- `group-management`: No requirement text changes. The existing removal rule now applies against real expenses rather than an always-empty list; behavior is already specified, so no delta spec is needed.

## Impact

- **Domain**: new `src/domain/expense.ts` (validation, amount parsing to integer cents) and `src/domain/split.ts` (equal and custom split allocation), both pure and unit-tested. `Expense` in `src/domain/types.ts` widens to include `concept`, `amountCents`, and per-beneficiary `shares`.
- **Store**: `src/store/useAppStore.ts` gains `addExpense`, `updateExpense`, and `removeExpense`, and persists `expenses` under the existing versioned key. **BREAKING** for persisted data: the stored shape changes, so the storage version bumps and older payloads are discarded per the existing "discard, don't crash" rule.
- **UI**: new `src/components/ExpensesTab.tsx`, an expense form with split-mode selection, a list row component, and an empty state. English copy, MXN/`es-MX` amount formatting, mobile-first from 360px.
- **Icons**: Font Awesome Free only — add a receipt-style icon for the empty state plus edit/delete icons.
- **Downstream**: settlement will consume `shares` directly, so balances never need to re-derive a split.
- **No new dependencies.**
