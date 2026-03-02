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

- [ ] DOM: move `#topbar` + `.sticky-header` inside `#content`
- [ ] CSS: `#content` mobile — `overflow-y: auto; scroll-snap-type: y proximity`
- [ ] CSS: `#topbar` mobile — block element, remove flex-child rules
- [ ] CSS: `.sticky-header` mobile — `position: sticky; top: 0; scroll-snap-align: start`
- [ ] CSS: sections mobile — `position: static; display: block/none`
- [ ] CSS: resume section — explicit `height: calc(100dvh - …)` for iframe
- [ ] JS: remove `updateHeaderCollapse` + scroll listener + rAF clamp
- [ ] JS: IntersectionObserver on `#topbar` for compact-row toggle
- [ ] JS: `navigate()` — reset `content.scrollTop` + handle resume
- [ ] JS: remove wheel/touch forwarding (no longer needed; sections don't scroll)
