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

iOS Safari dynamically samples `background-color` from the topmost visible
**real** DOM element to tint the browser chrome. Two critical constraints:

1. Safari ignores `::before` / `::after` pseudo-elements entirely.
2. Safari only detects `position: fixed` (or sticky) elements — it does not
   sample `position: relative` elements like `.topbar` (the hero).
3. Once Safari detects a chrome color, it **locks it in** and does not revert
   when scrolling back. The first sampled color persists for the session.

These constraints drive the multi-layer approach below.

- **`--shell-hero-dark` variable:** Defined in `:root` (`css/main.css`).
  The visual average of the shell texture composited through
  `--sidebar-overlay`, and exact rather than approximate:
  `scripts/render-shell-texture.cjs` generates `img/shell-texture.png` so that
  it averages this value under the overlay, and `--shell-hero-base` is the
  texture's own average so the pre-load flat color matches too. Changing
  `--shell-hero-dark` or the overlay alpha means re-running `npm run texture`;
  `npm run check` fails if the committed texture drifts from its generator.
- **`#mobile-spill` element:** A real `<div>` in `index.html` (before `#app`),
  styled on mobile as `position: fixed; z-index: 9999` covering only
  `height: env(safe-area-inset-top)` — the area behind the status bar. Because
  it is a real fixed element at the highest z-index, iOS Safari always samples
  its `background-color` regardless of scroll position or which section is
  active. It also carries the textured background for liquid-glass browsers
  where the chrome is translucent. Since it only covers the safe-area inset,
  it never obscures page content (the hero's `padding-top: var(--safe-top)`
  already keeps content below this region).
- **Browser chrome tinting:** `<meta name="theme-color" content="#2b4557">`
  in `index.html`. Fallback for the brief moment before the DOM renders and
  Safari begins dynamic sampling.
