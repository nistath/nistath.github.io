# Mobile Scroll Architecture Issue

## Symptom

On the About and GitHub pages in mobile view, the heading at the top of a
section ("Hello!", "GitHub") is visually clipped — partially or fully hidden
above the sticky nav bar — after the user performs a normal scroll gesture.
The user reports it is "impossible not to scroll too much" when scrolling
slowly in Chrome mobile mode.

Screenshot captures `#section-about` at `scrollTop = 51`, `topbarH = 0`
(hero already collapsed), `stickyHeaderH = 113 px`. The `.section-inner`
has 32 px of top padding, placing the "Hello!" heading at section-y = 32.
At scrollTop = 51, the heading is at viewport-y = 32 − 51 = −19 px:
completely above the clipping boundary.

---

## Measurements (from DevTools console)

```
appH:                   687 px   (window.innerHeight)
contentH:               574 px   (#content clientHeight = appH − stickyH)
stickyH:                113 px   (compact row 56 + nav tabs 57)
topbarH:                  0 px   (hero is collapsed)
aboutSecScrollTop:       51 px   ← section has scrolled past threshold
aboutSecScrollHeight:   676 px
aboutSecClientHeight:   574 px   (== contentH; fills #content via inset:0)
sectionInnerOffsetTop:    0 px
aboutSecOverflow:       auto
aboutSecPosition:       absolute
windowInnerWidth:       500 px   (< 767 → mobile CSS applies)
```

MaxScroll for the section = 676 − 574 = **102 px** total travel.
The heading disappears at scrollTop ≥ 32 px.
Current collapse threshold = 10 px; the section ended at 51 px.

---

## Root Cause

### Architecture (as of this writing)

```
.app  [flex column on mobile]
 ├── #topbar .topbar         ← hero (height: clamp(160px,33vh,300px))
 ├── .sticky-header          ← compact row + nav tabs (always visible)
 └── #content .content       ← overflow: hidden; position: relative
      └── .section.active    ← position: absolute; inset: 0; overflow-y: auto
                               THE scroll container on mobile
```

The **section element** is the scroll container. Hero collapse is triggered
by `section.scrollTop > COLLAPSE_THRESHOLD`. This creates a fatal coupling:

1. The only way to dismiss the hero is to scroll the section.
2. Any scroll that dismisses the hero also scrolls the section content.
3. Touch momentum (inertia) inevitably carries scrollTop well past the
   threshold before the finger lifts. At threshold = 10 px, inertia routinely
   drives scrollTop to 40–60 px.
4. Content at the top of the section (heading, padding) is scrolled out of
   view as a side-effect of dismissing the hero.

This is not a threshold-tuning problem; it is structural. Even at
COLLAPSE_THRESHOLD = 1 px, inertia still scrolls 50+ px of content away.

---

## Things Tried (and Why They Failed)

| Attempt | Result |
|---------|--------|
| `COLLAPSE_THRESHOLD: 60 → 10` | Collapse fires sooner, but inertia still carries section to 50 px |
| `rAF clamp loop` on collapse | Prevents bounce, does not prevent content overshoot |
| `EXPAND_THRESHOLD: 15 → 5` | Smaller hysteresis gap, does not address inertia |
| Wheel/touch forwarding from sticky-header | Improves DevTools ergonomics, not the core issue |
| `#content` as scroll container (earlier attempt) | Broke desktop layout; this session reverted to section-based scroll |

---

## Hypotheses

### H1 — Section is the wrong scroll container (confirmed)

The section scroll container ties content position to hero-collapse position.
Any fix that keeps the section as the scroll container and uses scrollTop to
drive hero collapse will suffer from momentum overshoot.

### H2 — Hero should live inside the scroll container, not above it

If the hero is the first child of the scroll container (rather than a flex
sibling above it), scrolling the hero away does **not** move section content.
Content starts at y = heroHeight in the scroll flow. The user can scroll the
hero away and the section content stays anchored at its natural position.

### H3 — CSS `position: sticky` eliminates the need for JS collapse detection

With the hero inside the scroll container and the nav bar having
`position: sticky; top: 0`, the nav sticks automatically when the hero
scrolls out of view. No JS threshold, no collapse event, no momentum mismatch.

### H4 — `scroll-snap` can enforce clean hero-visible / hero-gone states

`scroll-snap-type: y proximity` on the scroll container +
`scroll-snap-align: start` on the sticky nav creates a snap point at
`scrollTop = heroHeight`. Small scroll gestures snap cleanly to either
"hero fully visible" (scrollTop = 0) or "hero fully gone" (scrollTop =
heroHeight), eliminating partial / transitional states.

