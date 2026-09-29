## ADDED Requirements

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

## MODIFIED Requirements

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