- **Canvas / overscroll color:** In the mobile media query, `html` gets
  `background-color: var(--shell-hero-dark)` so that iOS rubber-band
  overscroll at the top reveals a matching color. `body` keeps
  `--mobile-page-bg` (#0d1117) to cover section content areas.
- **`body::before` spill:** A `position: fixed` pseudo-element at the top of
  the viewport with the darkened blue texture. It covers
  `height: var(--mobile-shell-spill-h)` at `z-index: 0` behind `#app`
  (`z-index: 1`). This provides the textured background behind the compact
  header after the hero scrolls away. It is NOT used for chrome-color
  sampling (Safari ignores pseudo-elements).
- **Hero element:** `.topbar` on mobile uses
  `background-color: var(--shell-hero-dark)` and a stacked
  `background-image` (`linear-gradient(--sidebar-overlay) + --shell-bg-image`)
  with `animation: bgscroll-overlay`. The desktop `.topbar::before` overlay is
  disabled (`content: none`) so the darkening lives entirely in the background
  stack. `padding-top: var(--safe-top)` extends the background into the safe
  area while content sits below it.
- **Compact header:** `.sticky-header` uses the same stacked-background
  approach as `.topbar`. Its `::before` overlay is likewise disabled.

## Bottom Spill

- The bottom of the page must not bleed the moving shell texture.
- The bottom browser-chrome spill should continue the active page surface:
  dark on `about`, `github`, and `resume`; light on `greece`. Each route's
  surface color comes from `scripts/content/routes.cjs`.

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

- **Hero collapse detection:** `js/main.js` — `updateHeroVisibility()`
  computes a `--compact-progress` (0–1) from how far `#topbar` has scrolled
  out of view. At progress >= 0.995 the hero is considered hidden. Scroll
  events schedule it through `requestAnimationFrame` so it runs at most once
  per frame, and the hero's geometry is cached by `measureHero()` on resize
  rather than measured mid-scroll, which would force a synchronous layout
  between writes to `--compact-progress`.
- **Fixed header switch:** When the hero is hidden, `app--mobile-header-fixed`
  is toggled on `#app`, which makes `.sticky-header` `position: fixed` at
  `inset: 0 0 auto` with `z-index: 30`.
- **Reserving the pinned header's space:** `.app--mobile-header-fixed
  .section.active` adds *both* `padding-top: var(--mobile-fixed-header-h)`
  and the same amount to its `min-height`. Both are required. Everything here
  is `box-sizing: border-box`, so padding inside a `min-height` box insets
  content without adding height; with the padding alone the document shrinks
  by the header's height the moment it pins, the browser clamps the scroll
  position to the smaller maximum, the lower position reads as a lower
  progress, and the header unpins — leaving the hero stuck part-way.
- **Compact row reveal:** `.topbar-compact-wrap` height animates from `0` to
  `var(--bar-h)` via `calc(var(--bar-h) * var(--compact-progress))`.
  `.topbar-left` and `.topbar-compact-social` take their opacity and
  translateY from the same variable. They deliberately carry no CSS
  transition: the variable is already rewritten every frame during the
  scroll, and a transition would chase a target that has moved on, leaving
  the compact row trailing the hero by the transition's duration.
- **Document flow scrolling:** On mobile, `html, body` use `overflow-y: auto`
  and `.app` / `.content` use `overflow: visible` so the page participates in
  normal document-level scrolling, allowing Safari to collapse its browser
  chrome.
- **Navigation collapse:** `navigate()` in `js/main.js` sets
  `shouldCollapseMobileHero = (section !== 'about')` and scrolls to
  `heroMetrics.height` for those sections so the hero is already dismissed
  and the compact header is visible. This applies to all navigation paths:
  explicit tab/sidebar clicks, `popstate` (browser back/forward), and
  direct-route entry (initial bootstrap call). It then calls
  `updateHeroVisibility()` directly rather than dispatching a synthetic
  `scroll` event, which used to wake every other scroll listener on the page.

## Resume Route

- Mobile visitors must be able to read the resume: scroll it, zoom it, and
  see the full page width.
- The route must not overflow the viewport horizontally.
- The route should behave like every other section on mobile.

### Implementation

Mobile browsers do not give an embedded PDF its own scroll or zoom context.
iOS Safari renders it as a single fixed page — pinch-to-zoom acts on the page
viewport instead of the document, and anything wider than the frame is simply
cut off. Android Chrome generally refuses to render one at all. Sizing the
iframe more carefully cannot fix this, and earlier attempts to do so are why
the resume route used to need a forced-compact header and its own viewport
math.

So mobile does not embed the PDF:

- **Two presentations, one section:** `#section-resume` contains both
  `.resume-wrap` (the iframe) and `.resume-handoff` (a card with the resume
  title, a line of explanation, and a link to the PDF). The mobile media
  query hides the first and shows the second. Its wording lives in
  `content/resume.yml` under `mobile`.
- **Handing off:** The card's link is an ordinary `target="_blank"` anchor to
  `pdf_url`, so the file opens as a top-level document in the browser's own
  PDF viewer, which scrolls and zooms normally and fits to width by default.
- **Deferred fetch:** `loadResume()` returns early when
  `matchMedia('(max-width: 767px)')` matches, so phones never download the
  PDF at all. A `change` listener on that query loads the iframe if a window
  is resized past the breakpoint while the resume route is open.
- **No special casing:** Because the route is now ordinary content on mobile,
  `app--resume-compact` and the fixed heights, offsets, and viewport-meta
  handling that supported it are gone. The hero collapses on the resume route
  the same way it does everywhere else.

The `#page=1&view=FitH` fragment on `pdf_url` remains a hint for desktop
browsers. Dropbox's `raw=1` redirect returns a `Location` ending in `#`,
which clears it before the viewer sees it; that is unchanged and cannot be
fixed client-side, since the redirect has no CORS headers. It no longer
affects mobile, where the browser's own viewer picks the fit mode.

## Testing Notes

- Chrome desktop emulation is useful for validating scroll geometry, route
  transitions, and pinned-header behavior. Chrome overscroll shows a brief
  texture-animation seam between the hero and the canvas; this is cosmetic and
  does not reproduce on iOS.
- Chrome desktop emulation is not a reliable representation of the exact top
  browser-chrome spill seen on a real iPhone, so on-device verification is
  still required for final polish.
- iOS Safari dynamically samples `background-color` from the topmost visible
  **real** fixed element — it ignores pseudo-elements and non-fixed elements.
  The `#mobile-spill` div exists specifically for this sampling. Any future
  shell element that appears behind the browser chrome must set its own
  `background-color` to `var(--shell-hero-dark)` and bake the overlay into
  its `background-image` stack.
- Safari locks in the sampled chrome color after the first detection and does
  not revert it on scroll-back. On a fresh load the hero texture may briefly
  show through the rounded chrome edges before the flat color takes over.
  This is expected Safari behavior and cannot be overridden from CSS.
- The `#2b4557` value (`--shell-hero-dark`) is the visual average of
  `img/shell-texture.png` composited through the overlay. To tweak it
  on-device, change that single `:root` variable and re-run
  `npm run texture`, which rebalances the texture against it;
  `js/main.js` syncs `<meta name="theme-color">` from the computed CSS
  variable at startup so there is only one value to change.
