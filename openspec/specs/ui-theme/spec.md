# ui-theme Specification

## Purpose
Define the application's persisted theme preference, system color-scheme behavior,
accessible token-based light and dark UI, and light-only settlement PDF exports.
## Requirements
### Requirement: Theme modes and system-follow behavior
The application SHALL support exactly three theme preferences: `light`, `dark`, and `system`, with `system` as the default when no valid preference is stored. When the preference is `system`, the effective UI theme SHALL follow `prefers-color-scheme` and SHALL update live when the OS theme setting changes.

#### Scenario: Default preference is system
- **WHEN** the app starts with no stored theme preference
- **THEN** the selected preference is `system`

#### Scenario: System preference resolves to dark
- **WHEN** the selected preference is `system` and the OS reports `prefers-color-scheme: dark`
- **THEN** the effective app theme is dark

#### Scenario: System preference updates live on OS change
- **WHEN** the selected preference is `system` and the OS color scheme changes from light to dark while the app is open
- **THEN** the effective app theme updates to dark without requiring a page reload

### Requirement: Header theme control with Font Awesome icons
The header SHALL expose a theme control that lets the user change theme preference and SHALL use Font Awesome Free icons to represent the current preference: `sun` for light, `moon` for dark, and `circle-half-stroke` for system.

#### Scenario: Control cycles preferences
- **WHEN** the user activates the header theme control repeatedly
- **THEN** the preference cycles in a deterministic order across `system`, `light`, and `dark`

#### Scenario: Icon reflects current preference
- **WHEN** the current preference is `dark`
- **THEN** the header theme control displays the `moon` icon

### Requirement: Theme preference persistence
The selected theme preference SHALL persist in `localStorage` and SHALL be restored on next load. If the stored value is missing or invalid, the app SHALL fall back to `system`.

#### Scenario: Preference persists across reload
- **WHEN** the user selects `light` and reloads the app
- **THEN** the app restores `light` as the selected preference

#### Scenario: Invalid persisted value falls back safely
- **WHEN** `localStorage` contains an unknown theme value
- **THEN** the app uses `system` and does not crash

### Requirement: No initial theme flash
The app SHALL apply the resolved theme class before React renders by using an inline bootstrap script in `index.html`, so users do not see the wrong theme during initial paint.

#### Scenario: Dark class is applied before app mount
- **WHEN** a dark effective theme is resolved during initial page load
- **THEN** the document has the dark theme class before React mounts

### Requirement: Class-based dark mode with semantic tokens
The UI SHALL use Tailwind class-based dark mode and shared semantic theme tokens for colors. Components MUST NOT hardcode per-component light/dark color values outside the token system.

#### Scenario: Shared tokens drive both themes
- **WHEN** the user switches from light to dark
- **THEN** screens update via tokenized classes without component-specific hardcoded palette overrides

### Requirement: WCAG AA contrast across screens
All app screens and interactive states SHALL meet WCAG AA contrast requirements in both light and dark themes.

#### Scenario: Body text contrast is AA-compliant in light and dark
- **WHEN** body text is rendered on its corresponding background in either theme
- **THEN** the contrast ratio is at least 4.5:1

#### Scenario: Interactive controls remain readable in both themes
- **WHEN** buttons, tabs, inputs, and status labels are viewed in each theme
- **THEN** their text and icon contrast meets WCAG AA thresholds for their size and state

### Requirement: PDF export always uses light theme
Exported settlement PDFs SHALL always render using light-theme styling, independent of the current UI theme or system preference.

#### Scenario: Dark UI still exports light-styled PDF
- **WHEN** the app is currently in dark theme and the user exports the settlement PDF
- **THEN** the generated PDF uses the light-theme visual styling
