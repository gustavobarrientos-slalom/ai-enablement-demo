## ADDED Requirements

### Requirement: Share action offers Copy link and Show QR code
While an event is open, choosing the Share action SHALL open a Share sheet with two options: `Copy link` and `Show QR code`. `Copy link` SHALL write the share URL to the clipboard and show `Link copied` on success, exactly as the shared-link behaviour already does. `Show QR code` SHALL open the QR code sheet for the same event.

#### Scenario: Share opens the options sheet
- **WHEN** the user selects Share on an open event
- **THEN** a sheet titled `Share event` shows the buttons `Copy link` and `Show QR code`, and nothing has been copied to the clipboard yet

#### Scenario: Copy link copies and confirms
- **WHEN** the user selects `Copy link` in the Share sheet and the clipboard write succeeds
- **THEN** the clipboard receives the share URL and `Link copied` is shown

#### Scenario: Show QR code opens the QR sheet
- **WHEN** the user selects `Show QR code` in the Share sheet
- **THEN** the QR code sheet opens for the active event

### Requirement: QR code encodes exactly the copied link
The QR code SHALL encode exactly the same string that `Copy link` writes to the clipboard for the same event state, with no added or removed characters and no URL shortening.

#### Scenario: Decoded QR equals the copied URL
- **WHEN** the QR code is generated for an event and its module matrix is decoded by a QR reader
- **THEN** the decoded text is identical to the URL that `Copy link` copies for that event

#### Scenario: QR reflects the current event state
- **WHEN** the user adds an expense and then shows the QR code
- **THEN** the decoded QR text equals the share URL built from the event including that expense

### Requirement: QR code is generated locally
The QR code SHALL be generated in the client with the `qrcode` npm package. Neither the share URL nor any part of the event SHALL be sent to an external service to create or display the QR code, and no remote image SHALL be loaded for it.

#### Scenario: No network request when showing the QR code
- **WHEN** the user shows the QR code while `fetch`, `XMLHttpRequest` and image loads are being observed
- **THEN** no network request is made and the QR code renders as inline SVG

#### Scenario: QR library is loaded on demand
- **WHEN** the app starts and the user opens the Share sheet without choosing `Show QR code`
- **THEN** the `qrcode` module has not been loaded

### Requirement: Error correction level L and capacity fallback
The QR code SHALL use error correction level `L`. If the share URL is too long for any QR version at level `L`, the QR sheet SHALL show `Too much data for a QR code — use the link instead` in place of the code and SHALL still offer a working `Copy link` button.

#### Scenario: Generated code uses level L
- **WHEN** a QR code is generated for any share URL
- **THEN** the `qrcode` package is called with `errorCorrectionLevel: 'L'` and the resulting code reports level L

#### Scenario: URL exceeds QR capacity
- **WHEN** the share URL for an event is longer than a level-L QR code can hold
- **THEN** the QR sheet shows `Too much data for a QR code — use the link instead`, shows no QR image, and shows a `Copy link` button

#### Scenario: Copy link still works after the capacity error
- **WHEN** the capacity message is shown and the user selects `Copy link`
- **THEN** the full share URL is copied and `Link copied` is shown

### Requirement: QR sheet layout and fixed colors
The QR code SHALL be shown in a bottom sheet and rendered at least 240 CSS pixels wide, on viewports down to 360px. It SHALL always use dark modules on a white background, including a white quiet zone of at least 4 modules, whatever the active theme. The event name SHALL appear directly below the code. The code SHALL have an accessible name that includes the event name.

#### Scenario: Minimum rendered size
- **WHEN** the QR sheet is shown on a 360px-wide viewport
- **THEN** the QR image is rendered at least 240px wide

#### Scenario: Dark theme keeps dark-on-white
- **WHEN** the QR sheet is shown while the dark theme is active
- **THEN** the QR background and quiet zone are white (`#FFFFFF`) and the modules are black (`#000000`)

#### Scenario: Event name below the code
- **WHEN** the QR sheet is shown for an event named `Trip to Oaxaca`
- **THEN** `Trip to Oaxaca` is displayed immediately below the QR image, and the image's accessible name is `QR code for Trip to Oaxaca`

### Requirement: Scanning imports like opening the shared link
Scanning the QR code SHALL open the share URL. Opening that URL in the web app SHALL go through the same import flow as opening a shared link: the event is added as a new event and opened, `Event imported` is shown, invalid data shows `This link is invalid`, and the hash is cleared afterwards. The QR code SHALL NOT add a separate import path.

#### Scenario: Scanned URL imports the event
- **WHEN** the web app loads with the URL decoded from a generated QR code
- **THEN** a new event equal to the shared event is created and opened, and `Event imported` is shown

#### Scenario: Desktop QR opens the hosted web app
- **WHEN** the QR code is shown in the desktop app
- **THEN** the decoded URL starts with the configured GitHub Pages share base URL followed by `#share=`
