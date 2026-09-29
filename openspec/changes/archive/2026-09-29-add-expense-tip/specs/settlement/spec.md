## MODIFIED Requirements

### Requirement: Per participant balance
The system SHALL compute, for every current participant, three values in integer cents: `paid` (the sum of the totals of the expenses where that participant is the payer, where an expense total is `amount + tip`), `consumed` (the sum of that participant's shares across all expenses, each share already including that participant's part of the tip), and `net = paid - consumed`. A positive net means the group owes the participant; a negative net means the participant owes the group. Balances SHALL be derived on read and MUST NOT be persisted.

#### Scenario: Participant who paid more than they consumed
- **WHEN** `Ana` paid an expense of `100.00` split equally between `Ana` and `Luis`
- **THEN** `Ana` has paid 10000, consumed 5000 and a net of `+50.00`

#### Scenario: Participant who consumed more than they paid
- **WHEN** `Ana` paid an expense of `100.00` split equally between `Ana` and `Luis`
- **THEN** `Luis` has paid 0, consumed 5000 and a net of `-50.00`

#### Scenario: Payer who is not a beneficiary
- **WHEN** `Ana` paid an expense of `60.00` whose only beneficiaries are `Luis` and `Carla`
- **THEN** `Ana` has consumed 0 and a net of `+60.00`

#### Scenario: Paid includes the tip
- **WHEN** `Ana` paid an expense of `100.00` with a `10` percent tip, split equally between `Ana` and `Luis`
- **THEN** `Ana` has paid 11000, consumed 5500 and a net of `+55.00`, and `Luis` has a net of `-55.00`

#### Scenario: Nets still sum to zero when tips are present
- **WHEN** any combination of expenses, with and without tips, is recorded
- **THEN** the sum of every participant's net is exactly `$0.00`

#### Scenario: Participant with no activity
- **WHEN** `Diana` is a participant but neither paid nor benefited from any expense
- **THEN** `Diana` has paid 0, consumed 0 and a net of `$0.00`

#### Scenario: Balances are listed in participant order
- **WHEN** the settlement is displayed for participants added in the order `Ana`, `Luis`, `Carla`
- **THEN** the balances are listed in that same order

#### Scenario: Balances are not stored
- **WHEN** the persisted state is inspected after balances have been displayed
- **THEN** no balance, net or transfer value appears in storage

### Requirement: Settlement golden scenario
The system SHALL produce the following result for this reference case, which is the acceptance test for the whole capability. Participants in insertion order: `Ana`, `Luis`, `Carla`, `Beto`, `Diana`. Expenses:
1. `Dinner` `1,000.00` paid by `Ana`, split equally among all five, with a `10` percent tip.
2. `Uber` `250.00` paid by `Luis`, split equally among `Ana`, `Luis` and `Carla`.
3. `Drinks` `600.00` paid by `Carla`, custom split `Beto 300.00`, `Diana 200.00`, `Carla 100.00`.
4. `Dessert` `100.01` paid by `Beto`, split equally among all five.

#### Scenario: Golden tip distribution
- **WHEN** the `Dinner` expense of `1,000.00` with a `10` percent tip is split equally among the five participants
- **THEN** the tip is 10000 cents, each participant receives 2000 cents of it, each consumes 22000 cents, and `Ana` is recorded as having paid `$1,100.00`

#### Scenario: Golden nets
- **WHEN** balances are computed for the reference case
- **THEN** the nets are `Ana +776.65`, `Luis -73.33`, `Carla +176.67`, `Beto -439.99`, `Diana -440.00`, and they sum to `$0.00`

#### Scenario: Golden transfers
- **WHEN** the transfer plan is computed for the reference case
- **THEN** the plan is exactly `Diana -> Ana $440.00`, `Beto -> Ana $336.65`, `Beto -> Carla $103.34`, `Luis -> Carla $73.33`

#### Scenario: Golden remainder allocation
- **WHEN** the `Dessert` expense of `100.01` is split equally among the five participants
- **THEN** `Ana` is allocated 2001 cents and the other four are allocated 2000 cents each

#### Scenario: Golden plan respects the bound
- **WHEN** the transfer plan is computed for the reference case of 5 participants
- **THEN** the plan contains exactly 4 transfers, which is the `N-1` bound

#### Scenario: Golden case without the tip
- **WHEN** the same reference case is computed with no tip on `Dinner`
- **THEN** the nets are `Ana +696.65`, `Luis -53.33`, `Carla +196.67`, `Beto -419.99`, `Diana -420.00`, confirming the tip is the only difference
