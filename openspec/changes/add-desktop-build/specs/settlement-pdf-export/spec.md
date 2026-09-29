## MODIFIED Requirements

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
