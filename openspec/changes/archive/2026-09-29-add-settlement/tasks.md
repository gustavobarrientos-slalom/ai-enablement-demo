## 1. Types

- [x] 1.1 Add a `Balance` type to `src/domain/types.ts` with `participantId`, `paidCents`, `consumedCents` and `netCents`, all integers.
- [x] 1.2 Add a `Transfer` type with `fromId`, `toId` and `amountCents`.
- [x] 1.3 Add a `SettlementError` type with the single code `NETS_DO_NOT_SUM`, and include it in the `AppError` union.

## 2. Balances

- [x] 2.1 Create `src/domain/balance.ts` with `computeBalances(participants, expenses): Balance[]` returning one entry per participant in participant order.
- [x] 2.2 Sum `paidCents` from expenses where the participant is the payer.
- [x] 2.3 Sum `consumedCents` from the participant's shares across all expenses.
- [x] 2.4 Derive `netCents` as `paidCents - consumedCents` using integer arithmetic only.
- [x] 2.5 Add `netsSum(balances): number` and `areNetsBalanced(balances): boolean` checking for exactly `0`, with no epsilon tolerance.
- [x] 2.6 Create `src/domain/balance.test.ts` covering payer who is not a beneficiary, participant with no activity, participant order preservation, and the zero-sum invariant across several expense sets.

## 3. Transfer plan

- [x] 3.1 Create `src/domain/settle.ts` with `computeTransfers(balances): Result<Transfer[], SettlementError>`.
- [x] 3.2 Return `err('NETS_DO_NOT_SUM')` when the nets do not sum to exactly zero, before attempting any matching.
- [x] 3.3 Implement the greedy loop: pick the largest absolute debtor and the largest creditor, transfer the smaller absolute amount, and drop any participant reaching zero.
- [x] 3.4 Break ties in both the debtor and the creditor selection by participant insertion order, using the order of the incoming `balances` array.
- [x] 3.5 Return an empty transfer list when every net is already zero.
- [x] 3.6 Create `src/domain/settle.test.ts` covering the single debtor/creditor case, one debtor split across two creditors, tie-breaking by participant order, and the empty plan when all nets are zero.
- [x] 3.7 Add tests asserting every emitted transfer amount is strictly positive and that applying the whole plan drives every net to exactly zero.
- [x] 3.8 Add a test asserting the plan never exceeds `N-1` transfers across several generated balance sets.
- [x] 3.9 Add a test for the error path, feeding deliberately inconsistent balances whose nets do not sum to zero.

## 4. Golden scenario

- [x] 4.1 Add a `src/domain/settlement.golden.test.ts` that builds the reference case from the spec: participants `Ana`, `Luis`, `Carla`, `Beto`, `Diana` in that order.
- [x] 4.2 Build the four reference expenses through `validateExpense` so the test exercises the real split logic rather than hand-written shares.
- [x] 4.3 Assert the nets are exactly `Ana +69665`, `Luis -5333`, `Carla +19667`, `Beto -41999`, `Diana -42000` cents and sum to zero.
- [x] 4.4 Assert the `Dessert` remainder puts 2001 cents on `Ana` and 2000 on each of the other four.
- [x] 4.5 Assert the transfer plan is exactly `Diana -> Ana 42000`, `Beto -> Ana 27665`, `Beto -> Carla 14334`, `Luis -> Carla 5333`, in that order.
- [x] 4.6 Assert the plan has exactly 4 transfers, matching the `N-1` bound for 5 participants.

## 5. Store

- [x] 5.1 Add `selectBalances` and `selectTransfers` derived selectors to `src/store/useAppStore.ts` without persisting anything.
- [x] 5.2 Confirm `partialize` is unchanged and the storage version stays at `2`.
- [x] 5.3 Ensure no selector returns a freshly constructed function, per the `useSyncExternalStore` problem recorded in the design.
- [x] 5.4 Add store tests asserting balances and transfers update after adding, editing and deleting an expense.
- [x] 5.5 Add a store test asserting no settlement value appears in the persisted payload.

## 6. Copy and icons

- [x] 6.1 Add `Everyone is settled up` and `Balances do not add up` to `src/ui/messages.ts`.
- [x] 6.2 Add copy for the balance table headings `Paid`, `Consumed` and `Net`, and a message for the settled state.
- [x] 6.3 Map the `NETS_DO_NOT_SUM` error code to its message in `ERROR_MESSAGES`.
- [x] 6.4 Register one additional Font Awesome Free icon for the settled state and verify no other icon library is introduced.
- [x] 6.5 Add a helper that formats a transfer as `Diana -> Ana $420.00` and cover it with tests, including a negative-free assertion.

## 7. Settlement tab

- [x] 7.1 Create `src/components/SettlementTab.tsx` reading `participants` and `expenses` from the store and computing balances and transfers during render.
- [x] 7.2 Render the per participant balance table showing paid, consumed and net, in participant order, with negative nets visually distinguished.
- [x] 7.3 Render the transfer list when the plan is non-empty.
- [x] 7.4 Render `Everyone is settled up` when every net is zero.
- [x] 7.5 Render the error state and suppress the transfer list when the nets do not sum to zero.
- [x] 7.6 Ensure the layout works at 360px without horizontal scrolling.
- [x] 7.7 Replace the Settlement placeholder in `src/App.tsx` with `SettlementTab`.

## 8. Component tests

- [x] 8.1 Test the settled-up state renders with participants but no expenses.
- [x] 8.2 Test the balance table lists participants in insertion order with correct formatted amounts.
- [x] 8.3 Test the transfer list renders the golden scenario transfers in order.
- [x] 8.4 Test the settlement updates after adding an expense and after deleting the last expense.
- [x] 8.5 Test that the Settlement tab stays disabled while the group has fewer than two participants.

## 9. Verification

- [x] 9.1 Run the full test suite and confirm every requirement in the spec maps to at least one passing test.
- [x] 9.2 Verify `src/domain` still imports no React, Zustand or browser APIs.
- [x] 9.3 Grep the settlement code paths for floating-point money operations and confirm there are none.
- [x] 9.4 Confirm no balance or transfer value is written to `localStorage`.
- [x] 9.5 Confirm no UI copy claims the transfer count is minimal.
- [x] 9.6 Run `tsc -b`, `npm run build`, and preview the built app at the configured base path.
- [x] 9.7 Run `openspec validate add-settlement` and confirm the change is valid.
