## Context

Split is a static React + Vite app deployed to GitHub Pages under
`/ai-enablement-demo/`. Three browser-specific concerns are spread across the
code:

- `src/pdf/downloadSettlementPdf.ts` downloads a Blob with an anchor element.
- `src/lib/clipboard.ts` uses `navigator.clipboard` with an `execCommand`
  fallback.
- `src/App.tsx` builds share URLs from `window.location` and imports events
  from `#share=` on load.

`pwa-base.mjs` hardcodes `VITE_BASE_PATH = '/ai-enablement-demo/'`. Both
`vite.config.ts` and `scripts/generate-manifest.mjs` use it. State persists to
`localStorage` through Zustand `persist` with a versioned key.

The goal is a Tauri 2 desktop build from the same source, without regressing
the Pages build.

## Goals / Non-Goals

**Goals:**
- Put a small platform boundary (`src/platform`) between the UI and
  environment-specific APIs.
- Build and run the same bundle in a browser and in a Tauri 2 webview.
- Keep the Tauri permissions to the minimum needed.
- Produce Windows, macOS and Linux installers from CI when a tag is pushed.

**Non-Goals:**
- Auto-update, code signing or notarization (can come later).
- Deep links, custom URL schemes, or file associations for opening shared
  links in the desktop app.
- Replacing `localStorage` with a Tauri store plugin or file-based storage.
- Mobile (iOS/Android) Tauri targets.
- Changing the Pages deploy workflow.

## Decisions

### 1. Platform module shape
`src/platform/index.ts` exports `saveFile`, `copyText`, `getShareBaseUrl` and a
read-only `platformKind: 'web' | 'desktop'`. Each function is a thin async
facade. On first call it resolves the implementation (`web.ts` or `tauri.ts`)
and caches it. `platformKind` is computed synchronously, so `App.tsx` can skip
the share-import effect on desktop without an `await`.

- *Alternative*: separate entry points per build (`main.web.tsx`,
  `main.desktop.tsx`) chosen by Vite alias. Rejected: it duplicates bootstrap
  code and makes each build's tests diverge. Runtime selection keeps one
  bundle.

### 2. Runtime detection
Use `isTauri()` from `@tauri-apps/api/core`. It checks
`globalThis.isTauri`, which Tauri 2 injects. `@tauri-apps/api/core` is small
and has no side effects. The plugin packages are only loaded inside `tauri.ts`,
which is reached through `import('./tauri')`. That keeps them out of the
web-evaluated path and out of the initial chunk.

- *Alternative*: a build-time flag (`import.meta.env.VITE_TARGET`). Rejected
  as the only check because the requirement asks for runtime selection. A
  build flag also can't catch a desktop bundle opened in a browser.

### 3. Moving existing helpers into the platform module
- `src/lib/clipboard.ts` moves to `src/platform/web.ts` as `copyText`,
  unchanged. Its tests move with it.
- `downloadSettlementPdf` becomes `exportSettlementPdf`. It builds the PDF,
  turns the Blob into a `Uint8Array` (`new Uint8Array(await blob.arrayBuffer())`)
  and calls `saveFile(filename, bytes)`. The renderer's dynamic import stays,
  so the "renderer loads only on export" requirement still holds.
- `buildShareUrl(origin, pathname, payload)` becomes
  `buildShareUrl(baseUrl, payload)`. `App.tsx` passes `getShareBaseUrl()`.
- `saveFile` takes `Uint8Array` (not `Blob`) because the Tauri fs plugin's
  `writeFile` takes `Uint8Array`. Web wraps it in a Blob.

### 4. Tauri saveFile and fs scope
`tauri.ts` calls `save({ defaultPath: name, filters: [...] })` from
`@tauri-apps/plugin-dialog`, then `writeFile(path, bytes)` from
`@tauri-apps/plugin-fs`. In Tauri 2, a path returned by the dialog plugin is
added to the fs plugin's runtime scope automatically. So the capability grants
`fs:allow-write-file` **without** any static `allow` path entries, and writes
only succeed for user-chosen paths. A `null` result (cancel) returns early.

The filter comes from the file extension (PDF → `{ name: 'PDF', extensions:
['pdf'] }`). This keeps `saveFile` generic.

### 5. Capabilities
`src-tauri/capabilities/default.json` targets the `main` window and lists
exactly:
```json
["dialog:allow-save", "fs:allow-write-file", "clipboard-manager:allow-write-text"]
```
No `core:default`. The app does not call window, event, path or app APIs from
JS, and plugin commands only need their own permissions. A Vitest test parses
every JSON file in `src-tauri/capabilities/` and checks this exact set, so any
new permission needs a spec change.

- *Alternative*: `fs:default` or `dialog:default`. Rejected: the defaults
  include read/open permissions the app doesn't need.

