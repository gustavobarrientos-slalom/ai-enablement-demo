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
The Expenses tab SHALL list all expenses with their concept, amount, and payer, and SHALL display the sum of all expense amounts as the group total. When no expenses exist, it MUST display the message `No expenses yet` together with an icon that matches that message.

#### Scenario: Empty state before any expense is recorded
- **WHEN** the group has no expenses
- **THEN** the Expenses tab shows `No expenses yet` with an accompanying icon

#### Scenario: Group total sums all expenses
- **WHEN** the group has expenses of `$120.50` and `$79.50`
- **THEN** the group total shows `$200.00`

#### Scenario: Empty state disappears once an expense exists
- **WHEN** the user adds the first expense
- **THEN** `No expenses yet` is no longer shown and the expense appears in the list

#### Scenario: Amounts use MXN formatting
- **WHEN** an expense of 25000 cents is displayed
- **THEN** it is shown as `$250.00`

### Requirement: Expenses persist across reloads
The system SHALL persist expenses to `localStorage` together with the group state under the versioned key. When the stored data is invalid or comes from an unknown version, the system MUST discard it and start from empty state rather than failing.

#### Scenario: Expenses are restored on reload
- **WHEN** the user records two expenses and reloads the app
- **THEN** both expenses, their shares, and the group total are restored

#### Scenario: Expense order is preserved
- **WHEN** expenses are recorded in a given order and the app reloads
- **THEN** the list shows them in the same order

#### Scenario: Corrupted expense data is discarded
- **WHEN** the persisted expenses are malformed or reference participants that do not exist
- **THEN** the stored data is discarded, the app starts from empty state, and it does not crash

