## Why

Expenses currently lack a category, so a group's settlement shows who owes whom but not what the group spent money on. A category breakdown adds that context while preserving the existing cent-exact group total.

## What Changes

- Give each expense in an event exactly one category from Food, Drinks, Transport, Lodging, Entertainment, and Other, with its corresponding Font Awesome Free icon; default new expenses to Other.
- **BREAKING**: Bump the persisted storage version and migrate expenses without a category to Other across the existing event collection without changing the rest of their data.
- Show the expense's category icon beside each expense in its event's list.
- Show a per-category total and display-only one-decimal percentage on that event's Settlement screen, sorted by amount descending and omitting unused categories. Category totals sum exactly to its group total in cents.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `expense-tracking`: Categorize, validate, persist, migrate, and show each expense's category and icon.
- `settlement`: Show the active event's derived, cent-exact category breakdown.

## Impact

Expense types and validation, create/edit form and list, icon registry, event-collection persistence and migration, Settlement display and derived totals, and automated tests. No backend or new icon library is required.