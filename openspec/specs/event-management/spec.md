# event-management Specification

## Purpose
Let one installation hold many independent events, so a dinner, a trip and
a shared house never mix. This capability owns the event collection and
each event's lifecycle: creation with a validated name, opening and
returning to the Events home, renaming, archiving and unarchiving, and
deletion behind an explicit confirmation. Every event keeps its own
participants, expenses and settlement, plus creation and update
timestamps used to order the history. Archived events stay fully readable
but reject every mutation at the store boundary, and the persisted
collection is versioned so unreadable or outdated data is discarded
rather than crashing the app.

## Requirements
### Requirement: Events home and history
When no event is open, the app SHALL show an Events home listing all events with each event's name, creation date, participant count, group total in MXN, and status `Open` or `Archived`. The list MUST be sorted by `updatedAt` descending and MUST allow filtering by All, Open, or Archived without deleting or changing any events. When there are no events, it SHALL show `No events yet` and a `Create event` action.

#### Scenario: Empty Events home
- **WHEN** the app has no events and no last active event
- **THEN** the Events home shows `No events yet` and a `Create event` action

#### Scenario: List displays event history newest first
- **WHEN** an Open event last updated on September 20 has two participants and a total of 10000 cents, and an Archived event last updated on September 21 has three participants and a total of 2500 cents
- **THEN** the Archived event appears first and each row shows its name, creation date, participant count, MXN group total, and status

#### Scenario: Filter by status
- **WHEN** the list contains one Open and one Archived event and the user selects the Open filter
- **THEN** only the Open event appears; selecting Archived shows only the Archived event and selecting All shows both

### Requirement: Create and open events
The system SHALL allow creating an event with a trimmed name of 1 to 60 characters, defaulting to `New event` when no name is provided. A created event MUST become active and open on the Group tab. Opening an existing event SHALL show that event's Group, Expenses, and Settlement tabs; a header action SHALL return to the Events home. The existing group-validity tab gating MUST apply to the active event.

#### Scenario: Create with the default name
- **WHEN** the user creates an event without entering a name
- **THEN** the new event is named `New event`, becomes active, and opens on the Group tab

#### Scenario: Create with a valid name
- **WHEN** the user creates an event with the name `  Trip to Oaxaca  `
- **THEN** the event is named `Trip to Oaxaca` and opens on the Group tab

#### Scenario: Reject invalid name
- **WHEN** the user explicitly enters only whitespace or more than 60 characters after trimming as the new event name
- **THEN** no event is created and the appropriate name validation error is shown

#### Scenario: Return to Events home
- **WHEN** the user opens an event and selects the header's back-to-Events action
- **THEN** the Events home is shown without deleting or modifying the event

#### Scenario: Open an existing event
- **WHEN** the user selects an existing event on the Events home
- **THEN** its Group tab opens and its Expenses and Settlement tabs are accessible only if that event has at least two participants

### Requirement: Rename and delete events
An Open event SHALL be renamable under the same 1-to-60-character trimmed-name validation as creation. The system SHALL require the exact confirmation prompt `Delete this event? This cannot be undone.` before deleting any event. Cancelling MUST leave the event unchanged; confirming MUST remove it and all its associated data, returning to the Events home if it was open. Deletion of an Archived event SHALL remain available with the same confirmation.

#### Scenario: Rename a valid event
- **WHEN** the user renames an Open event to `  Weekend trip  `
- **THEN** its stored name is `Weekend trip` and its `updatedAt` advances

#### Scenario: Reject an invalid rename
- **WHEN** the user renames an Open event to only whitespace or a name longer than 60 trimmed characters
- **THEN** the previous name is kept and a validation error is shown

#### Scenario: Cancel deletion
- **WHEN** the user selects Delete and cancels `Delete this event? This cannot be undone.`
- **THEN** the event and all its data remain unchanged

#### Scenario: Confirm deletion
- **WHEN** the user confirms `Delete this event? This cannot be undone.` for an event
- **THEN** that event and its participants and expenses are removed, while other events are unchanged

