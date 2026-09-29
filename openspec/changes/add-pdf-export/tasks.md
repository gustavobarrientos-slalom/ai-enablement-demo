## 1. PDF Export Foundation

- [x] 1.1 Add `@react-pdf/renderer` as a dependency and bundle a redistributable TTF font that supports accented Latin characters and the `→` glyph.
- [x] 1.2 Implement filename slugification and a read-only export model using the active event, existing settlement derivations, payment marks, labels, and `formatCents`.
- [x] 1.3 Create the React-PDF document with event/export metadata, participants, expenses, balances, category breakdown, and transfers with paid/unpaid status.
- [x] 1.4 Register the bundled TTF font and render Font Awesome Free category definition paths as React-PDF SVG paths.

## 2. Settlement Integration and Verification

- [x] 2.1 Add the `Export PDF` button to Settlement, disabled when there are no expenses, and dynamically import the renderer/document only after activation.
- [x] 2.2 Add tests for filename slugification, required PDF content and amounts, paid/unpaid status, SVG category paths, and Unicode text/font configuration.
- [x] 2.3 Add UI tests for export availability and disabled empty-event behavior, and verify the production initial bundle excludes the PDF renderer.
- [x] 2.4 Run the relevant Vitest tests and production build; confirm exported amounts match `formatCents` and the PDF downloads with the expected filename.