## Context

Split has no application code yet: this change bootstraps the project shell (React + Vite + TypeScript + Tailwind, Zustand, Font Awesome Free, Vitest) and delivers the first capability, `group-management`.

The Group screen is the root of the data model. Expenses reference participants as payer and beneficiaries, and settlement derives balances from participants. Therefore participant identity and ordering decided here become a contract for every later capability.

Constraints that shape this design:
- Business logic must live in a pure `/src/domain` module with no React, Zustand, or browser dependencies.
- The store holds state and calls domain functions; derived values are never stored.
- No backend; `localStorage` via Zustand `persist` with a versioned key, discarding invalid or unknown-version data.
- Navigation is tab-based (no router) so GitHub Pages never serves a 404.
- English UI, MXN/`es-MX` formatting, mobile-first from 360px.

## Goals / Non-Goals

**Goals:**
- Define the `Participant` and group state shape that expenses and settlement will build on.
- Provide pure, unit-tested validation for event name and participant name (length, trimming, case-insensitive uniqueness).
- Express group validity (`participants.length >= 2`) as a derived, computed value that gates the Expenses and Settlement tabs.
- Guarantee stable insertion order for participants, including across persistence and rehydration.
- Prevent removal of participants referenced by any expense, surfacing `Has associated expenses`.
- Establish the tab shell, the persisted store with version guard, and the Vitest setup the rest of the app will reuse.

**Non-Goals:**
- Creating, editing, or listing expenses (only the reference check needed to block removals).
- Balance and settlement algorithms.
- Editing or renaming an existing participant.
- Multiple groups/events, sharing, import/export, or undo.
- Any backend, authentication, or cross-device sync.

## Decisions

### Participants are objects with a generated stable id
`Participant = { id: string; name: string }`, stored in an ordered array. Expenses reference participants by `id`, not by name.

*Why:* names are user-editable and only unique case-insensitively; an opaque id keeps future renames from invalidating expense references. An array (rather than a map) makes insertion order the natural, serializable source of truth, which the spec requires for tie-breaking.

*Alternatives considered:* keying by normalized name (breaks on rename, couples display text to identity); a `Map` or object keyed by id plus a separate order array (redundant state that can desynchronize).

Ids are generated with `crypto.randomUUID()` and a small fallback, and the helper lives in `src/lib/ids.ts` — outside the domain, since it touches a browser API. Ids are passed into domain functions as a parameter so the domain stays pure and deterministic under test.

### Name normalization is explicit and separate from comparison
The domain exposes `normalizeName(raw) = raw.trim()` for storage and `namesMatch(a, b)` comparing `a.trim().toLocaleLowerCase('en') === b.trim().toLocaleLowerCase('en')` for uniqueness.

*Why:* the spec stores the trimmed name as typed (preserving the user's capitalization) while rejecting duplicates case-insensitively. Keeping the two operations distinct avoids accidentally lowercasing stored display names. Using `toLocaleLowerCase('en')` keeps the comparison locale explicit and independent of the MXN currency locale.

*Trade-off:* accents are still significant, so `Sofia` and `Sofía` are treated as different participants. That is intentional — silently merging them would be more surprising than allowing both.

### Validation returns a result object, never throws
Domain validators return a discriminated union, e.g. `{ ok: true; value: string } | { ok: false; error: GroupError }`, where `GroupError` is a string union of codes (`EMPTY_NAME`, `NAME_TOO_LONG`, `DUPLICATE_NAME`, ...). A separate UI-layer map turns codes into English messages.

*Why:* keeps the domain free of presentation strings, makes every error branch trivially unit-testable, and lets the store surface errors as state instead of relying on exception handling in event handlers.

*Alternative considered:* throwing typed errors — noisier at call sites and awkward to assert exhaustively in tests.

### Group validity and removability are derived, never stored
`isGroupValid(participants)` and `canRemoveParticipant(participantId, expenses)` are pure functions called at render time (via selectors) rather than fields in the store.

*Why:* the project rule forbids storing derived values, and a stored `isValid` flag would inevitably drift from the roster after add/remove/rehydrate. The lists involved are tiny (event-sized groups), so recomputation cost is irrelevant; memoization is unnecessary.

### The expenses slice exists now, empty, to keep removal logic honest
The store includes an `expenses: Expense[]` field initialized to `[]`, and `canRemoveParticipant` scans it for `payerId` or membership in `beneficiaryIds`.

*Why:* the removal rule is a group-management requirement, but it depends on expense data. Introducing a minimal, typed, empty expenses array now lets the rule be implemented and tested for real (with fixture expenses) instead of being stubbed and revisited. The alternative — a callback the expenses feature registers later — adds indirection with no benefit at this size.

### Tab state lives in the component shell, not in the store
`App.tsx` owns `activeTab` via `useState`, and the tab bar computes `disabled` from the group-validity selector. Tab selection is not persisted.

*Why:* the active tab is ephemeral view state, not domain state, so persisting it would only add a way for a reload to land on a tab that is now disabled. Guarding at the tab-bar level (disabled buttons that ignore clicks) satisfies the spec without a router and without Pages 404s.

An effect forces `activeTab` back to `group` if the active tab becomes disabled — e.g. the user removes a participant while on Expenses — so the UI can never render a gated tab.

### Persistence uses `persist` with an explicit version and a validating `merge`
Storage key `split:v1`, `version: 1`, and a `merge`/`migrate` pair that runs the rehydrated payload through a `parseGroupState` guard in the domain. If parsing fails, or if the stored version is unknown, the initial empty state is returned instead.

*Why:* `partialize` alone would happily rehydrate malformed data written by an older build or a hand-edited devtools value, crashing the render. A single validating boundary keeps the "discard, don't crash" requirement in one testable place.

*Trade-off:* strict validation means a future shape change discards old data unless a migration is written. Acceptable pre-launch, and the version number makes the decision explicit.

### Testing strategy: domain via unit tests, store and UI via targeted tests
Vitest with `jsdom`, Testing Library, and `user-event`. Domain rules get exhaustive unit tests; the store gets tests for add/remove/persist/rehydrate including the corrupt-data path (with a fake `localStorage`); the Group screen and tab bar get component tests for the user-visible scenarios (error messages, disabled tabs, disabled remove with `Has associated expenses`).

*Why:* every spec scenario maps to at least one automated test, per project rule, while keeping the slow layer (DOM) thin and the fast layer (pure functions) thorough.

## Risks / Trade-offs

- **Accent-sensitive uniqueness confuses users** (`Sofia` vs `Sofía` coexist) → Names are shown in a list where near-duplicates are visible; a future change can add accent-folding to `namesMatch` in one place without touching the UI.
- **Introducing the `Expense` type before the expenses capability is designed** → Keep the type minimal (`id`, `payerId`, `beneficiaryIds`) and treat it as provisional; only `canRemoveParticipant` depends on it, so widening it later is additive.
- **Strict rehydration silently wipes a user's group after a shape change** → The version guard makes this deliberate rather than accidental; before any post-launch shape change, add a `migrate` branch instead of bumping blindly.
- **`crypto.randomUUID()` is unavailable in older mobile Safari and in non-secure contexts** → Id generation goes through a single helper with a `Math.random`-based fallback; collisions are irrelevant at event-sized scale.
- **Disabled tabs give no explanation** → The Group tab shows a hint (e.g. `Add at least 2 participants to continue`) so the gate never looks like a bug.
- **Tab state not persisted means reload always lands on Group** → Acceptable and arguably desirable, since Group is the setup screen and the reload path is rare.
