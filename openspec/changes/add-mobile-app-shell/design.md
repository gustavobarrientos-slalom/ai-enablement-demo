## Context

Split currently renders as a single centered `max-w-md` column: a top header
with back/share/theme actions, a segmented top tab bar, and inline forms that
push content down. It is responsive but visually a web page. The product is used
on phones, one-handed, in social settings.

Constraints that shape this design:

- **No router.** GitHub Pages has no server-side fallback, so navigation stays
  tab- and state-based. Transitions must be simulated in-place, not via route
  animation.
- **No new dependencies.** Tailwind + Font Awesome Free only; no animation or
  sheet libraries.
- **Domain purity.** `src/domain` and the store must not change. This is a
  presentation-layer change end to end.
- **Every requirement needs a test**, and tests run in jsdom via Vitest, where
  layout, `dvh`, `env()`, and media queries are not really evaluated.

## Goals / Non-Goals

**Goals:**

- A shell that reads as a native mobile app: bottom tabs, top app bar,
  bottom-anchored primary actions, bottom sheets, push/pop transitions.
- Safe-area-aware, `100dvh`, non-overscrolling layout, centered at 480px max on
  wider screens.
- Accessible and touch-correct: 44px targets, no hover-only affordances, 16px+
  inputs, decimal keypad for amounts.
- Installable to the home screen via a manifest that works under the GitHub
  Pages base path.

**Non-Goals:**

- Offline support, service workers, background sync, or push notifications.
- Gesture-driven sheet dragging, swipe-back, or velocity-based physics.
- Any change to splitting, balances, settlement, persistence, sharing, or PDF
  output.
- Desktop-optimized layouts; wide screens intentionally keep phone proportions.

### Shared control language

The app-bar Share control uses the same unfilled icon-button treatment as
adjacent controls, with its accessible name and minimum touch target retained.

Keep the centered shell at desktop widths and reuse the same controls in the
mobile sheet and the wide-screen dialog. CSS component classes provide filled
underlined fields, filled/tonal/outlined actions, circular icon actions, selected
chips, compact checkboxes with 44px hit targets, and list cards. Theme tokens
drive both light and dark selected surfaces; native input, button, checkbox,
and select semantics remain intact. Focus, invalid, and disabled states are
explicit, and the existing reduced-motion rule covers control transitions.
Tip and Split Between are full-width segmented pills with equal-width options,
not separate chips; their existing radiogroup roles and checked states remain.
The outer track carries a subtle outline and inset depth; segments are connected
without gaps. A selected segment uses the existing accessible primary/on-primary
pair with slight elevation, while inactive segments keep quiet text and a
visible hover/focus treatment. This avoids squeezing three labels on 360px
screens with extra icons. Keep the track inset at 2px and segment horizontal
padding at 6px so the connected pill stays compact without reducing its 44px
touch targets.
Use a single positioned track highlight driven by the selected index, so it
translates between equal-width segments rather than crossfading two fills.
Buttons retain their radio semantics and stay on top of the decorative,
pointer-events-none highlight. The existing reduced-motion CSS disables the
transform transition when requested.
Reuse the same segmented pill for the Events filters. A shared component
renders the track and options; expense choices retain radiogroup/radio
semantics, while Events retains a group of pressed buttons. The selected
text, focus, and highlight styling apply to both selection states.
Text fields place their associated labels within the tinted field, centered
while empty and floated above content on focus or once populated. Native
selects always show their labels above their values. Expense fields validate
after blur, with all remaining errors revealed on submit; errors clear as
values are corrected. Put each error below its field, and put beneficiary and
share-total errors below the Split Between group. Retain the domain/store
submission check as the final authority and the disabled unbalanced custom
split action. The bottom underline and label reflect error/focus state.
Narrow custom-share amounts use the same filled underline
without an internal label so the value fits beside participant names.
Labeled text fields use a blank native placeholder solely for
`:placeholder-shown`; the accessible `<label>` is the only visible empty-state
text. Animate its top position, transform, size and color on focus and blur.
Focus styling applies to pointer and keyboard focus alike; the compact
custom-share field keeps its numeric placeholder.

## Decisions

### Shell composition: a dedicated `AppShell` layout primitive

Introduce `src/components/shell/AppShell.tsx` owning three slots: `appBar`,
scrollable `content`, and `bottomBar`. The shell is a `100dvh` flex column with
`overscroll-behavior: none`; only the content slot scrolls.

*Why:* centralizes safe-area, viewport, width-clamp, and scroll rules in one
place so individual screens cannot drift. *Alternative considered:* applying
these classes per screen — rejected as unmaintainable and impossible to test
once.

### Bottom tab bar keeps the existing tablist semantics

`TabBar` keeps `role="tablist"` / `role="tab"` / `aria-controls` and the exported
`TAB_IDS`/`TabId` contract; only its markup and position change, plus per-tab
Font Awesome icons added to `src/ui/icons.ts`.

