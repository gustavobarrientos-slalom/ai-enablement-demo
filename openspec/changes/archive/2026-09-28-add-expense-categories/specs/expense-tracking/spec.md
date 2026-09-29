## ADDED Requirements

### Requirement: Every expense has a fixed category
Every expense SHALL have exactly one category from Food, Drinks, Transport, Lodging, Entertainment, and Other. The form MUST default new expenses to Other, allow choosing a category when creating or editing an expense, and reject any value outside the list. Category icons MUST use Font Awesome Free: Food (utensils), Drinks (martini-glass), Transport (car), Lodging (bed), Entertainment (ticket), and Other (tag).

#### Scenario: New expense defaults to Other
- **WHEN** the user saves an expense without changing its category
- **THEN** the expense has exactly the Other category, represented by the tag icon

#### Scenario: Fixed choices and matching icons
- **WHEN** the user views the available expense categories
- **THEN** the choices are exactly Food (utensils), Drinks (martini-glass), Transport (car), Lodging (bed), Entertainment (ticket), and Other (tag)

#### Scenario: Editing the category
- **WHEN** an Open event's Food expense is edited to use Drinks
- **THEN** it has exactly the Drinks category and its icon changes to martini-glass

#### Scenario: Invalid category is rejected
- **WHEN** a draft with a category outside the fixed list is submitted
- **THEN** it is not saved and the original expense, if editing, remains unchanged

## MODIFIED Requirements

### Requirement: Expense list shows the group total and an empty state
The Expenses tab SHALL list the active event's expenses with their concept, tip-inclusive total, payer, and category icon next to each expense, and SHALL display the sum of all its expense totals as the group total, where an expense total is `amount + tip`. An expense that carries a tip SHALL additionally show its tip. When no expenses exist, it MUST display the message `No expenses yet` together with an icon that matches that message.

#### Scenario: Empty state before any expense is recorded
- **WHEN** the active event has no expenses
- **THEN** the Expenses tab shows `No expenses yet` with an accompanying icon

#### Scenario: Group total sums all expenses
- **WHEN** the active event has expenses of `$120.50` and `$79.50`, neither with a tip
- **THEN** the group total shows `$200.00`

#### Scenario: Group total includes tips
- **WHEN** the active event has one expense of `$100.00` with a `10` percent tip and one of `$50.00` with no tip
- **THEN** the group total shows `$160.00`

#### Scenario: A tipped expense shows its tip
- **WHEN** an expense of `$250.00` with a `10` percent tip is displayed
- **THEN** the row shows a total of `$275.00` and indicates a tip of `$25.00`

#### Scenario: Empty state disappears once an expense exists
- **WHEN** the user adds the first expense to the active event
- **THEN** `No expenses yet` is no longer shown and the expense appears in the list

#### Scenario: Amounts use MXN formatting
- **WHEN** an expense of 25000 cents is displayed
- **THEN** it is shown as `$250.00`

#### Scenario: Expense row displays its category icon
- **WHEN** a Transport expense appears in the active event's list
- **THEN** a car icon is shown next to that expense

### Requirement: Expenses persist across reloads
The system SHALL persist each event's expenses, including their categories, with its group state in the versioned event collection in `localStorage`. On a storage-version bump it MUST migrate all valid expenses lacking a category in the supported predecessor payload to Other, without changing their other fields or order. Expenses MUST belong to exactly one event and MUST NOT appear in another event's list or total. Invalid expenses, including current-version expenses with a missing or unknown category, and unsupported versions MUST be discarded with the stored payload; the app MUST show an empty Events home without crashing.

#### Scenario: Expenses are restored on reload
- **WHEN** the user records two expenses with categories in an event and reloads the app
- **THEN** both expenses, their categories, shares, tips, and that event's group total are restored

#### Scenario: Expense order is preserved
- **WHEN** expenses are recorded in a given order in an event and the app reloads
- **THEN** that event's list shows them in the same order

#### Scenario: Expenses saved before tips existed still load
- **WHEN** a supported legacy expense has no tip field
- **THEN** it loads with no tip, its total equals its amount, and it receives the Other category if missing one

#### Scenario: An invalid stored tip is rejected
- **WHEN** a persisted expense in any event carries a tip that is negative or not an integer number of cents
- **THEN** the stored data is discarded and the app shows an empty Events home rather than loading an inconsistent expense

#### Scenario: Corrupted expense data is discarded
- **WHEN** persisted expenses are malformed or reference participants that do not exist in their event
- **THEN** the stored data is discarded, the app shows an empty Events home, and it does not crash

#### Scenario: Expenses of different events remain separate
- **WHEN** two events have different expenses and the app reloads
- **THEN** each event shows only its own expenses and its own total

#### Scenario: Previous-version expenses gain Other
- **WHEN** multiple events are restored from the supported preceding version with valid expenses lacking categories
- **THEN** each expense in each event receives Other while its event, order, amount, tip, and shares remain unchanged

#### Scenario: Current-version invalid category is rejected
- **WHEN** a current-version persisted expense has no category or one outside the fixed list
- **THEN** the stored data is discarded and the app shows an empty Events home

#### Scenario: Unknown storage version is rejected
- **WHEN** the persisted event collection has an unsupported version
- **THEN** the stored data is discarded and the app shows an empty Events home without crashing