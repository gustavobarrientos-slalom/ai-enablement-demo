## 1. Project scaffolding

- [x] 1.1 Scaffold the Vite + React + TypeScript app at the repo root (`package.json`, `tsconfig*.json`, `vite.config.ts`, `index.html`, `src/main.tsx`)
- [x] 1.2 Set Vite `base` to the repository name so GitHub Pages resolves assets correctly
- [x] 1.3 Install and configure Tailwind CSS (config, `src/index.css` directives) with a mobile-first baseline that works at 360px
- [x] 1.4 Install Zustand, `@fortawesome/react-fontawesome`, `@fortawesome/fontawesome-svg-core`, and `@fortawesome/free-solid-svg-icons`
- [x] 1.5 Install and configure Vitest with `jsdom`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and a `src/test/setup.ts`
- [x] 1.6 Add `dev`, `build`, `preview`, `test`, and `test:run` scripts to `package.json` and verify `npm run build` and `npm test` both succeed
- [x] 1.7 Set `<html lang="es">` and the document title in `index.html`

## 2. Domain types and helpers

- [x] 2.1 Create `src/domain/types.ts` with `Participant` (`id`, `name`), `Expense` (`id`, `payerId`, `beneficiaryIds`), `GroupState` (`eventName`, `participants`), and the `GroupError` code union
- [x] 2.2 Create `src/lib/ids.ts` with a `createId()` helper using `crypto.randomUUID()` and a `Math.random` fallback for non-secure contexts, kept outside `src/domain` so the domain stays free of browser APIs
- [x] 2.3 Add `normalizeName(raw)` (trim) and `namesMatch(a, b)` (trim + `toLocaleLowerCase('en')`) to `src/domain/group.ts`
- [x] 2.4 Write unit tests for `normalizeName` and `namesMatch` covering trimming, case-insensitive equality, and accent sensitivity

## 3. Domain rules: event name

- [x] 3.1 Add `DEFAULT_EVENT_NAME = 'New Event'` and `validateEventName(raw)` returning `{ ok: true, value }` or `{ ok: false, error }` with `EMPTY_NAME` / `NAME_TOO_LONG`, enforcing 1–60 chars after trimming
- [x] 3.2 Write unit tests for `validateEventName`: valid name, trimmed name, empty/whitespace rejection, 60-char boundary accepted, 61-char rejection

## 4. Domain rules: participants

- [x] 4.1 Add `validateParticipantName(raw, participants)` enforcing 1–30 chars after trimming and case-insensitive uniqueness, returning `EMPTY_NAME` / `NAME_TOO_LONG` / `DUPLICATE_NAME`
- [x] 4.2 Add pure `addParticipant(participants, raw, id)` that appends at the end, preserving insertion order, and returns a result or error
- [x] 4.3 Add pure `removeParticipant(participants, id)` that preserves the relative order of remaining participants
- [x] 4.4 Add `isGroupValid(participants)` returning `participants.length >= 2`
- [x] 4.5 Add `isParticipantReferenced(participantId, expenses)` and `canRemoveParticipant(participantId, expenses)` checking both `payerId` and `beneficiaryIds`
- [x] 4.6 Write unit tests for participant validation: valid add, trimming, empty rejection, 30/31-char boundaries, case-insensitive duplicate rejection
- [x] 4.7 Write unit tests for ordering: insertion order preserved, removal preserves remaining order, re-added participant goes to the end
- [x] 4.8 Write unit tests for `isGroupValid` at 0, 1, and 2 participants
- [x] 4.9 Write unit tests for `canRemoveParticipant`: unreferenced participant removable, payer blocked, beneficiary blocked, and list unchanged when removal is blocked

## 5. Persistence guard

- [x] 5.1 Add `parseGroupState(unknownValue)` in `src/domain/group.ts` validating the persisted shape and returning the parsed state or `null`
- [x] 5.2 Add `createEmptyGroupState()` returning `{ eventName: DEFAULT_EVENT_NAME, participants: [] }`
- [x] 5.3 Write unit tests for `parseGroupState`: valid payload parses, malformed payloads (wrong types, missing fields, non-array participants, duplicate ids) return `null`

