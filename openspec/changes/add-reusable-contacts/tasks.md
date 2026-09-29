## 1. Domain: contacts

- [x] 1.1 Add `Contact` type (`{ id: string; name: string; isMe: boolean }`) and `ContactsState` to `src/domain/types.ts`
- [x] 1.2 Create `src/domain/contact.ts` with `validateContactName`, `addContact`, `renameContact`, `removeContact`, `setMeContact`, `sortContactsByName`, reusing `namesMatch` from `src/domain/group.ts`
- [x] 1.3 Add parsing/validation helpers for persisted contacts (`parseContactsState` or equivalent) mirroring `parseGroupState`'s style
- [x] 1.4 Add `src/domain/contact.test.ts` covering validation, trimming, case-insensitive uniqueness, rename, delete, and the single-`Me` invariant

## 2. Migration and persistence

- [x] 2.1 Bump `STORAGE_VERSION` in `src/store/useAppStore.ts` and add a `PRE_CONTACTS_STORAGE_VERSION` constant for the preceding version
- [x] 2.2 Add a migration function that builds the initial `contacts` array from all events' participants (first occurrence wins, compared case-insensitively) when no `contacts` array is present
- [x] 2.3 Ensure malformed or unknown-version persisted contacts are discarded, starting from an empty contacts directory, without crashing
- [x] 2.4 Add tests for migration: seeding from existing events, deduplication, running only once, and discarding corrupted/unknown-version data

## 3. Store: contacts state and actions

- [x] 3.1 Add `contacts: Contact[]` to `AppState` and initialize it in `initialState()`
- [x] 3.2 Add store actions: `addContact(raw)`, `renameContact(id, raw)`, `removeContact(id)`, `setMeContact(id | null)`
- [x] 3.3 Add selectors: `selectContacts` (sorted alphabetically), `selectMeContact`
- [x] 3.4 Add tests in `src/store/useAppStore.test.ts` for the new actions and selectors

## 4. Store: participant addition via contacts

- [x] 4.1 Add a store action to add participants from a set of contact IDs to the active event in one call, skipping contacts whose name already matches a current participant case-insensitively
- [x] 4.2 Update (or wrap) the existing `addParticipant` action so that when the typed name matches no contact case-insensitively, it also creates a new contact with that name
- [x] 4.3 Add a selector that returns contact-name suggestions for a given prefix, excluding contacts already added as participants in the active event
- [x] 4.4 Add store tests for: adding multiple contacts as participants, excluding already-added contacts, typing a new name creating both participant and contact, and typing a name that matches an existing contact not duplicating it

## 5. Import: seed missing contacts

- [x] 5.1 Update `importEvent` in `src/store/useAppStore.ts` to create a contact for each imported participant name with no case-insensitive match in `contacts`
- [x] 5.2 Ensure import never renames an existing contact or changes any contact's `Me` flag
- [x] 5.3 Add/extend tests covering import adding missing contacts, not duplicating existing ones, and leaving `Me` unchanged

## 6. UI: Contacts screen

- [x] 6.1 Create `src/components/Contacts.tsx`: alphabetical list, add/rename/delete actions, and a control to mark/unmark a contact as `Me`
- [x] 6.2 Add an empty-state message and add-contact action when there are no contacts
- [x] 6.3 Add a navigation entry point from `EventsHome` (header action) to open the Contacts screen, wired in `App.tsx` as a top-level screen alongside Events home (not a tab)
- [x] 6.4 Add UI messages for contact validation errors in `src/ui/messages.ts` (required, too long, duplicate)
- [x] 6.5 Add `src/components/Contacts.test.tsx` covering list ordering, add, rename, delete, and the `Me` toggle

## 7. UI: add participants from contacts and autocomplete

- [x] 7.1 Add an "Add from contacts" control to `GroupTab.tsx` presenting a multi-select list of eligible contacts, confirming adds them all as participants
- [x] 7.2 Add autocomplete suggestions to the existing add-participant text input, filtered by prefix and excluding contacts already in the event
- [x] 7.3 Wire submitting a suggestion to add the participant using the contact's exact stored name
- [x] 7.4 Update `src/components/GroupTab.test.tsx` for "Add from contacts", autocomplete suggestions, and typing a new name creating a contact

## 8. Verification

- [ ] 8.1 Run `npm test` and confirm all new and existing tests pass
- [x] 8.2 Run `npm run build` to confirm type-checking passes
- [x] 8.3 Manually verify: renaming/deleting a contact does not change any event's participant names, and importing a shared event adds missing contacts
