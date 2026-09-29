## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Expense list shows the group total and an empty state
The Expenses tab SHALL list all expenses with their concept, total, and payer, and SHALL display the sum of all expense totals as the group total, where an expense total is `amount + tip`. An expense that carries a tip SHALL additionally show its tip. When no expenses exist, it MUST display the message `No expenses yet` together with an icon that matches that message.

#### Scenario: Empty state before any expense is recorded
- **WHEN** the group has no expenses
- **THEN** the Expenses tab shows `No expenses yet` with an accompanying icon

#### Scenario: Group total sums all expenses
- **WHEN** the group has expenses of `$120.50` and `$79.50`, neither with a tip
- **THEN** the group total shows `$200.00`

#### Scenario: Group total includes tips
- **WHEN** the group has one expense of `$100.00` with a `10` percent tip and one of `$50.00` with no tip
- **THEN** the group total shows `$160.00`

#### Scenario: A tipped expense shows its tip
- **WHEN** an expense of `$250.00` with a `10` percent tip is displayed
- **THEN** the row shows a total of `$275.00` and indicates a tip of `$25.00`

#### Scenario: Empty state disappears once an expense exists
- **WHEN** the user adds the first expense
- **THEN** `No expenses yet` is no longer shown and the expense appears in the list

#### Scenario: Amounts use MXN formatting
- **WHEN** an expense of 25000 cents is displayed
- **THEN** it is shown as `$250.00`

### Requirement: Expenses persist across reloads
The system SHALL persist expenses to `localStorage` together with the group state under the versioned key. Expenses persisted under the previous version, which had no tip, SHALL be migrated forward and loaded as expenses with no tip rather than discarded. When the stored data is invalid or comes from an unknown version, the system MUST discard it and start from empty state rather than failing.

#### Scenario: Expenses are restored on reload
- **WHEN** the user records two expenses and reloads the app
- **THEN** both expenses, their shares, their tips, and the group total are restored

#### Scenario: Expense order is preserved
- **WHEN** expenses are recorded in a given order and the app reloads
- **THEN** the list shows them in the same order

#### Scenario: Expenses saved before tips existed still load
- **WHEN** the stored data comes from the previous version, whose expenses have no tip field
- **THEN** the expenses are loaded with no tip, their totals equal their amounts, and nothing is discarded

#### Scenario: Corrupted expense data is discarded
- **WHEN** the persisted expenses are malformed or reference participants that do not exist
- **THEN** the stored data is discarded, the app starts from empty state, and it does not crash

#### Scenario: An invalid stored tip is rejected
- **WHEN** a persisted expense carries a tip that is negative or not an integer number of cents
- **THEN** the stored data is discarded and the app starts from empty state rather than loading an inconsistent expense
