## Why

The group can record who paid for what, but the app still cannot answer the
question it exists to answer: who pays whom so everyone ends up even. Today a
user has to work that out on paper. The Settlement tab closes the loop from
expenses to a concrete, short list of transfers.

## What Changes

- Derive a per participant balance from the recorded expenses: `paid`,
  `consumed`, and `net = paid - consumed`, all in integer cents.
- Assert the invariant that the nets sum to exactly `$0.00`. If they do not,
  the data is inconsistent and the screen shows an error state instead of
  transfers that cannot be trusted.
- Compute a transfer plan with a greedy algorithm: repeatedly match the largest
  debtor with the largest creditor, settle the smaller of the two absolute
  amounts, and drop whoever reaches zero. Ties broken by participant insertion
  order so the result is deterministic.
- Render the plan as directional transfers such as `Diana -> Ana $420.00`,
  producing at most `N-1` transfers for `N` participants.
- Show `Everyone is settled up` when every net is zero, including the case
  where there are no expenses at all.
- Recalculate balances and transfers on any change to participants or
  expenses. Nothing about the settlement is stored.
- Replace the placeholder content currently rendered in the Settlement tab.

Explicitly out of scope: this change does **not** claim to produce the globally
minimal number of transfers. The greedy plan is short and bounded by `N-1`, but
minimizing transfer count is NP-hard, and the UI must not promise optimality.

## Capabilities

### New Capabilities
- `settlement`: computing per participant balances from expenses, enforcing the
  zero-sum invariant, and deriving a bounded, deterministic set of transfers
  that settles the group.

### Modified Capabilities
<!-- None. Balances are derived by reading existing group and expense state;
     neither the group-management nor the expense-tracking requirements change. -->

## Impact

- **New domain modules**: `src/domain/balance.ts` (paid, consumed, net) and
  `src/domain/settle.ts` (greedy transfer plan). Both pure, no React, no
  Zustand, no browser APIs, consistent with the existing domain layer.
- **Store**: new derived selectors only. No new persisted state and no schema
  change, so the storage version stays at `2` and existing saved data keeps
  working.
- **UI**: new `SettlementTab` component wired into `App.tsx` in place of the
  current placeholder; new copy in `src/ui/messages.ts`; one additional Font
  Awesome Free icon for the settled state.
- **Consumes**: the `shares` already stored on each expense, and participant
  insertion order as the canonical tie-break, both established by the archived
  `expense-tracking` and `group-management` capabilities.
- No new dependencies.
