## 1. Theme Model and Bootstrap

- [x] 1.1 Add a typed theme preference model (`light`, `dark`, `system`) plus helpers to resolve effective theme from OS preference and invalid storage fallbacks.
- [x] 1.2 Add an inline bootstrap script in `index.html` that reads persisted preference, resolves effective mode, and applies/removes the root `dark` class before React mounts.
- [x] 1.3 Add unit tests for preference resolution defaults, invalid stored values, and effective theme mapping.

## 2. Runtime Theme State and Header Control

- [x] 2.1 Add theme preference persistence in app state/localStorage and restore it on startup.
- [x] 2.2 Implement runtime theme application logic that keeps preference and effective theme separate and updates live on `prefers-color-scheme` changes when preference is `system`.
- [x] 2.3 Add a header theme control using Font Awesome Free `circle-half-stroke`, `sun`, and `moon`, with deterministic cycling across `system`, `light`, and `dark`.
- [x] 2.4 Add UI/unit tests for control behavior, icon rendering by preference, persistence across reload, and system-change updates.

## 3. Tokenized Styling and Accessibility

- [x] 3.1 Configure Tailwind class-based dark mode and define semantic color tokens for backgrounds, text, borders, and interactive states.
- [x] 3.2 Refactor app screens (Events home, Group, Expenses, Settlement, tab bar, forms, empty states, badges) to consume shared tokens instead of hardcoded component colors.
- [x] 3.3 Add coverage and checks to verify WCAG AA contrast requirements for text/icons/controls in both light and dark themes.

## 4. PDF Export Theme Contract and Validation

- [x] 4.1 Update PDF export rendering path to always use light-theme styling regardless of active UI theme or system preference.
- [x] 4.2 Add tests proving dark-mode UI exports a light-styled PDF and that the export path does not depend on DOM theme class.
- [x] 4.3 Run targeted Vitest suites and production build to verify no initial theme flash behavior, theme persistence, and stable export behavior.