### 6. Build target and Vite base
The Tauri CLI sets `TAURI_ENV_PLATFORM` (and other `TAURI_ENV_*` variables)
for `beforeDevCommand` and `beforeBuildCommand` on every OS, so no
`cross-env` dependency is needed. `pwa-base.mjs` becomes:

```js
export const isDesktopBuild = (env = process.env) => Boolean(env.TAURI_ENV_PLATFORM);
export const resolveBasePath = (env = process.env) => isDesktopBuild(env) ? '/' : '/ai-enablement-demo/';
```

`vite.config.ts` and `generate-manifest.mjs` call `resolveBasePath()`. For
desktop builds, `vite.config.ts` also validates `VITE_SHARE_BASE_URL` (it must
be an absolute `https:` URL) and throws a descriptive error otherwise. Both
functions take `env` as a parameter so they can be unit-tested.

- *Alternative*: a custom `SPLIT_TARGET=desktop` variable. Rejected: it needs
  cross-platform env setting in npm scripts and duplicates what the Tauri CLI
  already provides.

### 7. Share base URL on desktop
`VITE_SHARE_BASE_URL` is inlined at build time through `import.meta.env`. CI
sets it to `https://gustavobarrientos-slalom.github.io/ai-enablement-demo/`
(a repository variable, so forks can override it). Desktop share links always
open the hosted web app, which is the only place links are imported.

### 8. Web-only share import
`App.tsx` wraps the hash-import effect in `if (platformKind !== 'web') return;`.
The Tauri config sets no deep-link plugin and no `fileAssociations`. The web
behaviour stays exactly as it is.

### 9. Persistence
The Tauri webview keeps `localStorage` per origin in the app data directory,
which is keyed by the bundle `identifier`. The identifier is fixed at
`com.gustavobarrientos.split` and must never change. The origin is stable per
OS (`tauri://localhost` on macOS/Linux, `http://tauri.localhost` on Windows),
so the existing persist key and migration logic work unchanged. No new storage
code is needed.

### 10. PWA manifest in desktop builds
`index.html` still links `manifest.webmanifest` (generated with base `/`).
It has no effect inside the webview. There is no service worker to disable.

### 11. CI workflow
`.github/workflows/desktop-release.yml` runs on `push: tags: ['v*']` plus
`workflow_dispatch`. It has its own `concurrency` group, so it doesn't share
the `pages` group. Its matrix is `ubuntu-22.04`, `windows-latest`,
`macos-latest` (the macOS job builds universal with `--target
universal-apple-darwin`). Steps:
1. Checkout, set up Node 20, `npm ci`.
2. Set up the Rust toolchain.
3. On Linux, install the WebKitGTK 4.1 dependencies.
4. Run `npm run test:run`.
5. Run `tauri-apps/tauri-action` with `tagName`, `releaseDraft: true`, and
   `VITE_SHARE_BASE_URL` from `vars`.

It needs `permissions: contents: write`. `deploy.yml` is not changed.

## Risks / Trade-offs

- **Changing the bundle identifier loses users' data.** → Record it as a
  constant in the spec and assert it in a config test.
- **WebKitGTK/Linux distro differences** can break `.deb`/`.AppImage` on older
  systems. → Build on `ubuntu-22.04` for a lower glibc baseline.
- **Unsigned installers** trigger Gatekeeper/SmartScreen warnings. → Out of
  scope. Documented in release notes. Signing secrets can be added to
  `tauri-action` later.
- **Dropping `core:default`** may break an API used indirectly by a plugin's
  JS side. → Smoke-test save, copy and restart on each OS before the first
  release. If a core permission turns out to be required, add only that
  specific permission and update the spec.
- **`localStorage` in webviews may be cleared by the OS** under storage
  pressure (mainly WebKit). → Acceptable for this app. A Tauri store plugin is
  a possible follow-up.
- **Lower PDF export test coverage in jsdom for Tauri paths.** → Unit-test
  `tauri.ts` with `vi.mock` for the three plugin modules. Manual desktop smoke
  test.

## Migration Plan

1. Add the platform module and route existing callers through it. The web
   build behaves the same. Ship through the normal Pages deploy.
2. Add `src-tauri/`, the env-driven base, and the capability tests. Pages
   output doesn't change (`base` is still `/ai-enablement-demo/`).
3. Add the release workflow. Push a `v0.1.0` tag to create the first draft
   release.

Rollback: delete the tag/draft release. The Pages deploy doesn't depend on any
desktop artifact.

## Open Questions

- Should macOS ship universal or separate `aarch64`/`x86_64` builds? Default:
  universal.
- Is the bundle identifier `com.gustavobarrientos.split` acceptable, or does
  the org want a different reverse-DNS prefix? This must be settled before the
  first release.
