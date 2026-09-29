## Why

Split only ships as a GitHub Pages site. Some users want an installable app that
works offline and saves exports where they choose. Tauri 2 can wrap the same
React bundle as a small native app. The browser-only calls (downloads,
clipboard, `window.location`) need to go behind a platform boundary first, so
the web and desktop builds can share one codebase and the Pages deploy keeps
working.

## What Changes

- Add a `/src/platform` module that exposes `saveFile(name, bytes)`,
  `copyText(text)` and `getShareBaseUrl()`. It has a web implementation and a
  Tauri implementation, and the app picks one at runtime. UI components and
  other non-platform code no longer call browser download, clipboard or
  location APIs directly.
- Web implementation: `saveFile` starts a browser download, `copyText` uses the
  Clipboard API, and the share base URL is the current page URL.
- Tauri implementation: `saveFile` opens a native "Save as" dialog (dialog
  plugin) and writes the file with the fs plugin. `copyText` uses the clipboard
  plugin. The share base URL is the public GitHub Pages URL, read from a
  build-time environment variable.
- PDF export and "Share link" go through the platform module.
- Opening a shared link only works on the web. The desktop app does not read
  `#share=` payloads and does not register a URL scheme or deep links.
- Vite `base` depends on an environment variable: the repository name for the
  Pages build and `/` for the Tauri build.
- Add a Tauri 2 project (`src-tauri/`) with a stable app identifier, so the
  webview's `localStorage` data survives app restarts.
- Tauri capabilities grant only three things: dialog save, fs write to the path
  the user chooses, and clipboard write-text.
- Add a GitHub Actions workflow that builds Windows, macOS and Linux installers
  when a version tag is pushed. It runs separately from the existing Pages
  `deploy.yml`, which stays as it is.

## Capabilities

### New Capabilities
- `platform-services`: The platform abstraction (`saveFile`, `copyText`,
  `getShareBaseUrl`), its web and Tauri implementations, runtime selection, and
  the rule that UI code only uses this module.
- `desktop-app`: Packaging as a Tauri 2 desktop app. Covers per-target Vite
  `base`, web-only shared-link handling, data persisting across launches,
  least-privilege capabilities, and tag-triggered cross-platform installer
  builds that run separately from Pages.

### Modified Capabilities
- `settlement-pdf-export`: "Export the active settlement as a PDF" now saves
  through the platform `saveFile`. The web build still downloads the file; the
  desktop build shows a native "Save as" dialog.

## Impact

- **Code**: new `src/platform/` (`index.ts`, `web.ts`, `tauri.ts`, types).
  `src/App.tsx` (share and hash import), `src/pdf/downloadSettlementPdf.ts`
  (returns bytes and saves via the platform), `src/lib/clipboard.ts` (moves into
  the web platform), `vite.config.ts`, `pwa-base.mjs` and
  `scripts/generate-manifest.mjs` (base chosen from the environment).
- **New directory**: `src-tauri/` (Rust crate, `tauri.conf.json`,
  `capabilities/default.json`, icons).
- **Dependencies**: `@tauri-apps/api`, `@tauri-apps/plugin-dialog`,
  `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-clipboard-manager`, and dev
  dependency `@tauri-apps/cli`. Rust crates `tauri`, `tauri-plugin-dialog`,
  `tauri-plugin-fs`, `tauri-plugin-clipboard-manager`.
- **CI**: new `.github/workflows/desktop-release.yml`. `deploy.yml` stays as it
  is.
- **Environment variables**: `VITE_SHARE_BASE_URL` (desktop share base). The
  Tauri CLI's `TAURI_ENV_PLATFORM` selects the desktop build target.
