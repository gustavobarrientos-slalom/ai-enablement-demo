## ADDED Requirements

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
