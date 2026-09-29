## Why

Every event starts with a blank participant list, so users retype the same
names (family, roommates, regular travel buddies) for each new event. A
reusable, global contacts directory lets people pick who's coming instead of
retyping names, while keeping past events untouched when a contact is later
renamed or removed.

## What Changes

- Add a global `Contacts` directory, independent of any event, holding a
  name (1-30 chars, trimmed, unique case-insensitively) and an optional `Me`
  flag (at most one contact at a time).
- Add a Contacts screen, reachable from the Events home, that lists contacts
  alphabetically and supports add, rename, and delete.
- Change the "add participant" flow on the Group tab to offer picking one or
  several existing contacts ("Add from contacts") or typing a name with
  autocomplete suggestions drawn from contacts.
- Typing a name that doesn't match any contact both adds the participant to
  the event and creates a new contact with that name.
- Participants keep storing a name snapshot: renaming or deleting a contact
  never changes any event's past or current participant names.
- Importing a shared event now also adds any of its participant names that
  are missing from the contacts directory.
- Persist contacts in `localStorage` under a bumped storage version, with a
  one-time migration that seeds contacts from every existing event's
  participants, deduplicated case-insensitively.

## Capabilities

### New Capabilities
- `contact-management`: Global contacts directory (CRUD, uniqueness, the
  `Me` flag, the Contacts screen, and persistence/migration).

### Modified Capabilities
- `group-management`: Adding a participant now supports selecting from
  contacts or typing a name with autocomplete, and typing a new name also
  creates a contact; participants keep a name snapshot decoupled from later
  contact edits.
- `event-management`: Importing a shared event adds any participant names
  missing from the contacts directory.

## Impact

- New domain module for contacts (validation, uniqueness, `Me` flag) under
  `/src/domain`.
- New Zustand state slice for contacts (add/rename/delete/set-Me) and
  autocomplete/selection support in the participant-adding flow.
- New `Contacts` component/screen and navigation entry point from
  `EventsHome`.
- Changes to `GroupTab` (or its add-participant flow) to support contact
  selection and autocomplete.
- Changes to import handling (`share.ts` / store `importEvent`) to seed
  missing contacts.
- Storage version bump and a migration step in the persistence layer.
