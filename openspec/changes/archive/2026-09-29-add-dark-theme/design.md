## Context

The app uses React + Tailwind with a single visual palette today, and persistence is handled through Zustand `persist` in `localStorage`. Theme behavior must be global and deterministic: it needs to apply before React mount to avoid flash, remain user-overridable, and still honor OS preference when the user chooses System. Existing UI surfaces (Events home, Group, Expenses, Settlement, tabs, forms, empty states, badges) will need tokenized colors to support both themes while maintaining contrast. PDF export is rendered separately and must keep a light-only output independent of UI theme.

## Goals / Non-Goals

**Goals:**
- Introduce three theme modes (`light`, `dark`, `system`) with `system` as the default.
- Apply the correct visual theme before React renders and update live on OS preference changes when in `system` mode.
- Provide a header control using Font Awesome Free `sun`, `moon`, and `circle-half-stroke` icons.
- Persist theme choice in `localStorage` and restore it safely.
- Use Tailwind class-based dark mode with shared semantic tokens instead of per-component hardcoded colors.
- Keep all screens WCAG AA compliant in both light and dark themes.
- Ensure exported PDF rendering always uses light theme styling.

**Non-Goals:**
- Adding per-event or per-user remote theme settings.
- Adding custom color pickers or arbitrary theme variants beyond the three fixed modes.
- Changing settlement or expense business logic.

## Decisions

- **Use a dedicated theme preference key in `localStorage` and keep values constrained to `light | dark | system`.** Invalid persisted values fall back to `system`. This isolates theme preference from other persisted state and keeps migration simple.
- **Apply theme class in `index.html` before app bootstrap.** An inline script reads the stored preference, resolves effective mode (`light`/`dark`) using `matchMedia('(prefers-color-scheme: dark)')` for `system`, and sets the root class immediately. This prevents flash-of-wrong-theme.
- **Represent user preference and effective theme separately.** Preference (`light`/`dark`/`system`) drives control state; effective class (`dark` present or absent) drives rendering. When preference is `system`, subscribe to `matchMedia` changes and update class live.
- **Use Tailwind class-based dark mode and semantic tokens.** Define CSS variables for semantic surfaces/text/borders/emphasis and reference them through Tailwind utility mappings so components consume tokens instead of hardcoded colors.
- **Implement header theme control as a deterministic cycle.** Each activation rotates `system -> light -> dark -> system`, with icon matching current preference (`circle-half-stroke`, `sun`, `moon`). This minimizes UI complexity while satisfying toggle behavior.
- **Bake contrast checks into implementation and tests.** Token pairs for text/background and interactive states are selected to meet WCAG AA for normal text (`4.5:1`) and large text (`3:1`) across all app screens.
- **Force light-theme styling in PDF export rendering.** The PDF renderer receives explicit light tokens (or a `theme='light'` export context) and does not read app DOM theme class, guaranteeing consistent light output regardless of active UI theme.

## Risks / Trade-offs

- [Inline bootstrap script can drift from runtime theme resolver] → Keep a shared preference enum and mirrored logic with focused tests for bootstrap and runtime resolution.
- [Refactoring component colors to tokens may miss edge UI states] → Audit all screens and states (hover, focus, disabled, badges, empty states) and add visual/test coverage.
- [System theme listeners may leak or duplicate handlers] → Register exactly one listener at app-shell level and clean up on unmount.
- [WCAG AA regressions can slip during future style changes] → Centralize tokens and add contrast checks/documented token constraints to reduce ad-hoc color edits.
- [PDF output accidentally follows dark palette if export path reuses UI tokens] → Keep export-specific light token mapping explicit and covered by tests.
