# mobile-app-shell Specification

## Purpose
TBD - created by archiving change add-mobile-app-shell. Update Purpose after archive.
## Requirements
### Requirement: Fixed bottom tab navigation
The event workspace SHALL present navigation as a tab bar fixed to the bottom of
the viewport containing exactly three destinations — Group, Expenses, and
Settlement — each rendered with a Font Awesome Free icon and a visible text
label. The bottom tab bar SHALL replace the previous top segmented tabs and
SHALL remain visible while the screen content scrolls.

#### Scenario: Bottom tab bar replaces top tabs
- **WHEN** the user opens an event
- **THEN** the navigation tabs are rendered in a bottom-fixed tab bar and no top
  segmented tab control is rendered

#### Scenario: Each tab shows an icon and a label
- **WHEN** the bottom tab bar is rendered
- **THEN** each of the Group, Expenses, and Settlement tabs displays both a Font
  Awesome icon and its text label

#### Scenario: Tab bar stays visible while scrolling
- **WHEN** the user scrolls the content of the Expenses tab
- **THEN** the bottom tab bar remains fixed at the bottom of the viewport

#### Scenario: Selecting a tab switches the screen
- **WHEN** the user taps the Settlement tab
- **THEN** the Settlement panel becomes the visible panel and the Settlement tab
  is marked as selected

### Requirement: Top app bar with back action and contextual actions
When an event is open, the app SHALL render a top app bar that displays the
event name, a back action that returns to the Events screen, and the contextual
actions available for the current event (share and theme control). On the Events
screen the app bar SHALL show the app title and SHALL NOT show a back action.

#### Scenario: App bar shows event name and back action
- **WHEN** an event is open
- **THEN** the top app bar displays the event name and a back control labeled
  for returning to Events

#### Scenario: Back action returns to Events
- **WHEN** the user activates the back control in the top app bar
- **THEN** the Events screen is shown and no event is active

#### Scenario: No back action on the Events screen
- **WHEN** no event is open
- **THEN** the top app bar renders without a back control

#### Scenario: Contextual actions live in the app bar
- **WHEN** an event is open
- **THEN** the share action and the theme control are rendered inside the top
  app bar

#### Scenario: Share is a plain icon action
- **WHEN** an event is open
- **THEN** the app bar displays only the share icon, without visible Share text
  or a filled background, while retaining its accessible name and 44px target

### Requirement: Bottom-anchored primary actions
A screen's primary action SHALL be presented as a labeled, circular
bottom-right floating action button (FAB) within thumb reach, rather than as an
inline control at the top of the screen. This applies to "Create event" on
Events, "Add expense" on Expenses, and "Add participant" on Group.

#### Scenario: Create event uses a FAB
- **WHEN** the Events screen is shown
- **THEN** a plus-icon FAB labeled "Create event" appears at the bottom right
  above the home-indicator inset instead of an inline create form
- **AND WHEN** it is activated
- **THEN** the event name form opens in a labeled bottom sheet

#### Scenario: Add expense is bottom-anchored
- **WHEN** the Expenses screen is shown
- **THEN** the "Add expense" primary action is rendered in the bottom-anchored
  action area above the bottom tab bar

#### Scenario: Add participant is bottom-anchored
- **WHEN** the Group screen is shown
- **THEN** the "Add participant" primary action is rendered in the
  bottom-anchored action area above the bottom tab bar

#### Scenario: Primary action clears the safe area
- **WHEN** the bottom-anchored action is rendered on a device with a home
  indicator inset
- **THEN** the action is offset by the bottom safe-area inset so it is not
  obscured

#### Scenario: Primary action does not cover list rows
- **WHEN** the Events, Group, or Expenses screen contains a long list
- **THEN** its scrollable content ends above a reserved area for the FAB, and
  every row can be scrolled fully into view without passing beneath the action

### Requirement: Bottom sheet forms and dialogs
Forms and confirmation dialogs SHALL open as bottom sheets anchored to the
bottom of the viewport over a backdrop. Each sheet SHALL be dismissible both by
tapping the backdrop and by activating an explicit close control, and SHALL
expose an accessible dialog role with a label.

#### Scenario: Expense form opens as a bottom sheet
- **WHEN** the user activates "Add expense"
- **THEN** the expense form is presented as a bottom sheet with a dialog role
  and an accessible name

#### Scenario: Backdrop tap dismisses the sheet
- **WHEN** a bottom sheet is open and the user taps the backdrop
- **THEN** the sheet closes and the underlying screen is shown unchanged

#### Scenario: Close control dismisses the sheet
- **WHEN** a bottom sheet is open and the user activates its close control
- **THEN** the sheet closes

#### Scenario: Sheet controls stay visible on mobile
- **WHEN** a bottom sheet opens from an animated screen on a device with a
  home-indicator inset
