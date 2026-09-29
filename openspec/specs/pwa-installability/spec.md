# pwa-installability Specification

## Purpose
TBD - created by archiving change add-mobile-app-shell. Update Purpose after archive.
## Requirements
### Requirement: Web app manifest for standalone installation
The app SHALL ship a web app manifest linked from `index.html` that declares
`display: "standalone"`, the name "Split", and a short name suitable for a home
screen label, so the installed app launches without browser chrome.

#### Scenario: Manifest is linked from the document
- **WHEN** the document loads
- **THEN** `index.html` contains a `link rel="manifest"` pointing at the app
  manifest

#### Scenario: Manifest declares standalone display
- **WHEN** the manifest is parsed
- **THEN** its `display` field is `standalone` and its `name` is `Split`

### Requirement: Manifest icon set
The manifest SHALL declare PNG icons at 192x192 and 512x512, and SHALL include
at least one icon with `purpose: "maskable"` so adaptive launcher icons render
without letterboxing.

#### Scenario: Required icon sizes are declared
- **WHEN** the manifest is parsed
- **THEN** it declares icons with sizes `192x192` and `512x512`

#### Scenario: A maskable icon is declared
- **WHEN** the manifest is parsed
- **THEN** at least one declared icon has `purpose` containing `maskable`

### Requirement: Theme color matches the active theme
The manifest `theme_color` and the document `theme-color` meta tag SHALL match
the application's active theme surface color. When the effective theme changes
between light and dark, the `theme-color` meta tag SHALL update to the new
theme's color.

#### Scenario: Manifest theme color matches the light theme
- **WHEN** the manifest is parsed
- **THEN** its `theme_color` equals the light theme's app surface color

#### Scenario: Meta theme color follows theme changes
- **WHEN** the effective theme switches from light to dark
- **THEN** the document's `theme-color` meta tag content updates to the dark
  theme color

### Requirement: Apple touch icon and web app meta tags
The document SHALL include an `apple-touch-icon` link and the Apple web app meta
tags required for a home-screen launch on iOS, including
`apple-mobile-web-app-capable` and `apple-mobile-web-app-title` set to "Split".

#### Scenario: Apple touch icon is present
- **WHEN** the document loads
- **THEN** it contains a `link rel="apple-touch-icon"` referencing an existing
  icon asset

#### Scenario: Apple web app meta tags are present
- **WHEN** the document loads
- **THEN** it declares `apple-mobile-web-app-capable` and
  `apple-mobile-web-app-title` with the value `Split`

### Requirement: Manifest paths respect the GitHub Pages base path
All manifest URLs SHALL resolve under the Vite `base` path so the app installs
and launches correctly from a GitHub Pages project subpath. This covers the
manifest `scope`, `start_url`, and icon paths, together with the manifest and
icon links in `index.html`.

#### Scenario: Scope and start URL use the base path
- **WHEN** the app is built with a Vite `base` of `/<repository-name>/`
- **THEN** the manifest's `scope` and `start_url` are prefixed with that base
  path

#### Scenario: Icon references resolve under the base path
- **WHEN** the built app is served from the GitHub Pages project subpath
- **THEN** every manifest icon URL and the Apple touch icon URL resolve to an
  existing asset

### Requirement: No offline caching
The app SHALL NOT register a service worker or provide offline caching as part
of installability. Installation is limited to manifest-driven standalone launch.

#### Scenario: No service worker is registered
- **WHEN** the app starts
- **THEN** no service worker registration is performed