*Why:* existing `TabBar` tests and the disabled-tab behavior (Expenses and
Settlement locked until the group is valid) keep working unchanged, satisfying
the "tests unchanged" requirement. *Alternative:* `role="navigation"` with
links — rejected; it would break existing tests and there are no URLs to link
to.

### Bottom sheet built on native `<dialog>`

`src/components/shell/BottomSheet.tsx` wraps `<dialog>` with
`showModal()`/`close()`, giving free focus trapping, `Escape` handling, and an
`::backdrop`. Backdrop dismissal is implemented by comparing the click target to
the dialog element. A visible close button sits in the sheet header.

The native dialog and its fixed-overlay fallback portal to `document.body`.
This keeps their fixed viewport positioning independent of the transformed
push/pop screen and the shell's clipped scroller. The sheet's scrollable body
has a dynamic-viewport height limit and bottom padding including the safe-area
inset plus a regular touch margin, so the submit button stays accessible.
At `sm` and wider, the same modal is centered vertically and horizontally,
with rounded corners and a maximum height that leaves viewport margins.
The native dialog and fallback overlay use the same breakpoint and width,
while narrow screens retain bottom-sheet positioning and safe-area padding.
The shared panel animates on entry (short rise and fade on phones, smaller rise
and fade in centered dialogs); the backdrop fades in for native and fallback
paths. Animation stays on the inner panel rather than the positioned `<dialog>`
so the desktop centering transform remains intact. Reduced-motion CSS removes
the entrance animation, and dismissal remains immediate.

*Why:* native modality and focus management with zero dependencies; jsdom
supports `<dialog>` well enough for assertions on open/close. *Alternatives:* a
portal + manual focus trap (more code, more bugs) or Radix/Headless UI (new
dependency, disallowed).

### Motion via CSS classes with a single reduced-motion gate

Push/pop use CSS keyframe classes (`animate-push-in`, `animate-pop-out`) defined
in `tailwind.config.js`. A `usePrefersReducedMotion()` hook reads
`(prefers-reduced-motion: reduce)` through `matchMedia` and, when reduced, the
shell applies no animation class at all — rather than relying solely on a CSS
`@media` override.

*Why:* making the gate a JS-observable decision lets a test assert "no animation
class applied" deterministically in jsdom, where CSS media queries are not
evaluated. The CSS `@media (prefers-reduced-motion: reduce)` block is kept as
defense in depth for real browsers. *Alternative:* CSS-only — correct in
browsers, untestable here.

### Pop transition needs an exit hold

The shell tracks an `exiting` screen in local component state, renders the
still-active event with `animate-pop-out`, and calls `closeEvent()` on
`animationend` (or immediately when motion is reduced). The outgoing screen
cannot be interacted with during the transition.

*Why:* keeping the event active for the short exit animation preserves the
existing store-backed screen data. Closing it immediately would blank the
outgoing Group, Expenses, and Settlement panels while they animate away. The
store remains unaware of animation state.

### Safe area, dvh, and the 480px clamp

`index.html` gets `viewport-fit=cover`. `src/index.css` defines
`--safe-top/right/bottom/left` from `env(safe-area-inset-*)`, consumed by
Tailwind spacing utilities via `tailwind.config.js` theme extension. The shell
uses `min-h-dvh`, `mx-auto`, and `max-w-[480px]`.

*Why:* a token layer means components reference named spacing instead of raw
`env()` strings, and the values degrade to `0px` where unsupported.
*Alternative:* inline `style` with `env()` per component — verbose and
unenforceable.

### Dedicated dock for primary actions

The Events, Group, and Expenses screens use an accessible circular plus-icon
FAB at the bottom right. `AppShell` reserves enough space below the content
scroller for that FAB, with a separate height for screens with bottom tabs.
`PrimaryAction` floats in this reserved region without placing a full-width
button over the list. Settlement retains only the tab-bar-height dock; the
Events screen has no tab bar. Creating an event opens a bottom sheet instead
of leaving a form beside the heading. The FAB portals to `document.body` so
the animated workspace's transform and content scroller cannot clip or
reposition its fixed anchor.

### Coordinated theme palette

Light mode uses a warm off-white canvas with white cards and indigo actions;
dark mode uses layered navy surfaces and a pale indigo action color. Divider
tokens are intentionally quieter than interactive borders, which keep their
high contrast for input recognition. The existing contrast tests enforce text,
border, and status legibility; the PWA theme color follows the updated dark
surface.

### Theme color as a side effect of the existing theme hook

`useTheme` gains one effect that writes the resolved theme's surface color into
`<meta name="theme-color">`. Colors come from a new `THEME_COLORS` map in
`src/ui/theme.ts`, which the manifest's `theme_color` mirrors.

*Why:* single source of truth for the color; no duplication between CSS,
manifest, and meta tag. The manifest value is static (light), while the meta tag
is dynamic.

### Manifest is generated, not hand-maintained

`public/manifest.webmanifest` is emitted by a small `predev`/`prebuild` step
so `scope`, `start_url`, and icon paths are prefixed with the same `base`
constant that `vite.config.ts` uses. The base value is exported from a shared
module consumed by both. Vite substitutes `%BASE_URL%` in the manifest and
Apple icon links in `index.html`.

