# AGENTS.md

Guidance for AI agents working in this repository.

## Project

**Split** — a group expense-splitting web app for events. Participants record
shared expenses, and the app calculates who pays whom so everyone ends up even,
using as few transfers as possible.

No backend, no accounts. Everything runs client-side: in the browser (GitHub
Pages) or in a Tauri 2 desktop shell wrapping the same web build.

## Stack

| Concern | Choice |
| --- | --- |
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| State | Zustand (with `persist` middleware) |
| Icons | Font Awesome Free via `@fortawesome/react-fontawesome` |
| Tests | Vitest |
| Deploy | GitHub Pages via GitHub Actions |
| Desktop | Tauri 2 (`src-tauri/`), released by `desktop-release.yml` on `v*` tags |

## Commands

```bash
npm install       # install dependencies
npm run dev       # local dev server
npm run build     # type-check + production build
npm run preview   # preview the production build
npm test          # run Vitest

# Desktop (requires Rust)
npm run desktop:dev    # Tauri window backed by the Vite dev server
VITE_SHARE_BASE_URL=https://<owner>.github.io/ai-enablement-demo/ \
  npm run desktop:build  # native installers in src-tauri/target
```

Desktop builds fail fast unless `VITE_SHARE_BASE_URL` is an absolute https URL
(share links must open the hosted web app). `desktop:dev` does not need it;
share links then point at the local dev server.

## Architecture

```
src/
  domain/    pure business logic — no UI, no Zustand, no browser APIs
  store/     Zustand store: holds state, calls domain functions
  ui/        English copy, currency formatting, icon registry
  lib/       side-effecting helpers (id generation) kept out of the domain
  platform/  web vs. desktop (Tauri) adapters: file save, clipboard, share URL
  components/ React components (presentation + wiring)
```

- **`/src/domain` is pure.** It must not import React, Zustand, or anything
  UI-related. This is where splitting, balance, and settlement algorithms live.
- **The store only holds state.** It calls domain functions; it does not
  reimplement business rules.
- **Browser/OS APIs go through `src/platform`.** Outside `src/platform`, do not
  touch `navigator.clipboard`, create download anchors, read
  `window.location` for share links, or import `@tauri-apps/*`; call
  `saveFile`, `copyText`, `getShareBaseUrl` instead. Enforced by
  `src/platformBoundary.test.ts`.
- **Desktop permissions are least-privilege.** The Tauri capability grants only
  `dialog:allow-save`, `fs:allow-write-file`,
  `clipboard-manager:allow-write-text` (checked by `src/desktopConfig.test.ts`).
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
