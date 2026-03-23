# Mobile Shell Requirements

This note captures the mobile-specific shell and scrolling behavior requested
for the site during the March 2026 visual-performance pass.

## Scope

- Applies to iPhone-class mobile browsers, especially recent iOS Safari and
  iOS Chrome with translucent browser chrome / liquid-glass effects.
- Concerns the shared site shell: hero, compact header, top spill, bottom
  spill, section surfaces, and the resume route.

## Top Spill

- The area visible behind the top browser chrome must use the same moving blue
  shell texture as the hero.
- That top spill must also carry the same darkening treatment as the hero so
  it does not appear as a lighter flat blue.
- Hero content itself must not bleed into the top browser chrome. Only the
  shell background may appear there.
- The compact header should remain visually opaque; content should not be
  readable underneath it.

### Implementation

- **Browser chrome tinting:** `<meta name="theme-color" content="#142d43">`
  in `index.html` tells iOS Safari what color to use for the status bar and
  toolbar. The value is `--shell-hero-base` (#2c678c) composited through
  `--sidebar-overlay` (rgba(8,18,32,0.68)).
- **Canvas / overscroll color:** In the mobile media query (`css/main.css`),
  `html` gets `background-color: #142d43` (the same darkened hero blue) so
  that iOS rubber-band overscroll at the top reveals a matching color instead
  of the dark page background. `body` keeps `--mobile-page-bg` (#0d1117) to
  cover section content areas.
- **Fixed spill element:** `body::before` (`css/main.css`, mobile media query)
  is a `position: fixed` pseudo-element at the top of the viewport with the
  darkened blue texture (`--sidebar-overlay` gradient over `--shell-bg-image`).
  It covers `height: var(--mobile-shell-spill-h)` and sits at `z-index: 0`
  behind `#app` (`z-index: 1`). This provides the textured background behind
  the compact header after the hero scrolls away.
- **Hero element:** `.topbar` (`css/main.css`, mobile media query) carries
  the shell texture directly and inherits `.topbar::before` (desktop rule)
  which applies `--sidebar-overlay` as a darkening overlay. It has
  `padding-top: var(--safe-top)` so the background extends into the safe area
  while content sits below it.
- **Compact header opacity:** `.sticky-header::before` applies
  `--sidebar-overlay` as an overlay, and the header's own shell texture
  background ensures content beneath it is not readable.

## Bottom Spill

- The bottom of the page must not bleed the moving shell texture.
- The bottom browser-chrome spill should continue the active page surface:
  dark on `about`, `github`, `resume`, and `portfolio`; light on `greece`.

### Implementation

- **Section backgrounds:** Each `.section` (`css/main.css`, mobile media
  query) has `background: var(--clr-bg)` (#0d1117 dark). `#section-greece`
  overrides this with `background: #f5f0e8` (light). These opaque backgrounds
  cover the shell texture so it never bleeds at the bottom.
- **Section min-height:** Sections use
  `min-height: calc(100dvh - var(--bar-h) - var(--safe-bottom))` to fill the
  viewport, ensuring the section surface is what the bottom browser chrome
  sees.
- **Body background:** `body` retains `background-color: var(--mobile-page-bg)`
  (#0d1117) on mobile, so areas below sections (if any) stay dark rather than
  showing the shell blue.

## Header Behavior

- On mobile, once the hero is collapsed, the compact header must stay pinned
  to the top of the page.
- The hero must not be able to scroll past the top in iOS Chrome.
- The collapsed header should not become translucent.
- Navigation actions should land in a collapsed state for consistency.

### Implementation

- **Hero collapse detection:** `js/main.js` — `updateHeroVisibility()` listens
  to the `scroll` event and computes a `--compact-progress` (0–1) based on
  how far `#topbar` has scrolled out of view. At progress >= 0.995 the hero is
  considered hidden.
- **Fixed header switch:** When the hero is hidden, `app--mobile-header-fixed`
  is toggled on `#app`, which makes `.sticky-header` `position: fixed` at
  `inset: 0 0 auto` with `z-index: 30`.
- **Compact row reveal:** `.topbar-compact-wrap` height animates from `0` to
  `var(--bar-h)` via `calc(var(--bar-h) * var(--compact-progress))`.
  `.topbar-left` and `.topbar-compact-social` fade in via opacity and
  translateY tied to the same progress variable.
- **Document flow scrolling:** On mobile, `html, body` use `overflow-y: auto`
  and `.app` / `.content` use `overflow: visible` so the page participates in
  normal document-level scrolling, allowing Safari to collapse its browser
  chrome.
- **Navigation collapse:** `navigate()` in `js/main.js` scrolls to
  `topbarEl.offsetHeight` after a section switch so the hero is already
  dismissed and the compact header is visible.

## Resume Route

- The resume route should always use the compact header state on mobile.
- The native PDF viewer should start below the compact header rather than
  underneath it.
- Mobile users must be able to zoom normally in the PDF viewer.
- The initial PDF view should default to a fit mode.

### Implementation

- **Forced compact state:** `navigate()` adds `app--resume-compact` to `#app`
  on the resume route, which hides `.topbar` entirely
  (`display: none !important`) and forces the sticky header into its compact
  state with full opacity and `padding-top: var(--safe-top)`.
- **PDF offset:** `.app.app--mobile-header-fixed #section-resume .resume-wrap`
  gets `margin-top: var(--mobile-fixed-header-h)` so the iframe starts below
  the fixed header.
- **PDF sizing:** `#section-resume` uses
  `height: calc(100dvh - (var(--bar-h) * 2) - var(--safe-bottom))` (or the
  fixed-header variant) to fill the remaining viewport below the header.

## Testing Notes

- Chrome desktop emulation is useful for validating scroll geometry, route
  transitions, and pinned-header behavior.
- Chrome desktop emulation is not a reliable representation of the exact top
  browser-chrome spill seen on a real iPhone, so on-device verification is
  still required for final polish.
- The `#142d43` theme-color / canvas color is a computed flat approximation of
  the textured darkened hero. It may need on-device tweaking if the texture's
  average brightness differs noticeably.
