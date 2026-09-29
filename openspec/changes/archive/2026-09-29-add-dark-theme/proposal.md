## Why

The app currently has a single visual theme, which can be uncomfortable in low-light environments and does not respect user or system color preferences. Adding first-class light/dark/system theming improves accessibility and usability while preserving deterministic exports.

## What Changes

- Add a global theme system with three options: Light, Dark, and System (default), where System follows the OS preference and updates live when that preference changes.
- Add a header theme control using Font Awesome Free icons (`sun`, `moon`, `circle-half-stroke`) to cycle/select the active theme.
- Persist the selected theme preference in `localStorage` and restore it on load.
- Prevent flash of incorrect theme by applying theme class before React renders via an inline script in `index.html`.
- Move app colors to Tailwind theme tokens and enforce class-based dark mode usage instead of per-component hardcoded colors.
- Ensure both themes meet WCAG AA contrast targets across all screens.
- Ensure exported PDFs always render using light-theme styling regardless of app theme.

## Capabilities

### New Capabilities
- `ui-theme`: Manage user-selectable app theme preferences, runtime theme application, and token-based light/dark visual behavior across the UI.

### Modified Capabilities

## Impact

- App shell/header UI, including the theme toggle control and icon usage.
- Early theme bootstrap in `index.html` and persisted settings integration with the existing Zustand storage flow.
- Tailwind and CSS token configuration for class-based dark mode.
- Component styling across Group, Expenses, Settlement, and Events home to use shared tokens and pass contrast requirements.
- PDF export rendering contract to keep document output in light theme regardless of current UI theme.
