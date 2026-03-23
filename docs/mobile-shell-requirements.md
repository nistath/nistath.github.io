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

iOS Safari dynamically samples `background-color` from the topmost DOM element
to tint the browser chrome. It ignores `::before` / `::after` overlays. So on
mobile, all shell elements bake the darkening overlay into their
`background-image` stack and set `background-color` to the pre-computed
darkened value (`--shell-hero-dark`, #142d43).

- **`--shell-hero-dark` variable:** Defined in `:root` (`css/main.css`).
  Pre-computed blend of `--shell-hero-base` (#2c678c) through
  `--sidebar-overlay` (rgba(8,18,32,0.68)). Used everywhere iOS may sample
  a `background-color`.
- **Browser chrome tinting:** `<meta name="theme-color" content="#142d43">`
  in `index.html`. Fallback for browsers that respect the meta tag rather
  than dynamic sampling.
- **Canvas / overscroll color:** In the mobile media query, `html` gets
  `background-color: var(--shell-hero-dark)` so that iOS rubber-band
  overscroll at the top reveals a matching color. `body` keeps
  `--mobile-page-bg` (#0d1117) to cover section content areas.
- **Fixed spill element:** `body::before` (`css/main.css`, mobile media query)
  is a `position: fixed` pseudo-element at the top of the viewport with the
  darkened blue texture (`--sidebar-overlay` gradient over `--shell-bg-image`).
  It covers `height: var(--mobile-shell-spill-h)` and sits at `z-index: 0`
  behind `#app` (`z-index: 1`). This provides the textured background behind
  the compact header after the hero scrolls away.
- **Hero element:** `.topbar` on mobile uses
  `background-color: var(--shell-hero-dark)` and a stacked
  `background-image` (`linear-gradient(--sidebar-overlay) + --shell-bg-image`)
  with `animation: bgscroll-overlay`. The desktop `.topbar::before` overlay is
  disabled (`content: none`) so the darkening lives entirely in the background
  stack. `padding-top: var(--safe-top)` extends the background into the safe
  area while content sits below it.
- **Compact header:** `.sticky-header` uses the same stacked-background
  approach as `.topbar`. Its `::before` overlay is likewise disabled. The
  `.app.app--resume-compact .sticky-header` variant receives the same
  treatment.

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
  transitions, and pinned-header behavior. Chrome overscroll shows a brief
  texture-animation seam between the hero and the canvas; this is cosmetic and
  does not reproduce on iOS.
- Chrome desktop emulation is not a reliable representation of the exact top
  browser-chrome spill seen on a real iPhone, so on-device verification is
  still required for final polish.
- iOS Safari dynamically samples `background-color` from the topmost visible
  element — it ignores `::before`/`::after` pseudo-element overlays entirely.
  Any future shell element that appears behind the browser chrome must set its
  own `background-color` to `var(--shell-hero-dark)` and bake the overlay into
  its `background-image` stack. Using a `::before` overlay will cause a
  color mismatch in the Safari chrome area.
- The `#142d43` value (`--shell-hero-dark`) is a computed flat approximation.
  It may need on-device tweaking if the texture's average brightness differs
  noticeably.
