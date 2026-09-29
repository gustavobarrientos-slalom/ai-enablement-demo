## 1. Setup

- [x] 1.1 Add npm deps `@tauri-apps/api`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-clipboard-manager` and dev dep `@tauri-apps/cli` (v2)
- [x] 1.2 Add npm scripts `tauri`, `desktop:dev` (`tauri dev`), `desktop:build` (`tauri build`)
- [x] 1.3 Add `VITE_SHARE_BASE_URL` typing to `src/vite-env.d.ts`

## 2. Platform module

- [x] 2.1 Create `src/platform/types.ts` with the `Platform` interface (`saveFile(name, bytes: Uint8Array)`, `copyText(text): Promise<boolean>`, `getShareBaseUrl(): string`)
- [x] 2.2 Create `src/platform/web.ts`: Blob + anchor download with URL revoke, and `copyText` moved from `src/lib/clipboard.ts` (Clipboard API + legacy fallback). `getShareBaseUrl` returns origin + pathname
- [x] 2.3 Create `src/platform/tauri.ts`: dialog `save({ defaultPath, filters })` → fs `writeFile`, return early on `null`. Clipboard-manager `writeText` returns `true`/`false`. `getShareBaseUrl` reads `import.meta.env.VITE_SHARE_BASE_URL`
- [x] 2.4 Create `src/platform/index.ts`: `platformKind` via `isTauri()`, lazy cached `import('./web' | './tauri')`, exported `saveFile`, `copyText`, `getShareBaseUrl`
- [x] 2.5 Move `src/lib/clipboard.test.ts` to `src/platform/web.test.ts` and add tests for web `saveFile` (anchor download name, revoke) and `getShareBaseUrl` (drops query/hash)
- [x] 2.6 Add `src/platform/tauri.test.ts` with `vi.mock`'d plugins: chosen path writes exact bytes, cancel writes nothing and does not throw, clipboard success/failure, share base from env
- [x] 2.7 Add `src/platform/index.test.ts`: web selected without Tauri globals (no Tauri module loaded), Tauri selected with `globalThis.isTauri`

## 3. Route callers through the platform

- [x] 3.1 Change `buildShareUrl` to `buildShareUrl(baseUrl, payload)` and update `src/lib/shareUrl.test.ts`
- [x] 3.2 Update `src/App.tsx` share action to use platform `copyText` + `getShareBaseUrl`. Delete `src/lib/clipboard.ts`
- [x] 3.3 Guard the `#share=` import effect in `src/App.tsx` with `platformKind === 'web'`. Add an `App.test.tsx` case where the desktop platform ignores a valid payload
- [x] 3.4 Refactor `src/pdf/downloadSettlementPdf.ts` into `exportSettlementPdf`, which renders the Blob → `Uint8Array` → platform `saveFile`. Keep the dynamic renderer import. Update its tests and the `SettlementTab.tsx` import
- [x] 3.5 Add a `SettlementTab` test: a desktop cancel (saveFile resolves without writing) shows no export error
- [x] 3.6 Add a source-scan test: no `navigator.clipboard`, `execCommand`, `createObjectURL`, or `@tauri-apps/` outside `src/platform/` (non-test files)

## 4. Build target and Vite base

- [x] 4.1 Change `pwa-base.mjs` to export `isDesktopBuild(env)` and `resolveBasePath(env)` (`/` when `TAURI_ENV_PLATFORM` is set, else `/ai-enablement-demo/`). Update `pwa-modules.d.ts` typings
- [x] 4.2 Use `resolveBasePath()` in `vite.config.ts` and `scripts/generate-manifest.mjs`
- [x] 4.3 In `vite.config.ts`, throw a descriptive error for desktop builds when `VITE_SHARE_BASE_URL` is missing or not an absolute `https:` URL (extract a testable `assertDesktopEnv(env)`)
- [x] 4.4 Update `src/pwa.test.ts` with base resolution tests for both targets and share URL validation (missing fails on desktop, ignored on Pages)
- [x] 4.5 Check that `npm run build` still outputs assets under `/ai-enablement-demo/`

## 5. Tauri project

- [x] 5.1 Scaffold `src-tauri/` (Tauri 2): `Cargo.toml` with `tauri`, `tauri-plugin-dialog`, `tauri-plugin-fs`, `tauri-plugin-clipboard-manager`. Register the plugins in `src/lib.rs`/`main.rs`
- [x] 5.2 Configure `tauri.conf.json`: `identifier` `com.gustavobarrientos.split`, `productName` `Split`, `frontendDist` `../dist`, `devUrl`, `beforeDevCommand`/`beforeBuildCommand` npm scripts, window min width 360, bundle icons from `public/icons`, no deep-link/fileAssociations
- [x] 5.3 Create `src-tauri/capabilities/default.json` for window `main` with exactly `dialog:allow-save`, `fs:allow-write-file`, `clipboard-manager:allow-write-text`
- [x] 5.4 Add `src/desktopConfig.test.ts`: the capability permission set equals exactly those three. The identifier is `com.gustavobarrientos.split`. No deep-link plugin in `Cargo.toml`/config
- [x] 5.5 Add `src-tauri/target` and `src-tauri/gen` to `.gitignore`

## 6. CI

- [x] 6.1 Create `.github/workflows/desktop-release.yml` triggered on `push: tags: ['v*']` and `workflow_dispatch`, with its own concurrency group and `permissions: contents: write`
- [x] 6.2 Matrix `ubuntu-22.04`, `windows-latest`, `macos-latest` (universal target). Install Linux WebKitGTK deps. Set up Node 20 + Rust. `npm ci`. `npm run test:run`
- [x] 6.3 Run `tauri-apps/tauri-action@v0` with `tagName`, `releaseDraft: true`, and `VITE_SHARE_BASE_URL: ${{ vars.SHARE_BASE_URL }}`
- [x] 6.4 Confirm `.github/workflows/deploy.yml` is unchanged and still only triggers on `main`/dispatch

## 7. Verification

- [ ] 7.1 `npm run typecheck` and `npm run test:run` pass
- [ ] 7.2 Manual desktop smoke test: export PDF via Save as (save and cancel), share link copies the Pages URL, data persists after relaunch
- [x] 7.3 Update `AGENTS.md` with the desktop commands and the platform-module rule