- **THEN** it is anchored to the viewport outside the animated content, and
  the submit action remains fully visible above the safe area

#### Scenario: Dialog is centered on a wide viewport
- **WHEN** a sheet opens on a viewport at least 640px wide
- **THEN** it appears as a centered, fully rounded dialog with its height
  bounded by the viewport, rather than a panel attached to the bottom edge

#### Scenario: Opening a sheet animates its entrance
- **WHEN** a FAB opens a sheet on a phone
- **THEN** the panel rises gently into place as the backdrop fades in
- **AND WHEN** a sheet opens on a wide viewport
- **THEN** the centered dialog fades and rises gently without moving its anchor
- **AND WHEN** reduced motion is requested
- **THEN** the sheet and backdrop appear without a visible animation

#### Scenario: Confirmation dialogs use bottom sheets
- **WHEN** the user triggers a destructive confirmation such as removing a
  participant
- **THEN** the confirmation is presented as a bottom sheet with confirm and
  cancel actions

### Requirement: Push and pop screen transitions with reduced-motion support
Opening an event SHALL animate the event workspace in with a push transition,
and returning to Events SHALL animate it out with a pop transition. When the
user agent reports `prefers-reduced-motion: reduce`, screen transitions SHALL be
disabled and screens SHALL change instantly.

#### Scenario: Opening an event pushes the screen
- **WHEN** the user opens an event and reduced motion is not requested
- **THEN** the event workspace enters with the push transition

#### Scenario: Going back pops the screen
- **WHEN** the user activates back from an open event and reduced motion is not
  requested
- **THEN** the event workspace leaves with the pop transition

#### Scenario: Reduced motion disables transitions
- **WHEN** the user agent reports `prefers-reduced-motion: reduce`
- **THEN** opening and leaving an event applies no transition animation

### Requirement: Native viewport and safe-area layout shell
The app shell SHALL use a `viewport-fit=cover` viewport, SHALL pad its edges
using `env(safe-area-inset-*)`, SHALL size full-height layouts with `100dvh`,
and SHALL set `overscroll-behavior: none` on the shell to suppress
scroll-chaining and rubber-band effects.

#### Scenario: Viewport requests full-bleed layout
- **WHEN** the document loads
- **THEN** the viewport meta tag includes `viewport-fit=cover`

#### Scenario: Shell respects safe-area insets
- **WHEN** the app shell renders on a device with display cutouts or a home
  indicator
- **THEN** the top app bar and bottom tab bar are padded by the corresponding
  `env(safe-area-inset-*)` values

#### Scenario: Full-height layout uses dynamic viewport units
- **WHEN** the app shell is rendered
- **THEN** its full-height sizing uses `100dvh` rather than `100vh`

#### Scenario: Overscroll chaining is suppressed
- **WHEN** the user scrolls past the end of a screen
- **THEN** the shell applies `overscroll-behavior: none` and the page does not
  scroll-chain

### Requirement: Centered phone-width column on large screens
On viewports wider than 480px the app SHALL render as a horizontally centered
column constrained to a maximum width of 480px, so the layout keeps phone
proportions on tablets and desktops.

#### Scenario: Wide viewport centers the app
- **WHEN** the viewport is wider than 480px
- **THEN** the app shell is horizontally centered and does not exceed 480px in
  width

#### Scenario: Narrow viewport fills the width
- **WHEN** the viewport is 360px wide
- **THEN** the app shell fills the available width

### Requirement: Minimum touch targets and no hover-only functionality
Every interactive element SHALL present a touch target of at least 44x44 CSS
pixels. No functionality SHALL be reachable only through hover; any action
revealed on hover MUST also be reachable by tap and keyboard focus.

#### Scenario: Interactive elements meet the touch target minimum
- **WHEN** any button, tab, link, or row action is rendered
- **THEN** its touch target measures at least 44px in both width and height

#### Scenario: Actions are available without hover
- **WHEN** the user interacts using touch only
- **THEN** every action is reachable without a hover state

### Requirement: Mobile-friendly input attributes
Text and numeric inputs SHALL render at a font size of at least 16px so iOS does
not zoom on focus, and money amount fields SHALL set `inputmode="decimal"` to
surface a decimal keypad.

#### Scenario: Inputs avoid iOS zoom
- **WHEN** an input is focused on iOS
- **THEN** the input's computed font size is at least 16px and the page does not
  zoom

#### Scenario: Amount fields use a decimal keypad
- **WHEN** an amount field is rendered
- **THEN** the field sets `inputmode="decimal"`

### Requirement: Expense errors appear at their fields
The create and edit expense forms SHALL validate fields after they lose focus,
reveal every remaining error on submit, and show each error beneath its field.
Beneficiary selection and custom-share total errors SHALL appear beneath the
Split Between controls. Correcting a value SHALL clear its displayed error
without clearing unrelated errors. Invalid expenses SHALL never be saved.

