# AGENTS.md

Guidance for AI agents working in this repository.

## Project

**Split** — a group expense-splitting web app for events. Participants record
shared expenses, and the app calculates who pays whom so everyone ends up even,
using as few transfers as possible.

No backend, no accounts. Everything runs in the browser.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (with `persist` middleware) |
| Icons | Font Awesome Free via `@fortawesome/react-fontawesome` |
| Tests | Vitest |
| Deploy | GitHub Pages via GitHub Actions |

## Commands

```bash
npm install       # install dependencies
npm run dev       # local dev server
npm run build     # type-check + production build
npm run preview   # preview the production build
npm test          # run Vitest
```

## Architecture

```
src/
  domain/    pure business logic — no UI, no Zustand, no browser APIs
  store/     Zustand store: holds state, calls domain functions
  ui/        English copy, currency formatting, icon registry
  lib/       side-effecting helpers (id generation) kept out of the domain
  components/ React components (presentation + wiring)
```

- **`/src/domain` is pure.** It must not import React, Zustand, or anything
  UI-related. This is where splitting, balance, and settlement algorithms live.
- **The store only holds state.** It calls domain functions; it does not
  reimplement business rules.
- **Derived values are never stored.** Balances and transfers are computed from
  state on demand.

## Hard rules

- **Money is integer cents.** Never use floating-point arithmetic on money.
  Parse, store, and compute in cents; format only at the render boundary.
- **Tabs, not a router.** Client-side routing causes 404s on GitHub Pages, so
  navigation is tab-based within a single page.
- **Vite `base` must equal the repository name** for GitHub Pages to resolve
  assets correctly.
- **Every requirement has at least one automated test.**
- **Font Awesome Free only.** Do not introduce a second icon library.

## Persistence

- Persist to `localStorage` through Zustand's `persist` middleware.
- Use a **versioned storage key**.
- If stored data is invalid or from an unknown version, **discard it and start
  empty** — never crash on bad stored state.

## Localization & UI

- Currency is **MXN**, formatted with the **`es-MX`** locale.
- All user-facing text is in **English**.
- **Mobile-first**, supporting viewports from **360px** and up.

## Workflow

This repo uses [OpenSpec](./openspec/) for spec-driven development. Project
context lives in `openspec/project.md`; specs in `openspec/specs/`; in-flight
changes in `openspec/changes/`. Use the `openspec-*` skills in `.github/skills/`
to propose, apply, verify, and archive changes.
