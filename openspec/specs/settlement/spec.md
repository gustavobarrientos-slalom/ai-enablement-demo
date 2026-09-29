# settlement Specification

## Purpose
Turn recorded expenses into an answer to the only question that matters at
the end of an event: who pays whom. This capability derives each
participant's paid, consumed and net position in integer cents, enforces
that the nets sum to exactly zero, and produces a concrete transfer plan
using a greedy largest debtor to largest creditor match. The plan is
bounded by N-1 transfers and deterministic via participant order; it is
deliberately not claimed to be the global minimum.
## Requirements
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

### Requirement: Nets sum to zero
The sum of all participant nets MUST be exactly `0` cents, because every cent paid is allocated to exactly one beneficiary share. When the sum is not zero the data is inconsistent, and the system SHALL display an error state and SHALL NOT display a transfer plan.

#### Scenario: Consistent data sums to zero
- **WHEN** balances are computed from any set of expenses whose shares sum to their amounts
- **THEN** the sum of all nets is exactly 0 cents

#### Scenario: Inconsistent data shows an error state
- **WHEN** the nets computed from the current state do not sum to 0 cents
- **THEN** the Settlement tab shows the message `Balances do not add up` and no transfers are listed

### Requirement: Transfer plan
The system SHALL derive a list of directional transfers that brings every net to zero, using a greedy algorithm: while at least one debtor and one creditor remain, select the participant with the largest absolute debt and the participant with the largest credit, transfer the smaller of the two absolute amounts from the debtor to the creditor, and remove any participant whose balance reaches zero. Ties in either selection MUST be broken by participant insertion order. Transfer amounts MUST be positive integer cents.

#### Scenario: Single debtor and single creditor
- **WHEN** `Luis` has a net of `-50.00` and `Ana` has a net of `+50.00`
- **THEN** the plan is a single transfer `Luis -> Ana $50.00`

#### Scenario: Debtor settled across two creditors
- **WHEN** `Beto` has a net of `-100.00`, `Ana` has `+60.00` and `Carla` has `+40.00`
- **THEN** the plan is `Beto -> Ana $60.00` followed by `Beto -> Carla $40.00`

#### Scenario: Tie broken by participant order
- **WHEN** two debtors owe the same amount and the sole creditor can absorb only one of them fully, for participants added in the order `Ana`, `Luis`, `Carla`
- **THEN** the debtor added first is selected first

#### Scenario: Every transfer amount is positive
- **WHEN** a transfer plan is produced for any consistent state
- **THEN** no transfer has an amount of zero or a negative amount

#### Scenario: The plan settles every participant
- **WHEN** all transfers in the plan are applied to the nets
- **THEN** every participant's resulting balance is exactly `$0.00`

### Requirement: Transfer count is bounded but not minimal
For `N` participants the plan SHALL contain at most `N-1` transfers, because each step drives at least one participant's balance to zero. The system MUST NOT describe the plan as the minimum possible number of transfers, since minimizing transfer count is not guaranteed by this algorithm.

#### Scenario: Plan stays within the bound
- **WHEN** a transfer plan is produced for a group of 5 participants
- **THEN** the plan contains at most 4 transfers

#### Scenario: No claim of optimality in the interface
- **WHEN** the Settlement tab is displayed with a transfer plan
- **THEN** the copy describes the transfers as a way to settle up and does not claim they are the fewest possible

### Requirement: Settled up state
When every participant's net is exactly zero the system SHALL display the message `Everyone is settled up` and SHALL NOT display any transfer.

#### Scenario: No expenses recorded
- **WHEN** the group has participants but no expenses
- **THEN** the Settlement tab shows `Everyone is settled up`

#### Scenario: Expenses that cancel out
- **WHEN** `Ana` paid `50.00` split equally between `Ana` and `Luis`, and `Luis` paid `50.00` split equally between `Ana` and `Luis`
- **THEN** every net is `$0.00` and the Settlement tab shows `Everyone is settled up`

#### Scenario: Self funded expense
- **WHEN** `Ana` paid `30.00` and is the only beneficiary
- **THEN** every net is `$0.00` and the Settlement tab shows `Everyone is settled up`

### Requirement: Recalculation on change
Balances and transfers SHALL be recomputed from the current participants and expenses whenever either changes. Derived balances, nets, and transfers MUST NOT be cached or persisted. Persisted payment marks SHALL remain a separate checklist and MUST NOT change these calculations; marks SHALL be reconciled against the recomputed transfer plan.

#### Scenario: Adding an expense updates the settlement
- **WHEN** the user adds an expense while the Settlement tab is displayed
- **THEN** the balances and transfers shown reflect the new expense

#### Scenario: Deleting an expense updates the settlement
- **WHEN** the user deletes the only expense in the group
- **THEN** the Settlement tab shows `Everyone is settled up`

#### Scenario: Editing an expense updates the settlement
- **WHEN** the user changes the amount of an existing expense
- **THEN** the transfers are recomputed from the updated amount

#### Scenario: Settlement survives a reload
- **WHEN** the page is reloaded with persisted participants and expenses
- **THEN** the same balances and transfers are computed again from the restored state

#### Scenario: Marking a payment does not settle a net
- **WHEN** a transfer is marked paid
- **THEN** every participant's paid, consumed, and net values and the transfer plan remain the same

### Requirement: Transfer payment checklist
Each computed transfer in an Open event SHALL have a paid/unpaid checkbox, initially unpaid. A transfer's checklist identity MUST consist of its payer ID, receiver ID, and amount in integer cents within that event. Checking and unchecking a transfer MUST change only its paid mark; participant nets and the computed transfer plan MUST remain unchanged. Paid marks SHALL persist per event across reloads. Archived events MUST show existing marks but MUST NOT allow changing them.

