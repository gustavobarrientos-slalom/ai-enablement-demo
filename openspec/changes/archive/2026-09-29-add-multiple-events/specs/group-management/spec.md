## MODIFIED Requirements

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