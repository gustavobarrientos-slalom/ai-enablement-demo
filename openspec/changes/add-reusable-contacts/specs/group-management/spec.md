## MODIFIED Requirements

### Requirement: Add participants by name
The system SHALL allow adding participants to the group either by picking
one or several existing contacts or by typing a name, with autocomplete
suggestions drawn from the contacts directory. A participant name MUST be
trimmed before validation and storage, MUST be between 1 and 30 characters
after trimming, and MUST be unique within the group when compared
case-insensitively. Typing a name that does not match any existing contact
case-insensitively SHALL both add the participant and create a new contact
with that name.

#### Scenario: Adding a valid participant by typing a matching contact's name
- **WHEN** the contacts directory contains `Ana` and the user types `Ana` to add a participant
- **THEN** `Ana` is added to the participant list and appears in the Group tab

#### Scenario: Participant name is trimmed
- **WHEN** the user adds the participant `  Luis  `
- **THEN** the participant is stored with the name `Luis`

#### Scenario: Empty participant name is rejected
- **WHEN** the user adds a participant whose name is empty or only whitespace
- **THEN** no participant is added and the message `The name is required` is shown

#### Scenario: Participant name longer than 30 characters is rejected
- **WHEN** the user adds a participant whose trimmed name is 31 or more characters
- **THEN** no participant is added and the message `The name must be at most 30 characters` is shown

#### Scenario: Duplicate participant name is rejected case-insensitively
- **WHEN** the group already contains `Ana` and the user adds `  ANA  `
- **THEN** no participant is added and the message `A participant with that name already exists` is shown

#### Scenario: Typing a new name adds the participant and creates a contact
- **WHEN** the contacts directory has no contact named `Marta` and the user types `Marta` to add a participant to the event
- **THEN** `Marta` is added to the event's participant list and a new contact named `Marta` is added to the contacts directory

## ADDED Requirements

### Requirement: Add participants from contacts
The system SHALL let the user pick one or several existing contacts to add
as participants in a single action ("Add from contacts"), excluding
contacts whose name already matches a current participant case-insensitively.

#### Scenario: Adding several contacts at once
- **WHEN** the contacts directory has `Ana`, `Luis`, and `Sofia`, none of whom are participants yet, and the user selects `Ana` and `Sofia` from "Add from contacts"
- **THEN** both `Ana` and `Sofia` are added as participants and `Luis` is not

#### Scenario: Contacts already in the event are not offered again
- **WHEN** `Ana` is already a participant in the event
- **THEN** `Ana` does not appear in the "Add from contacts" selection list

### Requirement: Autocomplete suggestions when adding a participant
While typing a participant name, the system SHALL suggest contacts whose
name starts with the typed text, compared case-insensitively, excluding
contacts already added as participants in the event.

#### Scenario: Suggestions match the typed prefix
- **WHEN** the contacts directory has `Ana`, `Andres`, and `Luis`, and the user types `an`
- **THEN** `Ana` and `Andres` are suggested and `Luis` is not

#### Scenario: Contacts already in the event are excluded from suggestions
- **WHEN** `Ana` is already a participant in the event and the user types `an`
- **THEN** `Ana` is not suggested

### Requirement: Participant names are independent of later contact changes
Once a participant is added to an event, its stored name SHALL be treated
as a snapshot. Renaming or deleting the contact that the name came from
MUST NOT change that participant's name in any event, past or currently
open.

#### Scenario: Renaming a contact does not affect existing participants
- **WHEN** the contact `Ana` was used to add a participant to an event and the contact is later renamed to `Ana Garcia`
- **THEN** the event's participant remains named `Ana`

#### Scenario: Deleting a contact does not affect existing participants
- **WHEN** the contact `Ana` was used to add a participant to an event and the contact is later deleted
- **THEN** the event's participant remains named `Ana`