#### Scenario: Mark and unmark a transfer
- **WHEN** the user checks an unpaid transfer from Luis to Ana for 5000 cents and then unchecks it
- **THEN** it is shown as paid after checking and unpaid after unchecking, while the displayed nets and transfers remain identical throughout

#### Scenario: Distinct amounts have distinct marks
- **WHEN** Luis to Ana for 5000 cents is paid and the current plan instead contains Luis to Ana for 6000 cents
- **THEN** the 6000-cent transfer is unpaid and the 5000-cent paid mark is discarded

#### Scenario: Paid marks survive reload
- **WHEN** a transfer in event A is marked paid and the page reloads with the same transfer
- **THEN** that transfer remains checked without persisting or changing the derived balances or plan

#### Scenario: Marks never cross events
- **WHEN** events A and B both have the same payer ID, receiver ID, and transfer amount, but only A's transfer is checked
- **THEN** B's transfer remains unchecked

#### Scenario: Archived event checklist is read-only
- **WHEN** an Archived event containing a paid transfer is opened and a payment toggle is attempted
- **THEN** its saved mark stays visible and unchanged, and no state-changing checkbox is available

### Requirement: Payment marks track the current transfer plan
Whenever a change to an event's participants or expenses recomputes its transfer plan, the system MUST retain paid marks only for transfers whose payer ID, receiver ID, and integer-cent amount remain identical in that event's new plan. Marks for absent transfers MUST be discarded, including when the plan becomes empty. Reappearing transfers that were previously discarded MUST start unpaid. The same reconciliation MUST occur on rehydration so stale persisted marks do not reappear.

#### Scenario: Identical transfer keeps its mark
- **WHEN** an expense is changed but a paid transfer from Luis to Ana for 5000 cents still appears in the recalculated plan
- **THEN** that transfer remains paid

#### Scenario: Removed transfer loses its mark
- **WHEN** an edited expense changes a paid Luis to Ana transfer from 5000 to 6000 cents
- **THEN** the 5000-cent mark is discarded and the new 6000-cent transfer is unpaid

#### Scenario: Returning transfer does not revive an old mark
- **WHEN** a marked transfer disappears after an edit and an identical transfer appears again after another edit
- **THEN** the reappearing transfer is unpaid

#### Scenario: Empty plan discards marks
- **WHEN** deleting an expense removes the last transfer from an event's plan
- **THEN** the event has no paid transfer marks

#### Scenario: Stale persisted mark is pruned
- **WHEN** a saved paid mark is not present in the transfer plan recomputed after reload
- **THEN** the mark is discarded and cannot affect payment progress

### Requirement: Payment progress
For an event with transfers, Settlement SHALL show `X of Y paid`, where X is the number of currently paid transfers and Y is the number of currently computed transfers. When Y is greater than zero and X equals Y, Settlement SHALL also show `All paid — event closed` without modifying the event's Open/Archived status. When Y is zero, the existing `Everyone is settled up` state SHALL remain and the screen MUST NOT show `All paid — event closed`.

#### Scenario: Partial progress
- **WHEN** one of three transfers in an event is marked paid
- **THEN** Settlement shows `1 of 3 paid` and does not show `All paid — event closed`

#### Scenario: All transfers checked
- **WHEN** both transfers in an Open event are marked paid
- **THEN** Settlement shows `2 of 2 paid` and `All paid — event closed`, while the event remains Open and its nets and transfers stay unchanged

#### Scenario: No transfers is not all paid
- **WHEN** an event has no transfers because everyone is settled up
- **THEN** Settlement shows `Everyone is settled up` and does not show `All paid — event closed`

#### Scenario: Progress recalculates when plan changes
- **WHEN** one of two transfers is paid and a group change removes the unpaid transfer without changing the paid transfer
- **THEN** Settlement shows `1 of 1 paid` and `All paid — event closed`

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

### Requirement: Settlement shows a category breakdown
The Settlement screen SHALL derive a category breakdown from the active event's expenses only, displaying each category's tip-inclusive total and percentage of that event's group total. Each expense MUST contribute its entire total to exactly one category so the integer-cent category totals MUST sum exactly to the event's group total. Only categories with expenses SHALL be displayed, in descending order by total. Percentages SHALL be display-only to one decimal place and need not sum to 100. The breakdown MUST NOT be persisted.

#### Scenario: Nonempty categories sorted by total
- **WHEN** the active event has Food expenses totaling 10000 cents, Drinks totaling 2500 cents, and no other expenses
- **THEN** Food appears first at `$100.00` and Drinks second at `$25.00`, with no empty category rows

#### Scenario: Tip-inclusive category totals reconcile exactly
- **WHEN** the active event has a Food expense totaling 10001 cents including its tip and a Transport expense totaling 4999 cents including its tip
- **THEN** Food totals 10001 cents and Transport totals 4999 cents, summing exactly to the 15000-cent group total

#### Scenario: Rounded percentages need not sum to 100
- **WHEN** three different categories each total 1 cent in a 3-cent event
- **THEN** each displays `33.3%`, even though the displayed percentages sum to `99.9%`, and each monetary total remains 1 cent

#### Scenario: Breakdown follows active event only
- **WHEN** event A has a Food expense and event B has a Drinks expense and the user switches from A to B
- **THEN** Settlement shows only the Drinks category and B's total, without any Food total from A

#### Scenario: Breakdown changes with expenses
- **WHEN** an expense is recategorized, changed in amount, or deleted
- **THEN** the active event's displayed totals, percentages, and order reflect the current expenses without persisting a breakdown

#### Scenario: Empty group shows no category rows
- **WHEN** the active event has no expenses
- **THEN** Settlement shows no category breakdown rows
