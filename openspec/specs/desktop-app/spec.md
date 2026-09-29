# desktop-app Specification

## Purpose
TBD - created by archiving change add-desktop-build. Update Purpose after archive.
## Requirements
### Requirement: Vite base is selected per build target
The Vite `base` and the web manifest paths SHALL come from the build environment. When the Tauri CLI sets `TAURI_ENV_PLATFORM`, `base` SHALL be `/`. Otherwise `base` SHALL be `/<repository-name>/` for the GitHub Pages build.

#### Scenario: Pages build uses the repository base
- **WHEN** the build runs without `TAURI_ENV_PLATFORM`
- **THEN** the resolved `base` is `/ai-enablement-demo/`

#### Scenario: Desktop build uses the root base
- **WHEN** the build runs with `TAURI_ENV_PLATFORM` set
- **THEN** the resolved `base` is `/`

### Requirement: Desktop build requires a share base URL
A desktop build SHALL fail with a clear error when `VITE_SHARE_BASE_URL` is missing or is not an absolute `https` URL. The Pages build SHALL NOT require this variable.

#### Scenario: Missing share URL fails the desktop build
- **WHEN** the build runs with `TAURI_ENV_PLATFORM` set and `VITE_SHARE_BASE_URL` unset
- **THEN** config resolution throws an error naming `VITE_SHARE_BASE_URL`

#### Scenario: Pages build ignores the share URL variable
- **WHEN** the build runs without `TAURI_ENV_PLATFORM` and without `VITE_SHARE_BASE_URL`
- **THEN** config resolution succeeds

### Requirement: Opening shared links is web-only
Only the web build SHALL import an event from a `#share=` URL hash on load. The desktop app SHALL NOT read or clear the URL hash on startup, and it SHALL NOT register a custom URL scheme, deep-link handler, or file association.

#### Scenario: Web imports a shared link
- **WHEN** the web app loads with a valid `#share=` payload in the URL
- **THEN** the shared event is imported as before

#### Scenario: Desktop ignores share payloads
- **WHEN** the app runs with the Tauri implementation selected and the URL contains `#share=<valid payload>`
- **THEN** no event is imported and no import message is shown

#### Scenario: No deep-link configuration
- **WHEN** the Tauri configuration and Rust dependencies are inspected
- **THEN** they have no deep-link plugin and no URL scheme or file association

### Requirement: Desktop data persists between launches
The desktop app SHALL keep events, expenses, payment marks, and theme preference between launches. It SHALL do this with the existing versioned `localStorage` persistence and the same invalid-data handling. The Tauri bundle identifier SHALL stay fixed so the webview storage location does not change between releases.

#### Scenario: Data survives an app restart
- **WHEN** the user creates an event with expenses in the desktop app, quits, and relaunches it
- **THEN** the event and its expenses are restored

#### Scenario: Bundle identifier is stable
- **WHEN** `src-tauri/tauri.conf.json` is inspected
- **THEN** its `identifier` is `com.gustavobarrientos.split`

### Requirement: Tauri capabilities follow least privilege
The Tauri capability configuration SHALL grant only these permissions: dialog save (`dialog:allow-save`), fs write-file (`fs:allow-write-file`) with no static path scope, so writes are limited to paths the user picks in the save dialog, and clipboard write-text (`clipboard-manager:allow-write-text`). It SHALL NOT grant fs read, directory, or remove permissions, dialog open, clipboard read, shell, HTTP, or any other plugin permission.

#### Scenario: Capability file lists exactly the allowed permissions
- **WHEN** the automated test reads every file in `src-tauri/capabilities/`
- **THEN** the combined permission set is exactly `dialog:allow-save`, `fs:allow-write-file`, and `clipboard-manager:allow-write-text`

#### Scenario: Writes outside the user-chosen path are denied
- **WHEN** the app tries to write with the fs plugin to a path the user did not pick in the save dialog
- **THEN** the Tauri runtime rejects the write as out of scope

### Requirement: Installers are built on tags independently of Pages
A GitHub Actions workflow separate from the Pages deploy workflow SHALL build desktop installers for Windows, macOS, and Linux when a `v*` tag is pushed, and attach them to a draft GitHub Release. The Pages deploy workflow SHALL keep its current triggers and outputs. A failing desktop workflow SHALL NOT block the Pages deploy.

#### Scenario: Tag push builds three platforms
- **WHEN** a tag matching `v*` is pushed
- **THEN** the desktop workflow runs a job matrix covering Windows, macOS, and Linux runners, and uploads each installer to a draft release

#### Scenario: Pages deploy unaffected
- **WHEN** a commit is pushed to `main` without a tag
- **THEN** only the Pages deploy workflow runs, builds with the repository `base`, and the desktop workflow does not run

