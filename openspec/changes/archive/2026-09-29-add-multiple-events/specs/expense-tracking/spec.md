## MODIFIED Requirements

### Requirement: Expenses persist across reloads
The system SHALL persist each event's expenses with its group state as part of the event collection in `localStorage` under a versioned key. Expenses persisted under the previous version SHALL be migrated forward rather than discarded. Expenses MUST belong to exactly one event and MUST NOT appear in another event's list or total. When the stored data is invalid or comes from an unknown version, the system MUST discard it and show an empty Events home rather than failing.

#### Scenario: Expenses are restored on reload
- **WHEN** the user records two expenses in one event and reloads the app
- **THEN** both expenses, their shares, and that event's group total are restored

#### Scenario: Expense order is preserved
- **WHEN** expenses are recorded in a given order in an event and the app reloads
- **THEN** that event's list shows them in the same order

#### Scenario: Expenses saved before tips existed still load
- **WHEN** an event's stored data comes from the previous version, whose expenses have no tip field
- **THEN** those expenses are loaded with no tip, their totals equal their amounts, and nothing is discarded

#### Scenario: An invalid stored tip is rejected
- **WHEN** a persisted expense in any event carries a tip that is negative or not an integer number of cents
- **THEN** the stored data is discarded and the app shows an empty Events home rather than loading an inconsistent expense

#### Scenario: Corrupted expense data is discarded
- **WHEN** the persisted expenses are malformed or reference participants that do not exist in their event
- **THEN** the stored data is discarded, the app starts with an empty Events home, and it does not crash

#### Scenario: Expenses of different events remain separate
- **WHEN** two events have different expenses and the app reloads
- **THEN** each event shows only its own expenses and its own total