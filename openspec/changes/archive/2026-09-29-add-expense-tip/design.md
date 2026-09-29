## Context

The expense model was built on an invariant that is about to become false:
`Expense.amountCents` is simultaneously "what the user typed" and "the total
that the shares sum to". Two places depend on that second meaning:

- `isExpenseConsistent` asserts `sharesTotal(shares) === amountCents`.
- `computeBalances` credits the payer `expense.amountCents`, while charging each
  beneficiary the sum of their shares.

The zero-sum invariant that the whole settlement capability rests on holds today
only because those two numbers are the same. A tip separates them. If the tip is
folded into the shares but `paid` keeps reading `amountCents`, every tipped
expense injects a phantom deficit exactly equal to the tip, the nets stop summing
to zero, and the Settlement tab drops into its error state. This change is
therefore less about adding a field than about carefully relocating the
definition of "total".

Constraints carried in from the project: money is integer cents, no
floating-point arithmetic on money, the domain stays pure, and derived values
are never persisted.

## Goals / Non-Goals

**Goals:**

- Record an optional tip per expense, as an integer percentage or a fixed amount.
- Distribute the tip across beneficiaries in proportion to what each consumed,
  reusing the existing leftover-cent discipline.
- Establish exactly one definition of an expense total and route every caller
  through it.
- Preserve the zero-sum invariant for any mix of tipped and untipped expenses.
- Keep expenses saved before tips existed loadable.

**Non-Goals:**

- Tip presets or a "round up the total" helper.
- Per-beneficiary tip overrides. The tip follows consumption; a user who wants a
  bespoke division can express it with a custom split.
- Taxes, service charges, or any second surcharge. The design keeps a single
  named surcharge rather than a general list.
- Changing the transfer algorithm. It consumes nets and is indifferent to where
  they came from.

## Decisions

### Store the tip, derive the total

`Expense` gains `tip: Tip | null`, modelled as a discriminated union:

```ts
type Tip =
  | { kind: 'percent'; percent: number; amountCents: number }
  | { kind: 'fixed'; amountCents: number };
```

The resolved `amountCents` is stored even for the percentage form. The
percentage is retained so the form can be reopened showing `10%` rather than a
back-computed figure, and so the intent survives an edit of the base amount.
Storing the resolved cents alongside it means every consumer reads a number and
never re-derives one, which keeps the floor rule from being applied twice.

`amountCents` on the expense keeps its original meaning: the base amount the
user typed. A new `expenseTotalCents(expense)` becomes the single definition of
the total. Callers that meant "the total" move to it:

| Call site | Before | After |
| --- | --- | --- |
| `balance.ts` `paid` | `expense.amountCents` | `expenseTotalCents(expense)` |
| `balance.ts` `consumed` | `expense.shares` | `expenseShares(expense)` |
| `expense.ts` `expensesTotal` | sum of `amountCents` | sum of `expenseTotalCents` |
| `expense.ts` `isExpenseConsistent` | `=== amountCents` | `=== expenseTotalCents` |
| `ExpensesTab` row | `amountCents` | `expenseTotalCents` plus a tip line |

`draftFromExpense` deliberately keeps reading `amountCents`, because the form
edits the base amount and the tip separately.

*Alternative rejected:* folding the tip into `amountCents` at save time. It
requires touching nothing downstream, which is exactly why it is tempting, but
the tip becomes unrecoverable — the expense can no longer be edited without the
user retyping it, and the list can never show what the tip was.

### Store base shares, derive tip-inclusive shares

`Expense.shares` keeps its existing meaning — the split of the **base amount**,
summing to `amountCents`. The tip is **not** baked into stored shares. A new
`expenseShares(expense)` adds each beneficiary's tip part on read, and that
derived list is what `consumed` and the UI use.

This was discovered during implementation, after an earlier draft of this design
said to store tip-inclusive shares. That approach makes a tipped custom split
impossible to edit: `draftFromExpense` rebuilds `customAmounts` from `shares`,
so reopening `Drinks 600.00` split `300/200/100` with a 10% tip yields
`330/220/110`, which no longer sums to the `600.00` base amount, and re-saving
fails with `SHARES_DO_NOT_SUM`. The base shares cannot be recovered from
tip-inclusive ones, because the tip distribution is weighted *by* the base
shares, so inverting it is ambiguous.

Storing the base and deriving the rest also matches the project rule that
derived values are computed rather than stored, and leaves the existing
`sharesTotal(shares) === amountCents` invariant intact for the base split. The
spec is unaffected: scenarios describe what each participant *consumes*, not how
the split is represented, and `36.68 / 36.66 / 36.66` summing to `$110.00`
remains true as the derived result.

