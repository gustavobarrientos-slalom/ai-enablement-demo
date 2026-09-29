# settlement-pdf-export Specification

## Purpose
Provide a downloadable snapshot of an event's settlement, including its
participants, expenses, balances, category totals, and paid or unpaid
transfers, without changing the event or requiring a backend.
## Requirements
### Requirement: Export the active settlement as a PDF
The Settlement screen SHALL provide an `Export PDF` button that saves a PDF for the active event through the platform `saveFile` function. The filename SHALL be the slugified event name followed by `-settlement.pdf`. The button SHALL be disabled when the event has no expenses. On the web, the PDF SHALL be downloaded by the browser. On the desktop app, a native "Save as" dialog SHALL open with that filename as the default. Cancelling the dialog SHALL NOT show an error.

#### Scenario: Export downloads a slugified filename
- **WHEN** the user exports the settlement for an event named `Ana's Mexico Trip!` in the web app
- **THEN** the browser downloads a PDF named `anas-mexico-trip-settlement.pdf`

#### Scenario: Desktop export opens a Save as dialog
- **WHEN** the user exports the settlement for an event named `Ana's Mexico Trip!` in the desktop app
- **THEN** a native "Save as" dialog opens with default name `anas-mexico-trip-settlement.pdf`, and the PDF bytes are written to the chosen path

#### Scenario: Cancelling the desktop dialog is silent
- **WHEN** the user cancels the "Save as" dialog
- **THEN** no file is written and no export error is shown

#### Scenario: Export is disabled without expenses
- **WHEN** the active event has no expenses
- **THEN** the `Export PDF` button is disabled and cannot start an export

### Requirement: PDF contains the settlement snapshot
The exported PDF SHALL contain the event name and export date, participants, an expense list with each expense's concept, category, payer, and amount, balances per participant, a category breakdown, and every computed transfer with its paid or unpaid status. The exported values SHALL reflect the active event at the time export is requested.

#### Scenario: Export contains all settlement sections
- **WHEN** an event has participants, categorized expenses, balances, and transfers including both paid and unpaid transfers
- **THEN** the PDF contains the event name and export date, participant list, each expense's concept, category, payer and amount, each participant's balance, category breakdown, and each transfer with its paid or unpaid status

#### Scenario: Export reflects current payment marks
- **WHEN** the user marks a current transfer as paid before exporting
- **THEN** the corresponding transfer is shown as paid in the generated PDF while unpaid transfers remain shown as unpaid

### Requirement: PDF currency formatting matches the UI
Every monetary amount in the PDF SHALL use the same formatted string produced for the UI, including the dollar sign, thousands separator, and two decimal places (for example, `$1,234.56`). Monetary calculations SHALL remain in integer cents until formatting.

#### Scenario: Export formats monetary values consistently
- **WHEN** an expense or balance is 123456 cents
- **THEN** its PDF amount is rendered as `$1,234.56`, matching the UI's `formatCents` output

### Requirement: PDF category icons use SVG paths
Category icons in the PDF SHALL be rendered as SVG path geometry taken from the corresponding Font Awesome Free icon definitions. The PDF SHALL NOT depend on an icon font for category icon rendering.

#### Scenario: Category icon renders from its definition path
- **WHEN** an expense or category breakdown row has a category with a Font Awesome icon definition
- **THEN** the PDF renders that category icon as SVG using the definition's view box and path data

### Requirement: PDF text uses a bundled Unicode font
The PDF renderer SHALL register and use a bundled TTF font for document text rather than the built-in Helvetica font. The font SHALL support the transfer arrow and accented characters used in participant and event names, without requiring a network request at export time.

#### Scenario: Unicode names and transfer arrow render
- **WHEN** the PDF contains a participant named `José` and a transfer from `José` to `Ana`
- **THEN** the accented name and `→` transfer arrow render using the registered bundled font

### Requirement: PDF renderer loads only on export
The application SHALL load `@react-pdf/renderer` and the PDF document module through dynamic imports only after the user requests an export. Visiting or displaying the Settlement screen SHALL NOT load the PDF renderer into the initial application bundle.

#### Scenario: Renderer is deferred until export is requested
- **WHEN** the application starts and the user opens the Settlement screen without exporting
- **THEN** the PDF renderer is not loaded as part of the initial bundle or screen visit

#### Scenario: Export loads the deferred renderer
- **WHEN** the user activates `Export PDF` for an event with expenses
- **THEN** the application dynamically loads the PDF renderer and generates the requested download

