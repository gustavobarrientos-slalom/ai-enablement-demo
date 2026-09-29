## ADDED Requirements

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