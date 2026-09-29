## Why

Split is used almost entirely on phones while people are out together, but the
current UI is a scrolling desktop-style page with top tabs, inline forms, and
no installability. It feels like a website, not a tool you can pull out at the
table and operate one-handed. Making the shell behave like a native mobile app
reduces friction at the exact moment the app is used.

## What Changes

- Replace the top segmented tabs with a **fixed bottom tab bar** (Group,
  Expenses, Settlement) using Font Awesome icons plus labels.
- Introduce a **top app bar** showing the event name, a back action to Events,
  and contextual actions (share, theme).
- Move primary actions ("Create event", "Add expense", "Add participant") to
  **bottom-right FABs** within thumb reach, with space reserved so scrolling
  lists never sit behind them. Create the event in a bottom sheet.
- Refresh light and dark palettes with warm neutral/navy surfaces, indigo
  primary actions, and quieter list dividers.
- Present forms and confirmation dialogs as **bottom sheets**, dismissible via
  backdrop tap or a close button.
- Add **push/pop screen transitions** when opening and leaving an event, fully
  disabled under `prefers-reduced-motion`.
- Adopt a **native-feeling layout shell**: `viewport-fit=cover`,
  `env(safe-area-inset-*)` padding, `100dvh` full-height layouts,
  `overscroll-behavior: none`, and a centered 480px-max column on wider screens.
- Enforce **44x44px minimum touch targets** and remove any hover-only
  functionality.
- Standardize **mobile-friendly inputs**: minimum 16px font size to prevent iOS
  zoom, `inputmode="decimal"` on amount fields.
- Standardize **list rows**: full-width rows with separators, leading icon,
  trailing amount, and a chevron when the row is tappable.
- Add a **PWA web app manifest** (`display: standalone`, name "Split", 192/512
  and maskable icons, theme color matching the active theme) plus Apple touch
  icon and meta tags. Manifest `scope`/`start_url` respect the GitHub Pages base
  path. No offline caching.
- No domain behavior changes: splitting, balances, settlement, persistence, and
  PDF export keep their existing requirements and tests.

## Capabilities

### New Capabilities
- `mobile-app-shell`: Native-app-like presentation layer — bottom tab
  navigation, top app bar, bottom-anchored primary actions, bottom sheets,
  push/pop transitions, safe-area and viewport layout, touch target and input
  rules, standardized list rows.
- `pwa-installability`: Web app manifest, icon set, Apple touch icon and meta
  tags, theme color, and base-path-aware `scope`/`start_url`.

### Modified Capabilities
- `ui-theme`: The theme control moves into the top app bar, and the resolved
  theme must also drive the PWA `theme_color` / `theme-color` meta tag.

## Impact

- **Code**: `index.html` (viewport, manifest link, Apple meta tags),
  `src/App.tsx` (app bar + screen shell + transitions),
  `src/components/TabBar.tsx` (bottom tab bar with icons),
  `src/components/GroupTab.tsx`, `ExpensesTab.tsx`, `ExpenseForm.tsx`,
  `SettlementTab.tsx`, `EventsHome.tsx` (bottom sheets, FAB, list rows, inputs),
  `src/components/ThemeControl.tsx`, `src/ui/icons.ts`, `src/ui/theme.ts`,
  `src/index.css`, `tailwind.config.js`.
- **Assets**: new `public/` PWA icons (192, 512, maskable) and Apple touch icon;
  `public/manifest.webmanifest`.
- **Build**: `vite.config.ts` base path must be reflected in manifest
  `scope`/`start_url`.
- **Tests**: existing suites stay green; new component tests cover navigation,
  sheets, touch targets, input attributes, and the manifest contract.
- **Dependencies**: none added. Font Awesome Free remains the only icon source.
