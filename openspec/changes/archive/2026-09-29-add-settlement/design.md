## Context

The group and expense capabilities are complete and archived. Every expense
already stores its resolved `shares` as integer cents, and those shares are
guaranteed to sum exactly to the expense amount, both by `validateExpense` on
write and by `parseGroupState` on rehydration. Participants carry a stable
insertion order that the codebase already treats as the canonical tie-break,
used today to allocate leftover cents in an equal split.

Settlement therefore needs no new stored data. It is a pure function of state
that already exists. The constraints that shape this design are the project's
standing rules: money stays in integer cents with no floating-point
arithmetic, business logic lives in a pure `src/domain` module with no React,
Zustand or browser APIs, and derived values are computed rather than stored.

## Goals / Non-Goals

**Goals:**
- Compute `paid`, `consumed` and `net` per participant in integer cents.
- Turn those nets into a short, deterministic, directional list of transfers.
- Fail loudly and visibly if the nets do not sum to zero.
- Reproduce the golden scenario exactly, as an executable acceptance test.

**Non-Goals:**
- Minimizing the number of transfers. See the first decision below.
- Any notion of currency other than MXN, or of a participant paying in
  instalments, or of marking a transfer as completed. The screen reports; it
  does not track fulfilment.
- Persisting anything. No storage version change.

## Decisions

### Greedy matching, and an explicit refusal to claim minimality

Reducing the number of transfers to the true minimum is the partition problem
in disguise and is NP-hard: the optimal plan requires finding subsets of
participants whose nets cancel exactly, and the number of subsets grows
exponentially. A greedy largest-debtor / largest-creditor match runs in
`O(N^2)` with a trivially provable bound of `N-1` transfers, because every
iteration zeroes at least one participant and the last two are always zeroed
together.

Greedy is not always optimal. With nets `+30, +20, -30, -20` the optimal plan
is two transfers and greedy also finds two; but with nets like `+50, -30, -20`
greedy produces two transfers where two is also optimal, and there exist
configurations where an exact subset match would do better than greedy. Rather
than pretend otherwise, the spec forbids the UI from claiming the result is
minimal. This is why the requirement is named "bounded but not minimal": the
honest guarantee is the `N-1` bound, and that is what we state.

Alternative considered: exhaustive search over subsets for small `N`. Rejected
because the group size is unbounded in principle, the payoff is a transfer or
two in rare cases, and the added complexity would be hard to test against a
clear contract.

### Determinism through participant order

Both the debtor and the creditor selection break ties by participant insertion
order. Without this, two runs over the same data could emit different but
equally valid plans, which makes the golden scenario untestable and makes the
UI flicker between renders. Insertion order is already the project's canonical
tie-break for remainder cents, so reusing it keeps one rule rather than two.

Concretely: among debtors pick the most negative net, and among equals the
earliest participant; among creditors pick the most positive net, and among
equals the earliest participant.

### Integer cents throughout, so the zero-sum invariant is exact

Because shares are integers that sum exactly to each expense amount, the sum
of all nets is exactly zero as a matter of integer arithmetic, not
approximately zero within a tolerance. This is worth stating because the
naive floating-point version of this screen would need an epsilon comparison
and would occasionally show a stray cent. There is no epsilon here: the check
is `sum === 0`.

The greedy loop preserves this. Each step subtracts the same integer from a
debt and a credit, so the running total stays zero and every participant
converges on exactly zero rather than on a residual fraction.

### The zero-sum check is a real error state, not an assertion

If the nets do not sum to zero, something upstream is wrong: state was
corrupted, or a future change broke the share invariant. Throwing would blank
the app; silently proceeding would show a transfer plan that does not settle
anything. So the domain returns a discriminated result and the tab renders an
error state. This mirrors how the rest of the domain reports failure and keeps
the screen honest about not trusting its own inputs.

### Two modules, split by concern

`balance.ts` answers "where does everyone stand" and `settle.ts` answers "what
should happen next". Keeping them apart means the balance table can be tested
and rendered even when the transfer plan is in an error state, and it matches
the existing one-concern-per-module shape of `money.ts`, `split.ts` and
`expense.ts`.

### Selectors must not return fresh objects

The store already has a scar here: a selector that built a new function on
every call broke `useSyncExternalStore` with an infinite render loop, which is
why `GroupTab` reads raw state and calls the domain directly. Settlement
computes arrays and objects, so it will do the same: the component selects
`participants` and `expenses`, then calls the domain functions during render,
memoizing with `useMemo` where the input identities allow it. No selector will
return a newly constructed balance list.

## Risks / Trade-offs

- **A user assumes the plan is the fewest possible transfers** → the spec
  forbids optimality language in the UI, and the copy frames the list as "a
  way to settle up". The `N-1` bound is the only promise made.
- **Greedy emits a slightly longer plan than an exact solver would** →
  accepted deliberately; the bound keeps it short and the behaviour is
  deterministic and explainable, which matters more here than a rare saving of
  one transfer.
- **The error state is unreachable in normal operation, so it rots untested** →
  it is covered by a dedicated test that feeds the domain deliberately
  inconsistent input, bypassing the store, so the branch stays exercised.
- **Recomputing on every render for a large group** → the algorithm is
  `O(N^2)` on a group that realistically numbers in the tens, and the
  alternative is caching derived state, which the project explicitly forbids.
  Not a real risk at this scale.

## Migration Plan

None required. No persisted shape changes, so the storage version stays at
`2` and existing saved groups continue to load. The change is additive: two
new domain modules, new derived selectors, and one component replacing the
existing Settlement tab placeholder. Rollback is reverting the commit.

## Open Questions

- Should the balance table show `paid` and `consumed` alongside `net`, or only
  `net` with the detail behind a disclosure? Proceeding with all three visible,
  since the spec requires all three to be computed and showing the inputs makes
  the net auditable by the user. Easy to collapse later if the 360px layout
  proves too tight.