### Requirement: Archive state is read-only
The system SHALL allow archiving and unarchiving events. Archived events MUST remain viewable on Group, Expenses, and Settlement subject to the existing group-validity tab gating, but MUST reject edits to their names, participants, and expenses, including calls to state-changing actions outside the UI. Archiving and unarchiving SHALL update the event's status and `updatedAt`. Deletion with confirmation and unarchiving MUST remain available for Archived events.

#### Scenario: View archived event
- **WHEN** the user opens an Archived event
- **THEN** its Group, Expenses, and Settlement data remain viewable and its editing controls are unavailable

#### Scenario: Reject edits to archived data
- **WHEN** an add, edit, or remove action for participants or expenses, or a rename action, is invoked on an Archived event
- **THEN** its name, participants, expenses, and `updatedAt` remain unchanged

#### Scenario: Unarchive an event
- **WHEN** the user unarchives an Archived event
- **THEN** its status becomes `Open` and editing is available again

### Requirement: Event timestamps and isolation
Every event SHALL store `createdAt` and `updatedAt` timestamps. Creation SHALL set both to the creation time. Any successful change to an event's group or expenses MUST update only that event's `updatedAt`; changes to another event MUST NOT affect it. Participants, expenses, group totals, balances, and transfers MUST be derived only from the selected event. Event totals and settlement calculations SHALL remain in integer cents.

#### Scenario: Timestamps on creation
- **WHEN** a new event is created
- **THEN** its `createdAt` and `updatedAt` are set to its creation time

#### Scenario: Group and expense edits update one timestamp
- **WHEN** a participant is added or an expense is saved in event A
- **THEN** event A's `updatedAt` advances while its `createdAt` and event B's timestamps stay unchanged

#### Scenario: Data from separate events never mixes
- **WHEN** event A has Ana and Beto with a 10000-cent expense and event B has Luis and Carla with a 2500-cent expense
- **THEN** opening A shows only Ana, Beto, and A's expense, total, and settlement; opening B shows only Luis, Carla, and B's expense, total, and settlement

### Requirement: Persist and migrate the event collection
The system SHALL persist the event list and last active event identity in `localStorage` under a bumped storage version. On reload it MUST reopen the last active event if it still exists, otherwise show the Events home. A valid, nonempty legacy single event SHALL be migrated into the first event in the list with its name, participants, and expenses preserved. A legacy event without participants or expenses SHALL be discarded. Malformed data or an unknown version MUST be discarded without crashing.

#### Scenario: Last active event survives reload
- **WHEN** two events are saved, the second is the last active event, and the app reloads
- **THEN** both events are restored and the second event opens

#### Scenario: Deleted active event falls back to home
- **WHEN** the persisted last active event identity does not match any restored event
- **THEN** the Events home is shown and no unrelated event opens

#### Scenario: Migrate a nonempty legacy event
- **WHEN** valid single-event data with participants or expenses exists at the supported preceding storage version
- **THEN** it becomes the first event and opens as the last active event, with the same name, participant order, expenses, shares, and amounts

#### Scenario: Discard an empty legacy event
- **WHEN** a valid legacy single event has no participants and no expenses
- **THEN** migration creates no event and the Events home shows `No events yet`

#### Scenario: Reject malformed or unknown persisted data
- **WHEN** the stored event collection is malformed or has an unsupported storage version
- **THEN** it is discarded and the app shows an empty Events home without crashing

### Requirement: Importing a shared event adds missing contacts
When a shared event link is imported, the system SHALL check each imported
participant's name against the contacts directory and create a new contact
for any name that has no case-insensitive match. Existing contacts MUST NOT
be renamed, and no contact's `Me` flag MUST be changed by an import.

#### Scenario: Importing adds a contact for a new participant name
- **WHEN** the contacts directory has no contact named `Diego` and the user imports a shared event whose participants include `Diego`
- **THEN** the imported event is added and a new contact named `Diego` is added to the contacts directory

#### Scenario: Importing does not duplicate an existing contact
- **WHEN** the contacts directory already contains `Ana` and the user imports a shared event whose participants include `ana`
- **THEN** the imported event is added and the contacts directory still contains exactly one contact matching `Ana` case-insensitively

#### Scenario: Importing does not change the Me flag
- **WHEN** the contact `Ana` is marked as `Me` and the user imports a shared event whose participants include `Ana`
- **THEN** the imported event is added and `Ana` remains the only contact marked as `Me`
