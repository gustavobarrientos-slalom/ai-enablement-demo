# group-management Specification

## Purpose
Define the group a shared event belongs to: its name and its participants.
This capability owns participant identity and ordering, and decides when the
group is complete enough for expenses to be recorded and settled.
## Requirements
### Requirement: Event name
The system SHALL store an event name for each event. The name MUST be between 1 and 60 characters after trimming. When a new event is created without a provided name, it SHALL use the default `New event`. Renaming an Open event MUST affect only that event; an Archived event MUST remain read-only.

#### Scenario: Default event name on creation
- **WHEN** the user creates an event without providing a name
- **THEN** the event name is `New event` and is shown in its Group tab

#### Scenario: Renaming the event to a valid name
- **WHEN** the user changes the active Open event's name to `Trip to Oaxaca`
- **THEN** that event's name is stored as `Trip to Oaxaca` and other event names do not change

#### Scenario: Event name is trimmed
- **WHEN** the user submits the event name `  New Year dinner  `
- **THEN** the stored event name is `New Year dinner`

#### Scenario: Empty event name is rejected
- **WHEN** the user submits an event name that is empty or only whitespace
- **THEN** the change is rejected, the previous event name is kept, and the message `The event name is required` is shown

#### Scenario: Event name longer than 60 characters is rejected
- **WHEN** the user submits an event name of 61 or more characters after trimming
- **THEN** the change is rejected and the message `The event name must be at most 60 characters` is shown

#### Scenario: Archived event name cannot be changed
- **WHEN** the user attempts to rename an Archived event
- **THEN** the event name remains unchanged

### Requirement: Add participants by name
The system SHALL allow adding participants to the group by name. A participant name MUST be trimmed before validation and storage, MUST be between 1 and 30 characters after trimming, and MUST be unique within the group when compared case-insensitively.

#### Scenario: Adding a valid participant
- **WHEN** the user adds the participant `Ana`
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

### Requirement: Group validity gates other tabs
A group SHALL be considered valid only when it contains at least 2 participants. While the group is invalid, the Expenses and Settlement tabs MUST be disabled and MUST NOT be selectable.

#### Scenario: Group with no participants is invalid
- **WHEN** the group has 0 participants
- **THEN** the group is invalid and the Expenses and Settlement tabs are disabled

#### Scenario: Group with one participant is invalid
- **WHEN** the group has exactly 1 participant
- **THEN** the group is invalid and the Expenses and Settlement tabs are disabled

#### Scenario: Group becomes valid with two participants
- **WHEN** a second participant is added to a group that had 1 participant
- **THEN** the group becomes valid and the Expenses and Settlement tabs become enabled

#### Scenario: Group becomes invalid again after a removal
- **WHEN** a group with exactly 2 participants and no expenses has one participant removed
- **THEN** the group becomes invalid and the Expenses and Settlement tabs are disabled again

#### Scenario: Disabled tab cannot be activated
- **WHEN** the group is invalid and the user taps the Expenses tab
- **THEN** the active tab remains Group

### Requirement: Participants referenced by expenses cannot be removed
The system SHALL prevent removal of any participant referenced by at least one expense, either as the payer or as a beneficiary. The remove action for such a participant MUST be disabled and MUST expose the message `Has associated expenses`.

#### Scenario: Removing an unreferenced participant
- **WHEN** the user removes a participant who is not the payer or a beneficiary of any expense
- **THEN** the participant is removed from the group

#### Scenario: Removal blocked for a payer
- **WHEN** a participant is the payer of at least one expense
- **THEN** the remove action for that participant is disabled and shows `Has associated expenses`

#### Scenario: Removal blocked for a beneficiary
- **WHEN** a participant is a beneficiary of at least one expense
- **THEN** the remove action for that participant is disabled and shows `Has associated expenses`

#### Scenario: Blocked removal leaves the group unchanged
- **WHEN** a removal is attempted for a participant referenced by an expense
- **THEN** the participant list is unchanged

### Requirement: Participants keep insertion order
The system SHALL preserve participants in the order they were added. This order MUST be stable across additions, removals, persistence, and rehydration, and MUST be the canonical ordering used for tie-breaking in balance and settlement calculations.

#### Scenario: Participants are listed in insertion order
- **WHEN** the user adds `Ana`, then `Luis`, then `Sofia`
- **THEN** the participant list is `Ana`, `Luis`, `Sofia` in that order

#### Scenario: Removal preserves the order of the rest
- **WHEN** `Luis` is removed from the list `Ana`, `Luis`, `Sofia`
- **THEN** the participant list is `Ana`, `Sofia` in that order

#### Scenario: A re-added participant goes to the end
- **WHEN** `Luis` is removed from `Ana`, `Luis`, `Sofia` and then added again
- **THEN** the participant list is `Ana`, `Sofia`, `Luis` in that order

#### Scenario: Order survives persistence
- **WHEN** a group with participants `Ana`, `Luis`, `Sofia` is persisted and the app reloads
- **THEN** the rehydrated participant list is `Ana`, `Luis`, `Sofia` in that order

### Requirement: Group state persistence
The system SHALL persist each event's name and participant list as part of the event collection in `localStorage` under a versioned key. When stored data is invalid or comes from an unknown version, the system MUST discard it and show an empty Events home rather than failing.

#### Scenario: Group state is restored on reload
- **WHEN** the user has an event named `Trip to Oaxaca` with participants `Ana` and `Luis`, and reloads the app
- **THEN** the event name and both participants are restored for that event

#### Scenario: Corrupted stored data is discarded
- **WHEN** the persisted value under the storage key is not valid event collection state
- **THEN** the app starts with an empty Events home and does not crash

#### Scenario: Unknown storage version is discarded
- **WHEN** the persisted state carries a version the app does not recognize
- **THEN** the stored data is discarded and the app starts with an empty Events home

#### Scenario: Participant lists remain separate
- **WHEN** two events have different participant lists and the app reloads
- **THEN** each event retains only its own participants in insertion order