---

## Proposed Architecture

```
.app  [flex column on mobile]
 ├── .sidebar                    ← desktop only, hidden on mobile
 └── #content .content           ← THE scroll container on mobile
      │                             overflow-y: auto
      │                             scroll-snap-type: y proximity
      ├── #topbar .topbar         ← block element, natural height (≈200 px)
      │                             scrolls away naturally
      ├── .sticky-header          ← position: sticky; top: 0; z-index: 20
      │                             scroll-snap-align: start
      │   ├── .topbar-compact-wrap   shown when hero is not intersecting
      │   └── .topbar-nav            tab buttons
      └── sections (active one only, display: block)
           ← position: static, no overflow-y: auto
```

**Key changes vs current:**
- `#topbar` and `.sticky-header` move **inside** `#content` in the DOM.
- `#content` becomes `overflow-y: auto` on mobile (not `overflow: hidden`).
- Sections become `position: static; display: block/none` — NOT scroll
  containers. The page content scrolls as a single unit inside `#content`.
- `.sticky-header` uses `position: sticky; top: 0` — no JS collapse needed.
- IntersectionObserver on `#topbar` drives compact-row visibility.
- `navigate()` resets `content.scrollTop = 0` on section change.
- Resume section: `content.scrollTo({ top: heroHeight })` to auto-dismiss
  hero and give iframe the full viewport.

**Desktop is unaffected:** `#topbar` and `.sticky-header` are `display: none`
on desktop; `#content`'s `overflow: hidden` keeps section `position: absolute`
clipping correct.

---

## Implementation Status

- [x] DOM: move `#topbar` + `.sticky-header` inside `#content`
- [x] CSS: `#content` mobile — `overflow-y: auto`
- [x] CSS: `#topbar` mobile — block element, remove flex-child rules
- [x] CSS: `.sticky-header` mobile — `position: sticky; top: 0`
- [x] CSS: sections mobile — `position: static; display: block/none`
- [x] CSS: resume section — explicit `height: calc(100dvh - var(--bar-h) * 2)` for iframe
- [x] JS: remove `updateHeaderCollapse` + old scroll listener + rAF clamp
- [x] JS: scroll listener on `#content` for compact-row toggle (IntersectionObserver
      was considered but cannot be used: `html/body/.app` all have `overflow:hidden`,
      which prevents IO from ever firing its initial or subsequent callbacks)
