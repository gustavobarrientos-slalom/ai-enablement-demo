## 1. Domain types

- [ ] 1.1 Widen `Expense` in `src/domain/types.ts` to `{ id, concept, amountCents, payerId, splitMode, shares }` and add the `Share` and `SplitMode` types
- [ ] 1.2 Add an `ExpenseDraft` type representing unvalidated form input (concept, raw amount string, payer, per-beneficiary selection and custom amounts)
- [ ] 1.3 Extend the error union with `EMPTY_CONCEPT`, `CONCEPT_TOO_LONG`, `INVALID_AMOUNT`, `AMOUNT_NOT_POSITIVE`, `TOO_MANY_DECIMALS`, `NO_BENEFICIARIES`, `UNKNOWN_PARTICIPANT`, `NEGATIVE_SHARE`, and `SHARES_DO_NOT_SUM`
- [ ] 1.4 Add `beneficiaryIds(expense)` deriving beneficiaries from `shares`, and update `isParticipantReferenced` to use `payerId` plus share participants

## 2. Amount parsing

- [ ] 2.1 Add `parseAmountToCents(raw)` in `src/domain/money.ts` using string manipulation (never `value * 100`), rejecting non-numeric input, more than 2 decimals, and non-positive values
- [ ] 2.2 Write unit tests for `parseAmountToCents`: `250` → 25000, `250.00` → 25000, `0.07` → 7, `10.5` → 1050, and rejection of `0`, negatives, `10.999`, `abc`, and empty input
- [ ] 2.3 Write a test asserting known floating-point traps stay exact, including `10.075` and `0.1` / `0.2` style inputs

## 3. Split algorithms

- [ ] 3.1 Add `splitEqually(amountCents, beneficiaryIds, participants)` in `src/domain/split.ts` using `floor` plus remainder, giving the leftover cents one each in participant insertion order
- [ ] 3.2 Add `buildCustomShares(entries)` converting per-beneficiary raw amounts into shares, rejecting negative values
- [ ] 3.3 Add `sharesTotal(shares)` and `splitDifference(shares, amountCents)` returning the signed difference in cents
- [ ] 3.4 Add a single `buildShares(draft, participants)` entry point that dispatches on split mode, so create and edit share one path
- [ ] 3.5 Write unit tests for the spec example: `$250.00` among `Ana`, `Luis`, `Carla` gives `8334 / 8333 / 8333`
- [ ] 3.6 Write unit tests for exact division (`$100.00` across 4 → `2500` each) and a single beneficiary receiving the full amount
- [ ] 3.7 Write a test proving the remainder follows participant order, not beneficiary selection order
- [ ] 3.8 Write a property-style test over many amounts and beneficiary counts asserting shares always sum exactly to the total

## 4. Expense validation

- [ ] 4.1 Add `validateExpense(draft, participants, id)` in `src/domain/expense.ts` enforcing concept 1–60 trimmed, positive amount with at most 2 decimals, exactly one existing payer, and at least one beneficiary
- [ ] 4.2 Validate that the payer and every share participant exist in the roster, while allowing a payer who is not a beneficiary
- [ ] 4.3 Reject negative shares and custom shares that do not sum exactly to the amount
- [ ] 4.4 Write unit tests: valid expense, trimmed concept, payer excluded from beneficiaries, empty concept, 60/61-char boundaries, zero and negative amounts, `10.999`, and no beneficiaries
- [ ] 4.5 Write unit tests for custom splits: balanced saves, under-total rejected, over-total rejected, zero share allowed, negative share rejected

## 5. Totals

- [ ] 5.1 Add `expensesTotal(expenses)` summing `amountCents` in integer arithmetic
- [ ] 5.2 Write unit tests for `expensesTotal`: empty list is 0, and `$120.50` plus `$79.50` is `$200.00` in cents

## 6. Store

