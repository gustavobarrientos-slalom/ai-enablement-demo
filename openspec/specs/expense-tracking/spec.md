# expense-tracking Specification

## Purpose
Record what the group spent: who paid, how much, and who benefited.
This capability owns the split arithmetic that turns an amount into per
participant shares in integer cents, and guarantees those shares always
sum exactly to the expense total.
## Requirements
### Requirement: Expense fields and validation
An expense SHALL have a concept of 1 to 60 characters after trimming, an amount greater than zero with at most 2 decimal places, exactly one payer, and at least one beneficiary. The payer MUST be a current participant but MUST NOT be required to be a beneficiary. All beneficiaries MUST be current participants. Amounts MUST be stored as integer cents.

#### Scenario: Saving a valid expense
- **WHEN** the user saves an expense with concept `Cena`, amount `250.00`, payer `Ana`, and beneficiaries `Ana`, `Luis`, `Carla`
- **THEN** the expense is added to the list with an amount of 25000 cents

#### Scenario: Payer who is not a beneficiary
- **WHEN** the user saves an expense paid by `Ana` whose only beneficiaries are `Luis` and `Carla`
- **THEN** the expense is saved and `Ana` is not allocated any share

#### Scenario: Concept is trimmed
- **WHEN** the user saves an expense with the concept `  Taxi  `
- **THEN** the stored concept is `Taxi`

#### Scenario: Empty concept is rejected
- **WHEN** the user submits an expense whose concept is empty or only whitespace
- **THEN** the expense is not saved and the message `The concept is required` is shown

#### Scenario: Concept longer than 60 characters is rejected
- **WHEN** the user submits a concept of 61 or more characters after trimming
- **THEN** the expense is not saved and the message `The concept must be at most 60 characters` is shown

#### Scenario: Zero or negative amount is rejected
- **WHEN** the user submits an amount of `0` or a negative amount
- **THEN** the expense is not saved and the message `The amount must be greater than zero` is shown

#### Scenario: More than two decimals is rejected
- **WHEN** the user submits the amount `10.999`
- **THEN** the expense is not saved and the message `The amount can have at most 2 decimals` is shown

#### Scenario: No beneficiaries is rejected
- **WHEN** the user submits an expense with no beneficiary selected
- **THEN** the expense is not saved and the message `Select at least one beneficiary` is shown

### Requirement: Equal split distributes leftover cents deterministically
When the split mode is equal, the system SHALL divide the amount evenly across the beneficiaries in integer cents. Any leftover cents MUST be distributed one cent each to beneficiaries in participant insertion order. The resulting parts MUST always sum exactly to the expense total.

#### Scenario: Leftover cents go to the first beneficiaries in participant order
- **WHEN** an expense of `$250.00` is split equally among `Ana`, `Luis`, and `Carla`, in that participant order
- **THEN** the shares are `$83.34` for `Ana`, `$83.33` for `Luis`, and `$83.33` for `Carla`

#### Scenario: Exact division leaves no remainder
- **WHEN** an expense of `$100.00` is split equally among 4 beneficiaries
- **THEN** each beneficiary is allocated `$25.00`

#### Scenario: Single beneficiary receives the full amount
- **WHEN** an expense of `$37.77` is split equally among a single beneficiary
- **THEN** that beneficiary is allocated `$37.77`

#### Scenario: Parts always sum to the total
- **WHEN** any amount is split equally among any number of beneficiaries
- **THEN** the sum of all shares equals the expense amount exactly

#### Scenario: Remainder follows participant order, not selection order
- **WHEN** an expense of `$250.00` is split equally and the user selects the beneficiaries in the order `Carla`, `Ana`, `Luis` while the participant order is `Ana`, `Luis`, `Carla`
- **THEN** the extra cent is allocated to `Ana`

### Requirement: Custom split requires parts to sum to the total
When the split mode is custom, the system SHALL accept an explicit amount for each beneficiary and MUST block saving unless those amounts sum exactly to the expense total. The form MUST display a live indicator showing `$X remaining` when the parts sum to less than the total and `$X over` when they exceed it.

#### Scenario: Saving a balanced custom split
- **WHEN** an expense of `$100.00` has custom shares of `$60.00` and `$40.00`
- **THEN** the expense is saved with those shares

#### Scenario: Saving is blocked when parts are under the total
- **WHEN** an expense of `$100.00` has custom shares of `$60.00` and `$30.00`
- **THEN** saving is blocked and the indicator shows `$10.00 remaining`

#### Scenario: Saving is blocked when parts exceed the total
- **WHEN** an expense of `$100.00` has custom shares of `$60.00` and `$50.00`
- **THEN** saving is blocked and the indicator shows `$10.00 over`

#### Scenario: Indicator updates live as amounts change
- **WHEN** the user changes a custom share so that the parts go from under the total to exactly the total
- **THEN** the indicator stops showing a remaining or over amount and saving becomes possible

#### Scenario: Custom shares may be zero
- **WHEN** an expense of `$100.00` has custom shares of `$100.00` and `$0.00`
- **THEN** the expense is saved with those shares

#### Scenario: Negative custom shares are rejected
- **WHEN** a custom share is negative
- **THEN** saving is blocked and the message `Shares cannot be negative` is shown

### Requirement: Expenses can be edited
The system SHALL allow editing any field of an existing expense, applying the same validation and split rules as creation. Editing MUST preserve the expense's position in the list and MUST recompute its shares.

