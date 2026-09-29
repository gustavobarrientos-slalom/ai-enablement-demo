## 1. Layout foundations

- [x] 1.1 Add `viewport-fit=cover` to the viewport meta tag in `index.html`
- [x] 1.2 Define `--safe-top/right/bottom/left` from `env(safe-area-inset-*)` in `src/index.css` and set `overscroll-behavior: none` on `html`/`body`
- [x] 1.3 Extend `tailwind.config.js` with safe-area spacing tokens, the 480px shell max width, and `push-in`/`pop-out` keyframes and animations
- [x] 1.4 Add a `@media (prefers-reduced-motion: reduce)` block in `src/index.css` that zeroes animation and transition durations
- [x] 1.5 Add a base input class providing at least 16px font size and reuse it across existing inputs

## 2. Shell primitives

- [x] 2.1 Create `src/components/shell/AppShell.tsx` with `appBar`, scrollable `content`, and `bottomBar` slots, `min-h-dvh`, safe-area padding, `overscroll-behavior: none`, `mx-auto max-w-[480px]`
- [x] 2.2 Write `AppShell.test.tsx` asserting dvh sizing, width clamp, safe-area padding classes, and that only the content slot scrolls
- [x] 2.3 Create `src/ui/usePrefersReducedMotion.ts` reading `(prefers-reduced-motion: reduce)` via `matchMedia` with live updates
- [x] 2.4 Write `usePrefersReducedMotion.test.ts` covering the reduced and non-reduced cases and live media-query changes
- [x] 2.5 Create `src/components/shell/BottomSheet.tsx` on native `<dialog>` with `showModal`/`close`, header close button, backdrop-click dismissal, accessible dialog name, and a fixed-overlay fallback when `showModal` is unavailable
- [x] 2.6 Polyfill `HTMLDialogElement.showModal`/`close` in `src/test/setup.ts`
- [x] 2.7 Write `BottomSheet.test.tsx` covering open, close-button dismissal, backdrop-tap dismissal, Escape, and dialog role/name
- [x] 2.8 Create `src/components/shell/ListRow.tsx` with leading icon, primary/secondary text, trailing amount, chevron only when tappable, and a 44px minimum row height
- [x] 2.9 Write `ListRow.test.tsx` covering chevron presence/absence, trailing amount rendering, and the minimum touch-target class
- [x] 2.10 Create `src/components/shell/PrimaryAction.tsx` for the bottom-anchored button/FAB positioned above the tab bar with bottom safe-area offset
- [x] 2.11 Write `PrimaryAction.test.tsx` asserting bottom anchoring, safe-area offset, and the 44px minimum target

## 3. Navigation

- [x] 3.1 Add Group, Expenses, Settlement, chevron, and close icons to `src/ui/icons.ts`
- [x] 3.2 Rework `src/components/TabBar.tsx` into a fixed bottom tab bar with icon + label per tab, preserving `role="tablist"`, `aria-controls`, `TAB_IDS`, `TabId`, and disabled-tab behavior
- [x] 3.3 Update `TabBar.test.tsx` with cases for fixed bottom positioning, icon + label per tab, and unchanged selection/disabled semantics
- [x] 3.4 Create `src/components/shell/AppBar.tsx` rendering the title/event name, optional back action, and contextual action slot
- [x] 3.5 Write `AppBar.test.tsx` covering event name display, back action presence and behavior, back action absence on Events, and contextual actions in the bar
- [x] 3.6 Wire `App.tsx` to `AppShell` + `AppBar` + bottom `TabBar`, moving share and `ThemeControl` into the app bar
- [x] 3.7 Implement push/pop screen transitions in `App.tsx` with an `exiting` screen held until `animationend`, applying no animation class when motion is reduced
- [x] 3.8 Add `App.test.tsx` cases for push on open, pop on back, and no animation class under reduced motion

## 4. Screen conversion