- [x] JS: `navigate()` — reset `content.scrollTop` + handle resume
- [x] JS: remove wheel/touch forwarding (no longer needed; sections don't scroll)

---

## Problems Discovered During Implementation

### P1 — About page hero never collapsed

Short sections (About) don't have enough content to scroll `topbarH` (~244 px) worth.
`maxScrollTop = scrollHeight − clientHeight` was only ~49 px, so the hero threshold
was unreachable.

**Fix:** `min-height: calc(100dvh - var(--bar-h) * 2)` on `.section` guarantees
`maxScrollTop ≥ topbarH` on all sections regardless of content height.

### P2 — IntersectionObserver never fires

IO requires an ancestor with a scrollable overflow context. Every ancestor up the
chain (`html`, `body`, `.app`) has `overflow: hidden`. IO ignores `#content`'s own
scroll and its initial callback never fires.

**Fix:** Replaced IO with a passive `scroll` listener on `#content` in
`updateHeroVisibility()`.

### P3 — CSS scroll-snap overshot due to layout shift

`scroll-snap-type: y proximity` was added as H4 suggested. Snapping worked, but
landed at `scrollTop = 301` instead of `topbarH = 244`. Root cause: the compact row
(`topbar-compact-wrap`) animated from `height: 0` to `height: 56px` while momentum
was still carrying the scroll. The layout shift added 57 px of extra
`contentScrollHeight` mid-scroll, and momentum used that extra room — giving the
snap point an inflated target.

**Fix:** `.topbar-compact-wrap` is now always `height: var(--bar-h)` (56 px) in
the layout. Visibility is toggled via `opacity: 0 → 1` only. No layout shift means
`contentScrollHeight` is constant and momentum cannot exploit extra room.
CSS `scroll-snap` was then removed (JS snap replaced it — see P4).

### P4 — Partial-hero stop left hero half-scrolled

With snap removed, a light flick stopped at e.g. `scrollTop = 120` with the hero
half off screen and the compact row invisible — an awkward intermediate state.

**Fix:** Direction-aware JS snap (`snapHero`). Tracks `_scrollDir` (1 = down, −1 = up)
in the scroll listener. On `scrollend` (Chrome 114+) or a 120 ms debounce fallback,
if `0 < scrollTop < topbarH` the function snaps to `topbarH` (hero gone) when
scrolling down, or `0` (hero visible) when scrolling up.

### P5 — First hero-dismiss still clipped content

Even after constant-height compact row and JS snap, a hard swipe routinely reached
`scrollTop = maxScrollTop = 293 px`. `snapHero` only acts when `0 < st < topbarH`;
at `st = 293 = maxScrollTop` the snap never fires, leaving the "Hello!" heading
several dozen pixels above the sticky nav.

**Failed attempt:** Setting `contentEl.scrollTop = topbarEl.offsetHeight` inside
the `heroHidden !== wasHidden` transition condition. This only fires once (at the
first threshold crossing). On subsequent frames, `wasHidden` is already `true` so
the cap is never re-applied; momentum continues to overshoot.

**Confirmed:** Programmatic `element.scrollTop = N` does not fire `scroll` events
in Chrome (tested: zero scroll events fired after `scrollTop = 999`). During real
touch scrolling the browser fires `scroll` events each animation frame — so the
scroll listener IS called during momentum, but the cap must fire on every frame
above the threshold, not just once.

**Fix:** Move the cap outside the `heroHidden !== wasHidden` guard so it fires on
**every scroll frame** where `heroHidden && st > topbarH`:

```javascript
if (heroHidden && st > topbarH) {
  contentEl.scrollTop = topbarH;
}
```

During touch inertia, Chrome fires `scroll` events every rAF. Setting `scrollTop`
in those handlers does interrupt momentum. The cap holds position at exactly
`topbarH` for as long as momentum would push it higher.

---

## Current Architecture

```
.app  [flex column on mobile]
 ├── .sidebar                    ← display: none on mobile
 └── #content .content           ← THE scroll container
      │                             overflow-y: auto (mobile)
      │                             NO scroll-snap (removed — P3)
      ├── #topbar .topbar         ← block element, natural height (≈244 px)
      │                             scrolls away naturally
      ├── .sticky-header          ← position: sticky; top: 0; z-index: 20
      │   ├── .topbar-compact-wrap   height: var(--bar-h) ALWAYS (opacity toggle)
      │   └── .topbar-nav            tab buttons
      └── .section.active         ← position: static; display: block
                                     min-height: calc(100dvh - var(--bar-h)*2)
                                     NOT a scroll container
```

**JS hero logic in `js/main.js`:**

```javascript
function updateHeroVisibility() {
  var st      = contentEl.scrollTop;
  var topbarH = topbarEl.offsetHeight;
  var heroHidden = st >= topbarH;
  var wasHidden  = stickyHeaderEl.classList.contains('hero-hidden');
  if (heroHidden !== wasHidden) {
    stickyHeaderEl.classList.toggle('hero-hidden', heroHidden);
  }
  // Cap on EVERY frame above topbarH (not just the transition).
  // During touch momentum Chrome fires scroll events each rAF;
  // setting scrollTop here interrupts inertia and holds at topbarH.
  if (heroHidden && st > topbarH) {
    contentEl.scrollTop = topbarH;
  }
}

function snapHero() {
  var st = contentEl.scrollTop;
  var h  = topbarEl.offsetHeight;
  if (st > 0 && st < h) {
    contentEl.scrollTo({ top: _scrollDir >= 0 ? h : 0, behavior: 'smooth' });
  }
}
// scrollend (Chrome 114+) or 120 ms debounce fallback
```

---

## Pending Validation

The scroll cap (P5 fix) was just revised to fire on every frame above `topbarH`
instead of only on the transition. This has NOT yet been tested against real touch
scroll momentum in Chrome mobile DevTools or on-device. The key question:

> Does setting `element.scrollTop` inside a `scroll` event handler actually
> interrupt touch inertia momentum in Chrome for Android / Chrome DevTools mobile
> simulation?

**If yes (expected):** "Hello!" heading stays at the top of the viewport after a
hard swipe; hero dismisses cleanly on all sections.

**If no:** Need to escalate to a `requestAnimationFrame` loop that continuously
resets `scrollTop` until momentum dies (or investigate CSS `scroll-snap`
re-enablement now that layout shift is eliminated).

### Known cosmetic issue

`.topbar-compact-wrap` always occupies `var(--bar-h)` = 56 px even when invisible
(hero visible state). This creates a 56 px empty space between the hero content
and the nav tabs in the sticky header. Not yet complained about by the user but
visible in screenshots. Fix would be to collapse this gap when hero is visible,
while keeping the layout constant during scroll (perhaps with a CSS grid trick or
absolute positioning for the compact row inside the sticky header).
