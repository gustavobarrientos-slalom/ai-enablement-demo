# Split

Split is a group expense-splitting web app for events. Participants record shared
expenses, and the app calculates who should pay whom to settle up, minimizing
the number of transfers where possible.

## Technology

- React, Vite, and TypeScript
- Tailwind CSS
- Zustand for application state
- Font Awesome Free icons via `@fortawesome/react-fontawesome`
- Vitest for automated tests
- GitHub Pages deployment through GitHub Actions

## Product and deployment constraints

- Use tabs rather than a client-side router so navigation works reliably on
  GitHub Pages without requiring server-side route fallbacks.
- Configure Vite's `base` to match the repository name for GitHub Pages.
- The app has no backend or user accounts.

## Persistence

- Persist state to `localStorage` using Zustand's `persist` middleware.
- Use a versioned storage key.
- If stored data is invalid or comes from an unknown version, discard it and
  start from empty state instead of crashing.

## Architecture and conventions

- Represent all money as integer cents. Never use floating-point arithmetic for
  monetary calculations.
- Keep business logic in pure functions under `/src/domain`. This module must be
  independent of the UI and Zustand.
- Keep the Zustand store focused on application state and calls to domain
  functions. Compute derived values, including balances and settlement
  transfers, when needed; do not store them.
- Add at least one automated test for every requirement.
- Use icons only from Font Awesome Free sets; do not mix icon libraries.

## Localization and responsive design

- Currency: MXN, formatted using the `es-MX` locale.
- All user-facing UI text must be in English.
- Design mobile-first and support viewport widths from 360px and up.