- [x] 4.1 Convert `GroupTab.tsx` to `ListRow` rows with separators and a bottom-anchored "Add participant" action
- [x] 4.2 Move the add/edit participant form and the remove-participant confirmation into bottom sheets
- [x] 4.3 Convert `ExpensesTab.tsx` to `ListRow` rows with leading category icon, trailing amount, and chevron, plus a bottom-anchored "Add expense" action
- [x] 4.4 Move `ExpenseForm.tsx` into a bottom sheet and set `inputMode="decimal"` on amount and tip fields
- [x] 4.5 Convert `SettlementTab.tsx` transfer list to `ListRow` rows with trailing amounts
- [x] 4.6 Convert `EventsHome.tsx` event list to `ListRow` rows with chevrons
- [x] 4.7 Update `GroupTab.test.tsx`, `ExpensesTab.test.tsx`, `SettlementTab.test.tsx`, and `EventsHome.test.tsx` for sheet-based forms and row structure without weakening existing assertions

## 5. Touch and input conformance

- [x] 5.1 Apply the shared 44px minimum-target class to every interactive element across screens and remove any hover-only affordance
- [x] 5.2 Add a conformance test rendering each screen and asserting every button, link, and input carries the minimum-target class
- [x] 5.3 Add a test asserting amount fields expose `inputmode="decimal"` and inputs carry the 16px base font class

## 6. PWA installability

- [x] 6.1 Extract the Vite `base` into a shared constant consumed by `vite.config.ts` and the manifest generation
- [x] 6.2 Add `THEME_COLORS` for light and dark to `src/ui/theme.ts` and have `useTheme` write the resolved color into `<meta name="theme-color">`
- [x] 6.3 Write a test asserting the `theme-color` meta tag is set on load and updates when the effective theme changes
- [x] 6.4 Add 192x192, 512x512, maskable, and Apple touch icon PNG assets under `public/`
- [x] 6.5 Generate `manifest.webmanifest` with `name: "Split"`, short name, `display: "standalone"`, base-prefixed `scope`/`start_url`/icon paths, and `theme_color` from `THEME_COLORS.light`
- [x] 6.6 Link the manifest, `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-title`, and `theme-color` meta tags in `index.html`
- [x] 6.7 Write a manifest test asserting display, name, required icon sizes, a maskable icon, theme color, and that every URL is base-prefixed
- [x] 6.8 Write a test asserting no service worker is registered

## 7. Verification

- [x] 7.1 Run `npm test` and confirm all pre-existing tests pass with unchanged expectations
- [x] 7.2 Run `npm run build` and confirm type-check and production build succeed
- [x] 7.3 Confirm `src/domain` and `src/store` are unmodified by this change
- [ ] 7.4 Manually verify on a 360px device and a >480px viewport: safe areas, fixed bars, sheet dismissal, push/pop, reduced motion, and home-screen install from the deployed base path

## 8. Mobile visual feedback

- [x] 8.1 Refresh light and dark palette tokens, list surfaces, selected navigation, and matching PWA theme colors while preserving contrast
- [x] 8.2 Reserve a dedicated opaque action dock above the tab bar so Group and Expenses list rows never sit behind their primary buttons
- [x] 8.3 Test action-dock spacing for editable screens and both palettes' contrast and theme-color consistency

## 9. FAB feedback

- [x] 9.1 Replace the full-width primary action with an accessible circular plus FAB, accounting for bottom tabs and safe areas
- [x] 9.2 Move Events creation from the inline form to a bottom sheet launched by an Events FAB, preserving default-name and validation behavior
- [x] 9.3 Test FAB placement, reserved list space, and event creation and cancellation through the sheet

## 10. Sheet viewport feedback

- [x] 10.1 Portal native and fallback bottom sheets outside transformed screens, constrain height, and protect submit actions with safe-area padding
- [x] 10.2 Cover sheet viewport anchoring and submit visibility contract with a regression test

## 11. Desktop dialog feedback

- [x] 11.1 Center native and fallback dialogs on wide screens with rounded corners and bounded height while retaining mobile sheet positioning
- [x] 11.2 Test both responsive dialog positioning contracts

## 12. Material control feedback

- [x] 12.1 Define shared, theme-aware field, button, chip, checkbox, card, and focus styles for mobile and desktop
- [x] 12.2 Apply the control language across events, group, expenses, settlement, navigation, and dialogs without changing interactions
- [x] 12.3 Cover selected and invalid states, both palettes' contrast, and screen-wide control consistency with automated tests and a production build

## 13. Segmented expense choices

- [x] 13.1 Present Tip and Split Between as single, full-width segmented pills with selected and focus states without changing radio behavior
- [x] 13.2 Verify grouping, selection, touch targets, and production styling

## 14. Segmented pill polish

