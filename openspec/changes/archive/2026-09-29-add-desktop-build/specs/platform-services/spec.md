## ADDED Requirements

### Requirement: Platform module exposes a single interface
The application SHALL provide a `/src/platform` module whose public interface includes `saveFile(name, bytes)`, `copyText(text)` and `getShareBaseUrl()`. `saveFile` SHALL accept a filename and a `Uint8Array` and resolve when the save completes or is cancelled. `copyText` SHALL resolve to `true` on success and `false` on failure. `getShareBaseUrl` SHALL return an absolute URL string.

#### Scenario: Module exports the platform functions
- **WHEN** code imports from `/src/platform`
- **THEN** `saveFile`, `copyText` and `getShareBaseUrl` are available and delegate to the active implementation

### Requirement: Implementation is selected at runtime
The platform module SHALL use the Tauri implementation when the app runs inside a Tauri webview and the web implementation otherwise. The check SHALL happen at runtime, not per build. Tauri plugin packages SHALL be loaded through dynamic imports so the web bundle never evaluates them.

#### Scenario: Browser selects the web implementation
- **WHEN** the app runs in a browser without the Tauri runtime globals
- **THEN** platform calls go to the web implementation and no Tauri plugin module is loaded

#### Scenario: Tauri webview selects the Tauri implementation
- **WHEN** the app runs with the Tauri runtime globals present
- **THEN** platform calls go to the Tauri implementation

### Requirement: UI code only uses the platform module for platform services
React components, the store, and PDF export code SHALL NOT call browser download mechanisms (`URL.createObjectURL` with anchor `download`), `navigator.clipboard`, `document.execCommand('copy')`, `window.location` for building share URLs, or any `@tauri-apps/*` package directly. They SHALL use `/src/platform` instead. `/src/domain` SHALL stay free of platform imports.

#### Scenario: No direct platform API usage outside the module
- **WHEN** the automated source check scans `src/` excluding `src/platform/` and test files
- **THEN** it finds no references to `navigator.clipboard`, `execCommand`, `createObjectURL`, or `@tauri-apps/`

### Requirement: Web saveFile triggers a browser download
On the web, `saveFile(name, bytes)` SHALL create a Blob from the bytes, start a browser download with the given filename, and release the object URL afterwards.

#### Scenario: Web save downloads with the given name
- **WHEN** `saveFile('trip-settlement.pdf', bytes)` is called in the web implementation
- **THEN** an anchor with `download="trip-settlement.pdf"` pointing to an object URL for those bytes is clicked, and the object URL is later revoked

### Requirement: Web copyText uses the Clipboard API
On the web, `copyText(text)` SHALL write the text with `navigator.clipboard.writeText`. If the Clipboard API is missing or rejects, it SHALL fall back to the legacy copy method. It SHALL return `false` only when both fail.

#### Scenario: Clipboard API succeeds
- **WHEN** `navigator.clipboard.writeText` resolves
- **THEN** `copyText` resolves to `true` and receives the exact text

#### Scenario: Clipboard API unavailable and fallback fails
- **WHEN** the Clipboard API is unavailable and the legacy copy returns `false`
- **THEN** `copyText` resolves to `false`

### Requirement: Web share base URL is the current page URL
On the web, `getShareBaseUrl()` SHALL return the current page's origin plus pathname, without its query string or hash.

#### Scenario: Share base ignores query and hash
- **WHEN** the page URL is `https://example.github.io/ai-enablement-demo/?x=1#share=abc`
- **THEN** `getShareBaseUrl()` returns `https://example.github.io/ai-enablement-demo/`

### Requirement: Tauri saveFile uses a native Save as dialog
In Tauri, `saveFile(name, bytes)` SHALL open the dialog plugin's save dialog with `name` as the default filename. If the user picks a path, it SHALL write the bytes there with the fs plugin. If the user cancels, it SHALL resolve without writing anything and without raising an error.

#### Scenario: User chooses a location
- **WHEN** `saveFile('trip-settlement.pdf', bytes)` is called and the dialog returns `/Users/ana/Documents/trip-settlement.pdf`
- **THEN** the fs plugin writes exactly those bytes to that path

#### Scenario: User cancels the dialog
- **WHEN** the save dialog returns `null`
- **THEN** no file is written and `saveFile` resolves without error

### Requirement: Tauri copyText uses the clipboard plugin
In Tauri, `copyText(text)` SHALL write text with the clipboard-manager plugin's `writeText`. It SHALL resolve to `true` on success and `false` if the plugin rejects.

#### Scenario: Clipboard plugin write succeeds
- **WHEN** `copyText('https://example/#share=abc')` is called in the Tauri implementation
- **THEN** the clipboard plugin's `writeText` receives that exact string and `copyText` resolves to `true`

#### Scenario: Clipboard plugin write fails
- **WHEN** the clipboard plugin's `writeText` rejects
- **THEN** `copyText` resolves to `false`

### Requirement: Tauri share base URL comes from configuration
In Tauri, `getShareBaseUrl()` SHALL return the public GitHub Pages URL from the build-time `VITE_SHARE_BASE_URL` environment variable. Share links copied from the desktop app SHALL therefore open the web app.

#### Scenario: Desktop share link points at GitHub Pages
- **WHEN** `VITE_SHARE_BASE_URL` is `https://owner.github.io/ai-enablement-demo/` and the user shares an event from the desktop app
- **THEN** the copied link starts with `https://owner.github.io/ai-enablement-demo/#share=`