### Proportional distribution by consumption, not by head

The tip part for a beneficiary is proportional to that beneficiary's base share:

```
part_i = floor(tip * base_i / baseTotal)
```

then the `tip - sum(parts)` leftover cents go one each, ordered by the largest
fractional remainder and tie-broken by participant insertion order. This is the
largest-remainder method, and it is the same discipline `splitEqually` already
uses — the existing rule hands leftovers out in participant order, and here the
remainder ranking comes first with participant order as the tie-break.

Using `base_i` as the weight is what makes the rule behave correctly for custom
splits: `Drinks` split `300/200/100` distributes a `10%` tip as `3000/2000/1000`,
which is the entire point of the feature. For an equal split it degenerates to an
equal division of the tip, matching intuition.

*Alternative rejected:* splitting the tip equally among beneficiaries regardless
of consumption. Simpler, and identical for equal splits, but it reintroduces the
unfairness that motivated the change.

The implementation computes `tip * base_i` as an integer product and takes the
quotient and remainder with `Math.floor` and `%`, so no floating-point value
ever touches money. `tip * base_i` is bounded well inside `Number.MAX_SAFE_INTEGER`
for any realistic event.

### Integer percentages, floored

Percentages are whole numbers from 0 to 100, and conversion to cents is
`Math.floor(amountCents * percent / 100)`. Floor guarantees the recorded tip
never exceeds what the user asked for. Restricting to integers avoids a second
decimal-parsing path with its own rounding questions; `12.5%` is expressible as
a fixed amount. Both were confirmed with the requester.

### Version 3 with a real migration

`STORAGE_VERSION` goes to 3. The current `migrate` discards unconditionally,
which is the right default for an *unknown* version but wrong for a known
predecessor whose shape differs only by an absent optional field. The new
`migrate` handles `version === 2` by passing the state through with expenses
defaulting to `tip: null`, and keeps discarding everything else.

The persisted-shape guard in `group.ts` is extended to validate the tip when
present: a non-integer, negative, or malformed tip makes the whole payload
untrusted and triggers the existing discard path, rather than loading an expense
whose shares cannot sum to its total.

### Validation order

`validateExpense` parses the tip only after the amount is known to be valid,
because a percentage tip is meaningless without an amount. Tip errors get their
own codes (`NEGATIVE_TIP`, `TIP_PERCENT_OUT_OF_RANGE`, `TIP_PERCENT_NOT_INTEGER`,
`TIP_TOO_MANY_DECIMALS`) so the form can point at the tip field rather than
showing a generic failure.

## Risks / Trade-offs

- **A missed `amountCents` call site silently breaks the zero-sum invariant.**
  → This is the central risk. The audit above enumerates every non-test
  reference. The strongest mitigation is not the audit but the assertion: a test
  asserts nets sum to zero across a mixed tipped/untipped set, and the golden
  scenario pins exact figures. Either would fail loudly on a missed site.

- **`percent` and `amountCents` inside a percentage tip can disagree** if the
  expense amount is edited and the tip is not recomputed. → `validateExpense`
  always recomputes `amountCents` from `percent` on every save, so the pair is
  reconstructed rather than carried over. The stored pair is a cache of a
  validated computation, never an independently editable value.

- **Migration code is easy to write and hard to verify.** → Tests seed
  `localStorage` with a literal version-2 payload, rather than one produced by
  the current code, so the test cannot drift into passing by construction.

- **Proportional distribution is unintuitive for a zero-consumption
  beneficiary**, who receives no tip. → This is correct, follows from
  proportionality, and is pinned by a scenario so it is a documented decision
  rather than an accident.

- **The tip widens the expense form** on a 360px viewport. → The tip control is
  a compact mode selector plus a single numeric input, placed directly under the
  amount it modifies.

## Migration Plan

1. Land the domain changes with `expenseTotalCents` and move all callers.
2. Bump `STORAGE_VERSION` to 3 and add the v2 → v3 migration in the same commit,
   so no build exists that reads v2 data without knowing how to migrate it.
3. Rollback is a redeploy of the previous build. A user who saved a tipped
   expense under v3 and then rolls back to a v2 build hits the unknown-version
   path and loses local data. This is acceptable for a no-backend app with no
   accounts, and is the pre-existing behaviour for any version change.

## Open Questions

- Should the group total in the Expenses tab break out the tip portion
  separately, for example `$1,160.00 (includes $160.00 in tips)`? The spec only
  requires a tip-inclusive total plus a per-row tip. Deferred; it is additive
  copy that can follow without a spec change.