#### Scenario: An expense field loses focus
- **WHEN** the user leaves an invalid amount or tip field
- **THEN** that field is marked invalid and its error appears directly beneath it
- **AND WHEN** the value becomes valid
- **THEN** its error disappears

#### Scenario: Several expense fields are invalid
- **WHEN** the user submits with an empty concept, invalid amount and tip, and
  no beneficiaries
- **THEN** all four errors appear simultaneously below their respective fields
  or Split Between group, and no expense is saved

#### Scenario: A custom share is invalid
- **WHEN** the user leaves an invalid individual custom-share amount
- **THEN** its error appears directly beneath that amount
- **AND WHEN** the shares are valid individually but do not add up to the total
- **THEN** the difference remains visible and a total error appears below Split Between

### Requirement: Standardized mobile list rows
Lists of participants, expenses, and settlement transfers SHALL render as
full-width rows separated by dividers. Each row SHALL show a leading icon, its
primary text, and a trailing amount where an amount applies. Rows that open a
detail or an editing sheet SHALL display a trailing chevron affordance.

#### Scenario: Rows are full width with separators
- **WHEN** an expense list is rendered
- **THEN** each expense is a full-width row separated from its neighbors by a
  divider

#### Scenario: Rows show leading icon and trailing amount
- **WHEN** an expense row is rendered
- **THEN** the row shows a leading Font Awesome icon and the formatted amount at
  the trailing edge

#### Scenario: Tappable rows show a chevron
- **WHEN** a row opens a detail or editing sheet when tapped
- **THEN** the row renders a trailing chevron icon

#### Scenario: Non-tappable rows omit the chevron
- **WHEN** a row has no tap action
- **THEN** no chevron is rendered

#### Scenario: Transfer payment is a checked row
- **WHEN** transfers appear in Settlement
- **THEN** each transfer uses one full-width checkbox row with its amount and
  a trailing, touch-sized selection indicator on the same line
- **AND WHEN** the row is activated by touch or keyboard
- **THEN** its native checkbox updates paid status and the trailing indicator
  shows only a high-contrast check when paid, with no circle or outline in
  either state, without changing the transfer plan
- **AND WHEN** the event is archived
- **THEN** the paid indicator remains visible but the row cannot be changed

#### Scenario: Participant deletion uses the same swipe action
- **WHEN** an editable participant without associated expenses is swiped left
- **THEN** the row reveals the same red, white-icon Delete button used by
  expenses and activating it opens the existing removal confirmation
- **AND WHEN** the focused participant row receives Left Arrow
- **THEN** Delete is available to keyboard users
- **AND WHEN** the participant is a payer or beneficiary of an expense
- **THEN** the explanation remains visible and swiping cannot reveal Delete
- **AND WHEN** the event is archived
- **THEN** participant rows have no deletion gesture or action

#### Scenario: Expense deletion is revealed from the row
- **WHEN** an editable expense is swiped left
- **THEN** the row follows the gesture and settles to reveal a touch-sized
  red Delete button with a white trash icon and visible label at its trailing edge
- **AND WHEN** the focused row receives Left Arrow
- **THEN** the same Delete button becomes available to keyboard users
- **AND WHEN** the user swipes right, taps the open row, or presses Escape
- **THEN** the Delete button closes without changing the expense
- **AND WHEN** the row is tapped while closed
- **THEN** the existing edit sheet opens
- **AND WHEN** an event is archived
- **THEN** its expense rows expose no destructive action

#### Scenario: Event actions live behind the row
- **WHEN** a user taps an Events list row
- **THEN** that event opens without a separate Open button beneath the row
- **AND WHEN** a mouse or touch tap moves slightly without completing a swipe
- **THEN** the row still opens the event rather than swallowing the click
- **AND WHEN** an open event row is swiped left or receives Left Arrow while focused
- **THEN** Rename, Archive, and a red Delete action are revealed at the trailing edge
- **AND WHEN** an archived event row is revealed
- **THEN** Restore and Delete are available, but Rename is not
- **AND WHEN** the user swipes right, taps a revealed row, or presses Escape
- **THEN** the actions close without opening or changing the event
- **AND WHEN** Delete is activated
- **THEN** the existing confirmation sheet is shown before removal

### Requirement: Domain behavior is unchanged
This change SHALL be presentation-only. Splitting, balance, settlement,
persistence, sharing, and PDF export behavior SHALL remain exactly as specified
by the existing capabilities, and all existing automated tests SHALL continue to
pass without modification of their expectations.

#### Scenario: Domain modules are untouched
- **WHEN** the mobile app shell is implemented
- **THEN** no requirement in `expense-tracking`, `group-management`,
  `settlement`, `event-management`, or `settlement-pdf-export` changes

#### Scenario: Existing tests still pass
- **WHEN** the test suite is run after the change
- **THEN** all pre-existing tests pass with unchanged assertions

