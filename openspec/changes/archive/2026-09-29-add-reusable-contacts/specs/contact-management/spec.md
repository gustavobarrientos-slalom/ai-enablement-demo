## ADDED Requirements

### Requirement: Contact identity and validation
The system SHALL maintain one global list of contacts, independent of any
event. A contact name MUST be trimmed before validation and storage, MUST
be between 1 and 30 characters after trimming, and MUST be unique across
all contacts when compared case-insensitively.

#### Scenario: Adding a valid contact
- **WHEN** the user adds the contact `Ana`
- **THEN** `Ana` is added to the contacts directory

#### Scenario: Contact name is trimmed
- **WHEN** the user adds the contact `  Luis  `
- **THEN** the contact is stored with the name `Luis`

#### Scenario: Empty contact name is rejected
- **WHEN** the user adds a contact whose name is empty or only whitespace
- **THEN** no contact is added and the message `The name is required` is shown

#### Scenario: Contact name longer than 30 characters is rejected
- **WHEN** the user adds a contact whose trimmed name is 31 or more characters
- **THEN** no contact is added and the message `The name must be at most 30 characters` is shown

#### Scenario: Duplicate contact name is rejected case-insensitively
- **WHEN** the contacts directory already contains `Ana` and the user adds `  ANA  `
- **THEN** no contact is added and the message `A contact with that name already exists` is shown

### Requirement: Contacts screen
The system SHALL provide a Contacts screen reachable from the Events home
that lists all contacts sorted alphabetically by name, and lets the user
add, rename, and delete contacts from that screen.

#### Scenario: Opening the Contacts screen
- **WHEN** the user selects the Contacts action from the Events home
- **THEN** the Contacts screen opens and lists every contact

#### Scenario: Contacts are listed alphabetically
- **WHEN** the contacts directory contains `Sofia`, `Ana`, and `Luis`
- **THEN** the Contacts screen lists them as `Ana`, `Luis`, `Sofia`

#### Scenario: No contacts yet
- **WHEN** the contacts directory is empty
- **THEN** the Contacts screen shows an empty-state message and an action to add a contact

### Requirement: Rename a contact
The system SHALL allow renaming any contact, subject to the same name
validation and case-insensitive uniqueness rules as creation.

#### Scenario: Renaming a contact to a valid name
- **WHEN** the user renames the contact `Ana` to `Ana Garcia`
- **THEN** the contact is stored as `Ana Garcia`

#### Scenario: Renaming to an invalid or duplicate name is rejected
- **WHEN** the user renames a contact to an empty name, a name longer than 30 trimmed characters, or a name that matches another contact case-insensitively
- **THEN** the rename is rejected, the contact keeps its previous name, and the corresponding validation message is shown

### Requirement: Delete a contact
The system SHALL allow deleting any contact regardless of whether its name
was ever used to add a participant to an event.

#### Scenario: Deleting a contact
- **WHEN** the user deletes the contact `Ana`
- **THEN** `Ana` no longer appears in the contacts directory

#### Scenario: Deleting a contact used in past events does not change those events
- **WHEN** the contact `Ana` was previously used to add a participant to an event and the user deletes the contact `Ana`
- **THEN** the event still shows a participant named `Ana`

### Requirement: One contact marked as Me
The system SHALL allow marking at most one contact as `Me` at a time.
Marking a different contact as `Me` MUST unmark the previous one.

#### Scenario: Marking a contact as Me
- **WHEN** no contact is marked as `Me` and the user marks `Ana` as `Me`
- **THEN** `Ana` is flagged as `Me`

#### Scenario: Marking another contact as Me unmarks the previous one
- **WHEN** `Ana` is marked as `Me` and the user marks `Luis` as `Me`
- **THEN** `Luis` is flagged as `Me` and `Ana` is no longer flagged as `Me`

#### Scenario: Unmarking Me
- **WHEN** `Ana` is marked as `Me` and the user unmarks her
- **THEN** no contact is flagged as `Me`

### Requirement: Contacts persistence and migration
The system SHALL persist the contacts directory in `localStorage` as part
of the app's versioned storage state. When the persisted state carries no
contacts array under the current version, the system SHALL migrate it by
building the initial contacts list from the names of all participants
across all existing events, deduplicated case-insensitively, keeping the
first occurrence of each name. When stored data is invalid or comes from an
unknown version, the system MUST discard it and start with an empty
contacts directory rather than failing.

#### Scenario: Contacts are restored on reload
- **WHEN** the contacts directory has `Ana` and `Luis`, and the app reloads
- **THEN** both contacts are restored

#### Scenario: Migrating from events without a contacts directory
- **WHEN** the persisted state has events with participants `Ana`, `Luis`, and `Ana` (in a second event) but no contacts array, and the app loads under the new storage version
- **THEN** the contacts directory is created with `Ana` and `Luis`, with only one `Ana` entry

#### Scenario: Migration runs once
- **WHEN** the contacts directory already exists, even if empty
- **THEN** migration does not run again and does not re-add contacts from event participants

#### Scenario: Corrupted stored contacts are discarded
- **WHEN** the persisted contacts value is not a valid contacts array
- **THEN** the app starts with an empty contacts directory and does not crash