## 6. Zustand store

- [x] 6.1 Create `src/store/useAppStore.ts` holding `eventName`, `participants`, and `expenses: []`, with actions `setEventName`, `addParticipant`, `removeParticipant`, all delegating to domain functions
- [x] 6.2 Store the last validation error code in state (e.g. `lastError`) and clear it on the next successful action, so the UI can render English messages
- [x] 6.3 Wrap the store in `persist` with storage key `split:v1` and `version: 1`, persisting only `eventName` and `participants`
- [x] 6.4 Implement `merge`/`migrate` so invalid payloads or unknown versions fall back to `createEmptyGroupState()` instead of throwing
- [x] 6.5 Add selectors `selectIsGroupValid` and `selectCanRemoveParticipant` that compute derived values without storing them
- [x] 6.6 Write store tests: add/remove participants, rename event, rejected actions leave state unchanged and set the expected error code
- [x] 6.7 Write persistence tests with a fake `localStorage`: state restored on reload, order survives rehydration, corrupt JSON discarded, unknown version discarded — no crash in either case

## 7. English copy and formatting

- [x] 7.1 Create `src/ui/messages.ts` mapping each `GroupError` code to its English message (`The event name is required`, `The event name must be at most 60 characters`, `The name is required`, `The name must be at most 30 characters`, `A participant with that name already exists`, `Has associated expenses`)
- [x] 7.2 Create `src/ui/currency.ts` with an MXN `Intl.NumberFormat('es-MX')` formatter that takes integer cents, plus unit tests
- [x] 7.3 Register the Font Awesome Free solid icons used by this screen (user-plus, trash, users) in one place; no other icon library

## 8. Tab shell

- [x] 8.1 Create `src/components/TabBar.tsx` rendering the Grupo, Gastos, and Liquidación tabs with `disabled` and `aria-disabled` support and accessible tab semantics
- [x] 8.2 Create `src/App.tsx` owning `activeTab` in local state, deriving Gastos/Liquidación disabled state from `selectIsGroupValid`
- [x] 8.3 Ignore clicks on disabled tabs, and force `activeTab` back to `grupo` if the active tab becomes disabled
- [x] 8.4 Write component tests: disabled tabs at 0 and 1 participants, tabs enabled at 2, tabs disabled again after a removal, clicking a disabled Gastos tab keeps Grupo active

## 9. Group screen

- [x] 9.1 Create `src/components/GroupTab.tsx` with an event-name field defaulting to `New Event` that commits on blur/submit and shows validation errors
- [x] 9.2 Add the participant form (text input + add button with a Font Awesome icon) that clears on success and shows the English error on failure
- [x] 9.3 Render the participant list in insertion order, each row with a remove button
- [x] 9.4 Disable the remove button for referenced participants and expose `Has associated expenses` via title/`aria-label` and visible helper text
- [x] 9.5 Show the hint `Add at least 2 participants to continue` while the group is invalid
- [x] 9.6 Apply mobile-first Tailwind styling verified at 360px width with adequate tap targets
- [x] 9.7 Write component tests: default event name rendered, valid add, trimmed add, empty/too-long/duplicate errors, order preserved in the DOM, remove works for unreferenced participant, remove disabled with `Has associated expenses` for a payer and for a beneficiary

## 10. Deployment

- [x] 10.1 Add `.github/workflows/deploy.yml` building the app and deploying to GitHub Pages via `actions/deploy-pages` on pushes to the default branch
- [x] 10.2 Add a CI step (or separate workflow) running type-check and `npm run test:run` before deploy
- [x] 10.3 Verify the production build locally with `npm run preview` and confirm the tab shell works under the configured `base` path

## 11. Verification

- [x] 11.1 Run the full Vitest suite and confirm every spec scenario in `specs/group-management/spec.md` maps to at least one passing test
- [x] 11.2 Confirm `src/domain` imports nothing from React, Zustand, or browser APIs
- [x] 11.3 Confirm no derived values (group validity, removability) are stored in the Zustand store
- [x] 11.4 Run `openspec verify --change add-group-management` (or `/opsx:verify`) and resolve any findings
