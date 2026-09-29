## Context

Split has no concept of a person outside an event: every event's
`participants` array is created from scratch, validated only for uniqueness
within that one event (`src/domain/group.ts`). Persistence is a single
Zustand `persist` blob (`STORAGE_KEY = 'split:v2'`, `STORAGE_VERSION = 6`)
holding `{ events, lastActiveEventId }`. Sharing/import already exists
(`src/domain/share.ts`, `importEvent` in the store) and copies a whole
event's participants and expenses verbatim into a new local event.

This change adds a global, event-independent contacts directory that the
Group tab can draw participants from, without breaking the existing rule
that an event's data is self-contained and never retroactively changes.

## Goals / Non-Goals

**Goals:**
- One global list of contacts, independent of any event, with name
  validation/uniqueness rules mirroring today's participant rules (1-30
  chars, trimmed, case-insensitive unique).
- Let the user pick existing contacts or type a new name (with autocomplete)
  when adding participants to an event.
- Guarantee that renaming/deleting a contact never changes any event's
  stored participant names (past or currently open).
- Support exactly one contact flagged as "Me".
- Seed contacts once, on migration, from every existing event's
  participants, deduplicated case-insensitively.
- Keep contacts in the app's existing single persisted blob and versioning
  scheme rather than introducing a second storage key.

**Non-Goals:**
- No contact-level history/analytics (e.g., "events this contact appeared
  in").
- No merging or fuzzy-matching of similarly-spelled contacts.
- No change to how expenses reference participants (`payerId`,
  `shares[].participantId` keep pointing at the event's own
  `Participant.id`, untouched by this change).
- No enforcement that an event's participants stay "in sync" with contacts
  after creation — the snapshot is intentionally one-way and one-time.

## Decisions

**Contacts live in the same persisted store and are bumped in the same
storage version.**
Alternative considered: a separate `localStorage` key for contacts. Rejected
because the project's convention is one versioned blob with a single
migration path (`STORAGE_KEY`/`STORAGE_VERSION` in
`src/store/useAppStore.ts`), and a second key would need its own corruption
and versioning handling for no real benefit at this app's scale.

**Contact shape:** `{ id: string; name: string; isMe: boolean }` in a new
`src/domain/contact.ts`, with pure functions (`addContact`, `renameContact`,
`removeContact`, `setMeContact`, `validateContactName`, `sortContactsByName`)
mirroring the style of `src/domain/group.ts`. Reuses `namesMatch` from
`group.ts` for case-insensitive comparisons so the two capabilities can't
drift on collation rules.

**Participants keep storing only a name snapshot; no `contactId` link is
stored on `Participant`.**
Alternative considered: store `contactId` on each `Participant` and resolve
the display name from the contacts list, falling back to a cached name if
the contact was deleted. Rejected because it reintroduces exactly the
coupling the requirements rule out ("renaming or deleting a contact never
changes past or current events") and adds null-handling complexity for
deleted contacts throughout expense/settlement code that already assumes
`Participant.name` is stable. Keeping `Participant` unchanged (`{ id, name
}`) means contacts are purely a picker/autocomplete data source at
add-time.

**Adding a participant from the Group tab gets two entry points that both
funnel into the existing `addParticipant` domain/store call:**
1. "Add from contacts" — a multi-select list of contacts (excluding names
   already in the event, compared case-insensitively) that adds one
   participant per selected contact.
2. A text input with autocomplete suggestions sourced from contacts
   (filtered by prefix, case-insensitive, excluding names already in the
   event). Submitting a name that matches no contact both adds the
   participant and creates a new contact via one store action, so the two
   never disagree about what "matches" means (`namesMatch`).

**Contact deletion is unconditional.**
Unlike participant removal (blocked while referenced by expenses), contacts
carry no back-references, so delete is always allowed — this is a direct
consequence of the snapshot decision above.

**Contacts screen is a new top-level screen, not a tab.**
The existing Group/Expenses/Settlement tabs are scoped to an open event.
Contacts is reachable from the Events home (no event open) via a header
action, toggled the same way `EventsHome` vs. an open event is chosen today
(local UI state in `App.tsx`), keeping the "tabs, not a router" constraint
intact.

**Migration seeds contacts once, from all existing events' participants.**
On the version bump, if there is no persisted `contacts` array yet, build
one by walking every event's participants in event-then-participant order,
keeping the first occurrence of each name and comparing case-insensitively
with `namesMatch`. This is a one-time forward migration; it does not run
again once a `contacts` array exists (even if empty).

**Import adds any missing contact names, not full contacts.**
Importing a shared event only ever creates participants with fresh IDs
(existing behavior). This change additionally checks each imported
participant's name against the contacts list and creates a contact for any
name with no case-insensitive match. No existing contact is renamed or
flagged as "Me" by an import.

## Risks / Trade-offs

- [Risk] Seeding contacts from historical participants on migration could
  create many low-value contacts (typos, one-off names) → Mitigation:
  dedupe case-insensitively and let users delete unwanted contacts
  afterward; deletion is unconditional and cheap.
- [Risk] Two ways to add a participant (contacts picker vs. autocomplete
  text) could diverge in validation → Mitigation: both paths call the same
  `addParticipant`/`addContact` domain functions and the same `namesMatch`
  helper.
- [Risk] Adding a `contacts` array to the persisted blob changes its shape
  → Mitigation: treat it like every prior storage migration in this project
  — versioned, with malformed/unknown-version data discarded rather than
  crashing.
