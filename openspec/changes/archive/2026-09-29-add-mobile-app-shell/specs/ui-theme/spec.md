## MODIFIED Requirements

### Requirement: Header theme control with Font Awesome icons
The top app bar SHALL expose a theme control that lets the user change theme
preference and SHALL use Font Awesome Free icons to represent the current
preference: `sun` for light, `moon` for dark, and `circle-half-stroke` for
system. The control SHALL be rendered as a contextual action in the top app bar
and SHALL present a touch target of at least 44x44 CSS pixels.

#### Scenario: Control cycles preferences
- **WHEN** the user activates the theme control repeatedly
- **THEN** the preference cycles in a deterministic order across `system`,
  `light`, and `dark`

#### Scenario: Icon reflects current preference
- **WHEN** the current preference is `dark`
- **THEN** the theme control displays the `moon` icon

#### Scenario: Control lives in the top app bar
- **WHEN** the app shell is rendered
- **THEN** the theme control appears among the top app bar's contextual actions

#### Scenario: Control meets the touch target minimum
- **WHEN** the theme control is rendered
- **THEN** its touch target measures at least 44px in both width and height

## ADDED Requirements

### Requirement: Cohesive accessible light and dark palettes
The app SHALL use a warm neutral canvas, high-contrast indigo primary actions,
and quiet list dividers in light mode, with coordinated navy surfaces and
lighter indigo primary actions in dark mode. Both palettes SHALL preserve
WCAG AA text contrast and maintain distinct surface, divider, and interactive
border colors.

#### Scenario: Both modes remain legible
- **WHEN** the user switches between light and dark
- **THEN** primary controls, text, status messages, and inputs remain legible
  on their respective backgrounds

### Requirement: Effective theme drives the document theme color
The resolved effective theme SHALL drive the document's `theme-color` meta tag
so installed and browser UI chrome matches the app surface.

#### Scenario: Theme color updates with the effective theme
- **WHEN** the effective theme changes from light to dark
- **THEN** the document's `theme-color` meta tag content is updated to the dark
  theme color

#### Scenario: Theme color is set on load
- **WHEN** the app resolves its effective theme during initial load
- **THEN** the `theme-color` meta tag reflects that theme before user
  interaction

### Requirement: Material-inspired controls across phone and desktop
The app SHALL use the same rounded, touch-sized control language at phone
widths and inside the centered desktop shell: filled text/select fields,
filled primary buttons and FABs, tonal secondary buttons, outlined cancel
buttons, circular icon actions, selected choice chips and navigation pills,
compact checkboxes with 44px targets, and rounded list surfaces. Light and
dark variants SHALL keep selected text legible and retain visible focus,
validation, and disabled states.

#### Scenario: A user opens a form
- **WHEN** the user opens a create or edit dialog at either viewport width
- **THEN** fields, selection controls, and form actions share the same
  Material-inspired styling while retaining their accessible names and states

#### Scenario: Selection and validation remain visible
- **WHEN** a filter, tip, or split mode is selected, or a form field is invalid
- **THEN** the selected control is visually distinct, the invalid field keeps
  its error outline on focus, and both remain usable in light and dark mode

#### Scenario: Tip and split mode use segmented pills
- **WHEN** the expense form is opened on a phone or in a desktop dialog
- **THEN** each Tip and Split Between option group appears as a single rounded
  pill with equal-width touch-sized segments and a distinct selected segment

#### Scenario: Selected segment remains clear in both themes
- **WHEN** a tip or split option is selected in either light or dark mode
- **THEN** it uses a high-contrast filled segment within a connected outlined
  pill, while the remaining segments stay legible and keyboard focus is visible

#### Scenario: Segmented pills remain compact on small screens
- **WHEN** the expense form is opened on a 360px viewport
- **THEN** the pill track uses a compact inset and the equal-width options
  retain at least 44px touch targets without clipping their labels

#### Scenario: Selecting a segment slides the highlight
- **WHEN** the user changes a Tip or Split Between option
- **THEN** a single selected highlight moves smoothly to the newly checked
  option while the radio state updates immediately
- **AND WHEN** reduced motion is requested
- **THEN** the highlight moves without a visible transition

#### Scenario: Events filters reuse the segmented pill
- **WHEN** events exist and the Events screen is shown on a phone or desktop
- **THEN** All, Open, and Archived form a single full-width segmented pill with
  the same sliding highlight and touch-sized options as the expense controls
- **AND WHEN** a filter is selected, the event list updates while the buttons
  retain their pressed states and the selected option remains legible
- **AND WHEN** no events exist, the filter pill is not shown

#### Scenario: Form fields use filled underlined styling
- **WHEN** a form is shown in a mobile sheet or desktop dialog
- **THEN** its text and select fields have a tinted surface, rounded top corners,
  a bottom underline, and a label inside the field
- **AND WHEN** an empty text field is focused or populated
- **THEN** its label moves above the value without hiding the entered text
- **AND WHEN** validation fails
- **THEN** its underline and label show the error color and the existing error
  message appears below the field

#### Scenario: Empty field labels animate without duplicate placeholders
- **WHEN** an empty text field receives focus by touch or keyboard
- **THEN** its single visible label animates from the center to the top and
  the underline takes the focus color without showing a second placeholder
- **AND WHEN** a populated field loses focus
- **THEN** the label remains above the value
- **AND WHEN** the field is cleared and loses focus
- **THEN** the label returns to the center