#### Scenario: Editing the amount recomputes an equal split
- **WHEN** the user edits an equally split expense from `$90.00` to `$100.00` across 4 beneficiaries
- **THEN** each beneficiary's share becomes `$25.00`

#### Scenario: Editing the beneficiaries recomputes the shares
- **WHEN** the user removes a beneficiary from an equally split expense
- **THEN** the shares are recalculated across the remaining beneficiaries and still sum to the total

#### Scenario: Invalid edits are rejected
- **WHEN** the user edits an expense to have an empty concept
- **THEN** the change is not applied and the original expense is unchanged

### Requirement: Expenses can be deleted
The system SHALL allow deleting an expense. After deletion the expense MUST no longer appear in the list, MUST no longer count toward the group total, and MUST no longer block removal of its participants.

#### Scenario: Deleting an expense
- **WHEN** the user deletes an expense
- **THEN** it is removed from the list

#### Scenario: Deleting updates the group total
- **WHEN** the group total is `$150.00` and the user deletes an expense of `$50.00`
- **THEN** the group total becomes `$100.00`

#### Scenario: Deleting the last referencing expense unblocks removal
- **WHEN** the only expense referencing `Ana` is deleted
- **THEN** `Ana` can be removed from the group

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

### Requirement: Expense may include an optional tip
An expense MAY include a tip. The tip SHALL be expressed either as an integer percentage from 0 to 100 of the expense amount, or as a fixed amount in MXN with at most 2 decimal places. A tip MUST NOT be negative. When a tip is expressed as a percentage, the tip in cents SHALL be computed as `floor(amountCents * percentage / 100)`, so the recorded tip never exceeds the stated percentage. The tip MUST be stored as integer cents and MUST NOT be computed with floating-point arithmetic. An expense without a tip behaves exactly as before this change.

#### Scenario: Expense saved without a tip
- **WHEN** the user saves an expense of `100.00` and leaves the tip empty
- **THEN** the expense is saved with a tip of 0 and a total of `$100.00`

#### Scenario: Percentage tip is converted to cents
- **WHEN** the user saves an expense of `250.00` with a tip of `10` percent
- **THEN** the stored tip is 2500 cents and the total is `$275.00`

#### Scenario: Percentage tip floors to whole cents
- **WHEN** the user saves an expense of `100.01` with a tip of `15` percent
- **THEN** the stored tip is 1500 cents, because `1500.15` cents is floored

#### Scenario: Fixed tip is accepted
- **WHEN** the user saves an expense of `100.00` with a fixed tip of `10.00`
- **THEN** the stored tip is 1000 cents and the total is `$110.00`

#### Scenario: Zero percent tip is accepted
- **WHEN** the user saves an expense with a tip of `0` percent
- **THEN** the expense is saved with a tip of 0 cents

#### Scenario: Negative tip is rejected
- **WHEN** the user submits a tip of `-5` percent or a fixed tip of `-10.00`
- **THEN** the expense is not saved and the message `The tip cannot be negative` is shown

#### Scenario: Percentage above 100 is rejected
- **WHEN** the user submits a tip of `101` percent
- **THEN** the expense is not saved and the message `The tip percentage must be between 0 and 100` is shown

#### Scenario: Fractional percentage is rejected
- **WHEN** the user submits a tip of `12.5` percent
- **THEN** the expense is not saved and the message `The tip percentage must be a whole number` is shown

#### Scenario: Fixed tip with more than two decimals is rejected
- **WHEN** the user submits a fixed tip of `10.999`
- **THEN** the expense is not saved and the message `The tip can have at most 2 decimals` is shown

### Requirement: Tip is distributed proportionally to consumption
The tip SHALL be distributed across the beneficiaries of the expense in proportion to the amount each one consumed from the expense amount. Each beneficiary's tip part SHALL be the floor of its exact proportional value, and the leftover cents SHALL be handed out one each, in order of the largest fractional remainder, breaking ties by participant insertion order. The tip parts MUST always sum exactly to the tip. This rule SHALL apply identically to equal and custom splits.

#### Scenario: Proportional distribution over a custom split
- **WHEN** an expense of `600.00` is split `Beto 300.00`, `Diana 200.00`, `Carla 100.00` with a `10` percent tip
- **THEN** the tip of 6000 cents is distributed as `Beto 3000`, `Diana 2000`, `Carla 1000`

#### Scenario: Proportional distribution matches an equal split
- **WHEN** an expense of `1,000.00` is split equally among five participants with a `10` percent tip
- **THEN** each participant receives 2000 cents of tip and consumes 22000 cents in total

#### Scenario: Leftover tip cents follow the largest remainder
- **WHEN** an expense of `250.00` is split equally among `Ana`, `Luis` and `Carla` with a `10` percent tip
- **THEN** the base shares are `8334`, `8333`, `8333`, the tip parts are `834`, `833`, `833`, and the totals are `91.68`, `91.66`, `91.66`

#### Scenario: Tip parts always sum to the tip
- **WHEN** any expense with a tip is saved
- **THEN** the sum of the beneficiaries' tip parts equals the tip exactly, with no cent lost or invented

#### Scenario: Shares sum to the tip inclusive total
- **WHEN** an expense of `100.00` with a fixed tip of `10.00` is split equally among `Ana`, `Luis` and `Carla`
- **THEN** the shares are `36.68`, `36.66`, `36.66` and they sum to `$110.00`

#### Scenario: A beneficiary who consumed nothing receives no tip
- **WHEN** an expense uses a custom split that allocates `0.00` to a beneficiary and that expense carries a tip
- **THEN** that beneficiary receives no part of the tip

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