- [x] 14.1 Give the Tip and Split Between controls a connected, outlined track with a high-contrast filled selection and visible focus at mobile and desktop widths
- [x] 14.2 Cover pill styling and selected-state contrast, and verify expense interactions and production output

## 15. Compact segmented pills

- [x] 15.1 Reduce Tip and Split Between pill padding while preserving 44px targets and legible labels
- [x] 15.2 Verify the compact styling and expense form interactions

## 16. Segmented selection motion

- [x] 16.1 Slide a shared selection highlight between Tip and Split Between options without changing radio behavior or touch targets
- [x] 16.2 Cover selected-index changes and reduced-motion behavior, and verify expense interactions and production output

## 17. Sheet entrance motion

- [x] 17.1 Animate the shared sheet and backdrop on entry for mobile and desktop while keeping position, dismissal, and reduced-motion behavior intact
- [x] 17.2 Cover native and fallback entrance styling and verify FAB-open interactions and production CSS

## 18. Filled form fields

- [x] 18.1 Style text and select fields as filled, top-rounded underlined controls with in-field labels across event, group, and expense forms
- [x] 18.2 Verify floating labels, error placement, focus/disabled states, contrast, and narrow custom amounts without changing validation behavior

## 19. Floating label motion

- [x] 19.1 Make the label the only empty-state text and animate it on focus, input and blur without changing select or compact amount fields
- [x] 19.2 Verify focus and clearing states, reduced motion, and form regression behavior

## 20. Shared segmented pill

- [x] 20.1 Reuse the connected segmented pill for Tip, Split Between, and Events filters while preserving radio and pressed-button semantics
- [x] 20.2 Cover the Events pill selection, filtering, touch targets, and production styling

## 21. Participant row alignment

- [x] 21.1 Position the participant trash action at the right edge, vertically centered alongside the participant text, without changing its disabled behavior
- [x] 21.2 Cover the trailing layout and participant removal interaction with focused tests and a build

## 22. Expense row actions

- [x] 22.1 Move expense Edit and Delete from beneath each row into a trailing swipe-to-reveal area with an accessible actions button
- [x] 22.2 Verify horizontal reveal, vertical-scroll tolerance, edit/delete behavior, touch targets, and production build

## 23. Destructive swipe polish

- [x] 23.1 Remove the redundant Edit and three-dot controls, track the expense row during a left swipe, and reveal a red, white-icon Delete action with keyboard access
- [x] 23.2 Verify swipe tracking, vertical scrolling, accessible deletion, row-tap editing, and the production build

## 24. Participant deletion swipe

- [x] 24.1 Reuse the red Delete reveal on removable participants, preserving confirmation and disabling swipe for participants with associated expenses and archived events
- [x] 24.2 Cover payer and beneficiary restrictions, swipe and keyboard access, and the production build

## 25. Event row contextual actions

- [x] 25.1 Reuse the swipe-reveal row for event Rename, Archive/Restore, and Delete while removing the duplicate Open button
- [x] 25.2 Cover open and archived actions, row navigation, swipe/keyboard access, and existing confirmation flows

## 26. Event row tap regression

- [x] 26.1 Avoid capturing ordinary row taps so the Events row opens the event while preserving swipe actions
- [x] 26.2 Test pointer tap navigation after small movement and verify existing swipe behavior and build

## 27. Settlement checked rows

- [x] 27.1 Replace the second-line transfer checkbox with a full-row native checkbox and trailing checked indicator, preserving archived read-only state
- [x] 27.2 Cover row activation, keyboard and persisted paid state, touch target, and production build

## 28. Minimal transfer check

- [x] 28.1 Remove the trailing circular fill and outline, leaving only a check icon for paid transfers
- [x] 28.2 Verify paid and unpaid visuals, existing checkbox interactions, and production build

## 29. Plain share icon

- [x] 29.1 Replace the app-bar Share pill with an icon-only, unfilled action while retaining its accessible name and touch target
- [x] 29.2 Verify the icon-only appearance and share behavior with targeted tests and a production build

## 30. Expense field validation

- [x] 30.1 Validate each expense field on blur, show simultaneous errors beneath the corresponding controls or Split Between group on submit, and clear them when corrected
- [x] 30.2 Cover blur timing, multiple errors, custom shares, and create/edit submission with focused tests and a production build
