## Context

The Settlement screen already derives participant balances, a category breakdown, and a transfer plan from the active event. Currency formatting is centralized in `formatCents`, payment marks are derived with `isTransferPaid`, and category icons are Font Awesome Free definitions. PDF rendering adds a separate presentation target without changing event state or settlement calculations.

## Goals / Non-Goals

**Goals:**
- Export a complete, readable snapshot of the active event's settlement.
- Keep PDF-only dependencies and document code out of the initial application bundle.
- Match the app's currency representation and render category icons and Unicode names reliably.

**Non-Goals:**
- Persist generated documents or add a server-side export service.
- Change balance, category, expense, or transfer calculations.
- Allow users to edit PDF content or choose a custom layout.

## Decisions

- **Generate the document with `@react-pdf/renderer`.** Its document primitives provide pagination and downloadable PDF output in the browser. A hand-built PDF or browser print stylesheet would duplicate layout behavior and provide less control over font and vector rendering.
- **Load the renderer and PDF document only from the export action.** Use a dynamic import at the interaction boundary, with the document module and renderer inside the deferred chunk. This keeps PDF code out of the initial bundle while avoiding a renderer load on ordinary Settlement visits.
- **Build a read-only export model from the active event's current state and derived settlement values.** Reuse the existing balance, transfer, category, and currency helpers; resolve payer, participant, and category labels at export time. Store no generated or derived PDF data.
- **Render Font Awesome Free category icons as inline SVG paths.** Read each icon definition's view box and path data and create React-PDF `Svg`/`Path` elements; do not use Font Awesome's font-based React component in the PDF.
- **Register and bundle an OFL-licensed TTF font with the renderer.** Use it for all document text so participant names and the `→` transfer arrow render consistently without relying on Helvetica or fetching a font at runtime.
- **Use the existing `formatCents` output for every monetary value.** Amounts remain integer cents through calculation and are formatted only for display, matching the UI.
- **Create a filename by slugifying the event name and appending `-settlement.pdf`.** Keep filename normalization separate from the visible event name in the document.

## Risks / Trade-offs

- [The renderer and bundled font increase total application assets] → Keep both in a dynamically imported chunk and verify the production build's initial entry does not include the renderer.
- [Browser PDF implementations can differ in font registration and SVG support] → Use React-PDF-supported font and SVG primitives and test accented names, the arrow glyph, and category paths in generated output.
- [Long expense or participant lists may span pages] → Use flowable document primitives and repeated table headings where supported, and verify a multi-page export remains readable.

## Migration Plan

No persisted data or existing exports are migrated. Add the dependency and font asset, implement and test the lazy export path, then verify a production build. Rollback consists of removing the export action and its deferred module; existing event data remains unchanged.

## Open Questions

- Confirm the exact bundled font file and attribution requirements when selecting the asset; the chosen font must be licensed for redistribution and include the required Latin accented characters and arrow glyph.