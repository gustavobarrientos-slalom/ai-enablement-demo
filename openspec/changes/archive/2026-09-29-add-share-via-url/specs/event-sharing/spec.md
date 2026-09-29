## ADDED Requirements

### Requirement: Share the active event as a link
The system SHALL provide a Share action while an event is open. The action MUST
build a URL whose fragment carries the active event — its name, participants,
and expenses with their concepts, amounts in cents, payers, split modes, shares,
tips and categories, plus the event's paid-transfer marks — serialized and
compressed with `lz-string`'s `compressToEncodedURIComponent`. The payload MUST
be placed in the URL hash and MUST NOT appear in the query string or any other
part of the URL that a server receives. The URL MUST be written to the
clipboard.

#### Scenario: Share copies a hash-encoded link
- **WHEN** the user selects Share on an open event that has participants and expenses
- **THEN** the clipboard receives a URL whose fragment contains the compressed event payload and whose query string contains no event data

#### Scenario: Shared payload carries the full event
- **WHEN** an event with two participants, a categorized expense with a tip, and one paid transfer is encoded
- **THEN** the payload includes the event name, both participants, the expense with its category, split shares and tip, and the paid transfer

### Requirement: Confirm the copy
After the share URL is successfully written to the clipboard, the system SHALL
show the message `Link copied`.

#### Scenario: Confirmation after copying
- **WHEN** the Share action copies the URL to the clipboard successfully
- **THEN** the message `Link copied` is shown

### Requirement: Import a shared event on load
When the app loads with shared data in the URL hash, the system SHALL decode it
and add it as a NEW event with a newly generated id and fresh `createdAt` and
`updatedAt` timestamps. Existing events MUST NOT be replaced, modified or
removed, even when the shared event originated from this installation. The
imported event MUST become the active, open event and the message
`Event imported` MUST be shown.

#### Scenario: Import adds a new event
- **WHEN** the app loads with a valid shared payload in the hash while two events already exist
- **THEN** a third event is created from the payload, the two existing events are unchanged, the imported event is opened, and `Event imported` is shown

#### Scenario: Re-importing the same event does not overwrite
- **WHEN** the user opens a link generated from an event that already exists in this browser
- **THEN** a separate additional event is created and the original event keeps its own id and data

### Requirement: Reject invalid shared data
When the hash carries shared data that cannot be decompressed, is not valid
JSON, or does not match the expected event shape, the system SHALL show the
message `This link is invalid` and MUST leave every stored event, the active
event, and all persisted state unchanged.

#### Scenario: Corrupted payload
- **WHEN** the app loads with a hash payload whose compressed text has been truncated or altered
- **THEN** `This link is invalid` is shown and no event is created, removed or modified

#### Scenario: Well-formed but wrong shape
- **WHEN** the hash decompresses to valid JSON that is missing required event fields or references an unknown payer
- **THEN** `This link is invalid` is shown and the stored events are unchanged

### Requirement: Clear shared data from the hash after loading
After a load attempt completes, whether it imported an event or rejected the
payload, the system SHALL remove the shared data from the URL hash without
reloading the page, so that reloading does not import the event again.

#### Scenario: Hash cleared after a successful import
- **WHEN** a shared payload is imported
- **THEN** the URL no longer contains the shared data in its hash

#### Scenario: Hash cleared after an invalid payload
- **WHEN** a shared payload is rejected as invalid
- **THEN** the URL no longer contains the shared data in its hash

#### Scenario: Reload does not duplicate the event
- **WHEN** the user reloads the page after a shared payload was imported
- **THEN** no additional event is created

### Requirement: Encoding and decoding round-trip exactly
Decoding the output of the encoder SHALL yield an event identical to the one
that was encoded, for every field carried in the payload: name, participants in
order, expenses in order with concepts, cent amounts, payers, split modes,
shares, tips and categories, and paid transfers.

#### Scenario: Round-trip preserves the event
- **WHEN** an event with multiple participants, custom-split and equal-split expenses, percent and fixed tips, all categories, and paid transfers is encoded and then decoded
- **THEN** the decoded event payload is deeply equal to the encoded event payload

#### Scenario: Round-trip preserves exact cent amounts
- **WHEN** an event containing amounts such as 1 cent, 99999999 cents and a percent tip is encoded and decoded
- **THEN** every amount is returned as the identical integer number of cents
