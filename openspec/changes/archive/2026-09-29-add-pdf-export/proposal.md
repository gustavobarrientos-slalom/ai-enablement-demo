## Why

Users need a portable, shareable record of an event's settlement that preserves the expense and payment context without requiring access to the app. Exporting the current settlement as a PDF makes that summary easy to save or share.

## What Changes

- Add an `Export PDF` action to the Settlement screen that downloads a PDF named from the event name.
- Include event and export metadata, participants, expenses, balances, category totals, and transfers with paid/unpaid status.
- Render currency consistently with the UI, category icons as SVG paths, and non-ASCII text with a bundled TTF font.
- Load the PDF renderer only when export is requested, and disable export when the event has no expenses.

## Capabilities

### New Capabilities
- `settlement-pdf-export`: Export the current event's settlement details as a formatted, downloadable PDF.

### Modified Capabilities

## Impact

- Settlement screen UI and its tests.
- A PDF document component and export helper, including lazy loading of `@react-pdf/renderer`.
- Bundled font asset and SVG conversion of Font Awesome Free icon path data.
- Package dependencies and bundle behavior; no persistence or backend changes.