*Why:* a hand-written manifest silently breaks when deployed to a project
subpath — the most likely failure mode of this change. A shared constant makes
it testable: a unit test asserts every manifest URL starts with the base.
*Alternative:* hardcode `/split/` — brittle if the repo is renamed.

### List rows as a shared `ListRow` component

`src/components/shell/ListRow.tsx` renders leading icon, primary/secondary text,
trailing amount, and an optional chevron, and switches between `<li>` and a
`<button>`-wrapped row depending on whether `onSelect` is provided. Dividers come
from `divide-y` on the list container.
Removable participant rows use the same trailing red Delete reveal as expenses,
retaining their confirmation sheet. The existing `canRemoveParticipant` check
controls whether the swipe action is supplied: payers and beneficiaries retain
their associated-expenses explanation but cannot swipe to Delete. Read-only
archived rows also have no reveal.
Editable expense rows place one red, white-icon Delete button in a trailing
reveal area behind the row. The surface tracks a horizontal left swipe, then
settles open; a right swipe, tap on the open row, or Escape closes it. Tapping
the closed row continues to edit without a duplicate Edit control. The
focused row also reveals Delete on Left Arrow, so keyboard access does not
depend on swiping. Vertical scroll gestures remain available, and reduced-motion
settings suppress the snap transition. Archived expense rows remain read-only.
Events use the same row swipe track with three touch-sized trailing actions
(Rename, Archive, Delete) for open events and two (Restore, Delete) for archived
events. The reveal width scales with action count; Delete remains red and all
actions retain accessible names. The row opens the event on tap, replacing the
redundant Open button and second action line. The existing rename and delete
sheets remain unchanged.
Only capture the pointer once horizontal movement passes the swipe threshold;
capturing on pointer-down retargets ordinary clicks to the row wrapper in
browsers, preventing its inner Open button from receiving them.
Settlement transfers use a single label-backed row instead of a second
checkbox line. A native checkbox spans the entire row for touch and keyboard
interaction; a trailing 44px space shows only a colored check when paid,
without an outline or circular fill when unpaid. The accessible transfer label, archived disabled
state, and persisted paid-transfer state remain unchanged.

*Why:* guarantees the chevron-only-when-tappable and 44px-height rules hold
everywhere from one implementation with one set of tests.

### Touch targets and inputs enforced by shared classes plus a lint-style test

A `min-h-11 min-w-11` (44px) base is applied through shared button/row classes,
and inputs get a shared `text-base` (16px) class. Amount inputs set
`inputMode="decimal"`. A test renders each screen and asserts every
`button`/`a`/`input` carries the minimum-size class, and that amount inputs
expose `inputmode="decimal"`.

*Why:* jsdom cannot measure pixels, so the contract is asserted at the class and
attribute level, which is the thing actually under our control.

## Risks / Trade-offs

- **jsdom cannot verify real layout** (safe areas, `dvh`, 44px measurements,
  animation) → assert the observable contract instead: class names, attributes,
  meta tag contents, and hook decisions; verify visual correctness manually on a
  device once.
- **`<dialog>` and `::backdrop` support and jsdom gaps** → `showModal` is
  polyfilled in `src/test/setup.ts`; the sheet degrades to a fixed-position
  overlay if `showModal` is unavailable.
- **Bottom tab bar + mobile keyboard overlap** when a sheet input is focused →
  sheets render above the tab bar and the tab bar is hidden while a sheet is
  open, so the keyboard never covers navigation the user needs.
- **Fixed bars reduce vertical space on 360px-tall-ish viewports** → content
  area is the only scroller and gets bottom padding equal to the tab bar plus
  safe inset, so nothing is permanently occluded.
- **Manifest base-path regressions on rename** → single shared base constant,
  covered by a test asserting all manifest URLs are base-prefixed.
- **Scope creep into domain code** while restyling screens → task list keeps
  `src/domain` and `src/store` explicitly out of scope; a full test run with
  unmodified expectations is the gate.
- **`overscroll-behavior: none` disables pull-to-refresh** on Android — accepted;
  the app has no remote data to refresh.

## Migration Plan

1. Land the shell primitives (`AppShell`, `BottomSheet`, `ListRow`, hooks) with
   tests, unused by screens.
2. Switch `App.tsx` to the shell and move `TabBar` to the bottom.
3. Convert screens one at a time: Group, Expenses, Settlement, Events.
4. Add manifest, icons, and meta tags last; verify install on a real device
   against the deployed Pages URL.

Rollback is a straight revert — no persisted data, schema, or storage-key change
is involved, so reverting cannot strand a user's stored events.

## Open Questions

- The Events screen now uses a bottom-right "Create event" FAB and a bottom
  sheet for the name form, following user feedback on the inline control.
- Should the bottom tab bar hide on scroll to reclaim space? Deferred — fixed
  and always visible is the specified behavior.
