## Context

`add-group-management` established the participant roster, the pure `/src/domain` layer, the persisted Zustand store, and the tab shell. It also introduced a deliberately minimal `Expense` type (`id`, `payerId`, `beneficiaryIds`) with an always-empty `expenses` array, purely so the "cannot remove a participant with expenses" rule could be implemented for real.

This change fills that placeholder in. Expenses are the input to every later calculation, so the shape chosen here — particularly how a split is represented — determines how simple settlement can be.

Constraints carried over:
- Money is integer cents; no floating-point arithmetic on money anywhere.
- Business logic stays pure in `/src/domain`, free of React, Zustand, and browser APIs.
- The store holds state and calls domain functions; derived values are computed, never stored.
- `localStorage` via `persist` with a versioned key; invalid or unknown-version data is discarded rather than crashing.
- English UI copy, MXN/`es-MX` amount formatting, mobile-first from 360px, Font Awesome Free icons only.

## Goals / Non-Goals

**Goals:**
- Define an expense shape that records the split result, not just the split intent.
- Provide pure, exhaustively tested equal-split allocation with deterministic remainder distribution in participant order.
- Provide custom-split validation with an exact-sum requirement and a live difference indicator.
- Support create, edit, and delete with identical validation on create and edit.
- Show the list with a group total and a `No expenses yet` empty state.
- Persist expenses under the existing versioned key, bumping the version because the shape changes.

**Non-Goals:**
- Balances and settlement transfers (the next change consumes `shares`).
- Percentage or share-weighted splits, multiple payers, or per-expense currencies.
- Categories, dates, notes, attachments, or search and filtering.
- Undo, edit history, or any form of conflict resolution.

## Decisions

### An expense stores its resolved `shares`, not just a split mode
`Expense = { id, concept, amountCents, payerId, splitMode: 'equal' | 'custom', shares: Share[] }` where `Share = { participantId, amountCents }`. `beneficiaryIds` is derived from `shares`.

*Why:* the split result is the only thing balances actually need. Storing resolved shares makes settlement a trivial sum, keeps historical expenses stable if remainder rules ever change, and means the invariant "shares sum to the amount" can be checked at one boundary. `splitMode` is retained so the edit form can reopen in the mode the user chose.

*Alternative considered:* store only `splitMode` and `beneficiaryIds` and recompute equal splits at read time. Rejected because it forces every consumer to re-derive allocation, and custom splits need stored amounts anyway — two representations for one concept.

*Trade-off:* `shares` is redundant with `amountCents` under equal mode and can drift if written carelessly. Mitigated by having a single `buildShares()` entry point that all create and edit paths call, plus a validator asserting the sum.

### Remainder distribution keys off participant order, not beneficiary order
`splitEqually(amountCents, beneficiaryIds, participants)` sorts beneficiaries by their index in the group's participant array before handing out leftover cents.

*Why:* the spec requires `$250.00` among `Ana`, `Luis`, `Carla` to yield `83.34 / 83.33 / 83.33` regardless of the order the user clicked the checkboxes. Participant insertion order is the project's documented canonical tie-breaker, so reusing it keeps allocation reproducible and consistent with future settlement tie-breaking.

*Alternative considered:* distributing by selection order — simpler, but makes the same expense produce different allocations depending on UI interaction order, which is untestable in any stable way.

Algorithm: `base = Math.floor(amount / n)`, `remainder = amount % n`, then the first `remainder` beneficiaries in participant order get `base + 1`. All integer arithmetic; the sum is `base * n + remainder === amount` by construction.

### Amount parsing is a domain concern, and the parser is strict
`parseAmountToCents(raw: string): Result<number>` accepts an optional-decimal decimal string, rejects more than 2 decimal places, rejects non-positive values, and returns integer cents computed by string manipulation rather than `Math.round(value * 100)`.

*Why:* `Math.round(10.075 * 100)` is the classic floating-point trap the project rule exists to prevent. Parsing the integer and fractional halves separately and padding the fraction to two digits keeps money exact from the very first moment user input enters the system.

*Why in the domain:* "at most 2 decimals, greater than zero" is a business rule, not presentation. The UI passes the raw string straight through.

### Custom split difference is computed, never stored
The form derives `differenceCents = sum(shares) - amountCents` on every render and renders `$X remaining` when negative, `$X over` when positive, and nothing at zero. The save button is disabled unless the difference is zero and every share is non-negative.

*Why:* the project rule forbids storing derived values, and a stored difference would desynchronize on every keystroke. Recomputation is trivially cheap for event-sized beneficiary lists.

### Validation mirrors `group-management`: result objects and error codes
`validateExpense(draft, participants)` returns `{ ok: true; value: Expense } | { ok: false; error: ExpenseError }`, with `ExpenseError` extending the existing code-union pattern and a UI-layer map supplying English copy.

*Why:* consistency with the existing domain, exhaustive testability, and no presentation strings in `/src/domain`. Create and edit share the same validator, so the spec's "invalid edits are rejected" requirement is satisfied by construction rather than by a parallel code path.

### Storage version bumps to 2 and old data is discarded
The persisted shape changes (`expenses` becomes non-trivial and is now persisted), so `version` goes to `2`. `migrate` continues to return empty state for any unrecognized version, and `parseGroupState` extends to validate expenses — including that every `payerId` and share `participantId` refers to an existing participant and that shares sum to the amount.

*Why:* referential integrity has to hold at the rehydration boundary, otherwise the Expenses tab can render against participants that no longer exist. Discarding rather than repairing keeps a single, testable failure mode.

*Trade-off:* users of the pre-release v1 build lose their group. Acceptable pre-launch and explicit rather than silent.

### The expense form is a controlled draft, committed only on submit
`ExpenseForm` keeps a local draft (`concept`, `amount` string, `payerId`, per-beneficiary selection and custom amounts) and calls the store only on a valid submit. The same component serves create and edit, seeded from an existing expense when editing.

*Why:* live-writing to the store would mean invalid intermediate states in persisted data and would make the "invalid edits leave the original unchanged" requirement hard to honor. One component for both modes keeps validation and split behavior identical without duplication.

## Risks / Trade-offs

- **`shares` drifting out of sync with `amountCents`** → All writes go through one `buildShares()` path, `validateExpense` asserts the sum, and `parseGroupState` re-checks it on rehydration; a property test asserts the sum invariant across many random amounts and beneficiary counts.
- **Floating-point creeping in through amount input** → Parsing is string-based and `parseAmountToCents` is unit-tested against known traps such as `10.075` and `0.1 + 0.2`; `formatCents` already formats integer and fraction parts separately.
- **Editing an expense after a beneficiary was removed from the group** → Participant removal is already blocked while an expense references someone, so this state is unreachable through the UI; `parseGroupState` still validates referential integrity as a backstop against hand-edited storage.
- **Custom split with many beneficiaries is cramped at 360px** → The share inputs use a single-column stacked layout with the difference indicator pinned above the save button so it is visible without scrolling past the list.
- **Version bump silently wipes existing local data** → Intentional and consistent with the established rule; it is called out here so the next shape change adds a real `migrate` branch instead of another bump.
- **Deleting an expense can invalidate the current tab gate indirectly** → It cannot: deletion never reduces participant count, and the group-validity gate depends only on participants. Noted so it is not re-litigated during implementation.