- [ ] 6.1 Add `addExpense(draft)` to `src/store/useAppStore.ts`, delegating to `validateExpense` and appending on success
- [ ] 6.2 Add `updateExpense(id, draft)` that revalidates, recomputes shares, preserves list position, and leaves the original untouched on failure
- [ ] 6.3 Add `removeExpense(id)` and confirm participant removal unblocks once the last referencing expense is gone
- [ ] 6.4 Persist `expenses` in `partialize` and bump the storage version to 2
- [ ] 6.5 Extend `parseGroupState` to validate expenses, including referential integrity of `payerId` and share participants and the shares-sum invariant
- [ ] 6.6 Write store tests for add, update, delete, rejected edits leaving state unchanged, and deletion updating the total
- [ ] 6.7 Write persistence tests: expenses and their order restored on reload, malformed expenses discarded, expenses referencing unknown participants discarded, version 1 payload discarded

## 7. Copy and icons

- [ ] 7.1 Add English messages for every new error code to `src/ui/messages.ts` (`The concept is required`, `The concept must be at most 60 characters`, `The amount must be greater than zero`, `The amount can have at most 2 decimals`, `Select at least one beneficiary`, `Shares cannot be negative`)
- [ ] 7.2 Add the `No expenses yet` empty-state copy and helpers producing `$X remaining` and `$X over` from a signed cent difference
- [ ] 7.3 Register the Font Awesome Free icons for the empty state (receipt), edit (pen), and delete (trash) in `src/ui/icons.ts`; no other icon library
- [ ] 7.4 Write unit tests for the remaining/over label helper covering under, over, and exactly balanced

## 8. Expense form

- [ ] 8.1 Create `src/components/ExpenseForm.tsx` holding a local draft and serving both create and edit, seeded from an existing expense when editing
- [ ] 8.2 Add the concept input, the amount input (`inputMode="decimal"`), and a payer selector listing all participants
- [ ] 8.3 Add beneficiary selection listing participants in insertion order with select-all and clear-all controls
- [ ] 8.4 Add the split-mode toggle between equal and custom, preserving entered amounts when switching back to custom where practical
- [ ] 8.5 In custom mode, render a per-beneficiary amount input and a live indicator showing `$X remaining` or `$X over`, computed on each render and never stored
- [ ] 8.6 Disable saving while the split is unbalanced or any validation fails, and show the relevant English error on submit
- [ ] 8.7 Apply mobile-first Tailwind styling verified at 360px, with the difference indicator visible next to the save action

## 9. Expenses tab

- [ ] 9.1 Create `src/components/ExpensesTab.tsx` rendering the expense list with concept, amount, and payer per row
- [ ] 9.2 Show the group total above the list using `formatCents`
- [ ] 9.3 Render the `No expenses yet` empty state with the receipt icon when there are no expenses
- [ ] 9.4 Add edit and delete actions per row, wiring edit to `ExpenseForm` in edit mode
- [ ] 9.5 Replace the Expenses tab placeholder in `src/App.tsx` with `ExpensesTab`
- [ ] 9.6 Write component tests: empty state shown and then replaced by the first expense, group total sums correctly and updates after deletion, amounts rendered as `$250.00`
- [ ] 9.7 Write component tests for the form: valid create, validation errors surfaced, equal split producing `$83.34 / $83.33 / $83.33`, custom split blocked with `$10.00 remaining` and with `$10.00 over`, and the indicator clearing when balanced
- [ ] 9.8 Write component tests for edit and delete: amount edit recomputes shares, invalid edit leaves the expense unchanged, deletion removes the row

## 10. Verification

- [ ] 10.1 Run the full Vitest suite and confirm every scenario in `specs/expense-tracking/spec.md` maps to at least one passing test
- [ ] 10.2 Confirm `src/domain` still imports nothing from React, Zustand, or browser APIs
- [ ] 10.3 Confirm no derived values (totals, split difference, beneficiary lists) are stored in the Zustand store
- [ ] 10.4 Grep the codebase to confirm no money path multiplies or divides by 100 in floating point
- [ ] 10.5 Run `npx tsc -b`, `npm run build`, and verify the Expenses tab in `npm run preview` under the configured `base` path
- [ ] 10.6 Run `openspec verify --change add-expense-tracking` (or `/opsx:verify`) and resolve any findings
