# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Local Development

No build pipeline. Open `index.html` directly in a browser, or run:

```
python3 -m http.server
```

## Deployment

Push to `master`. GitHub Pages serves the repo contents automatically.

## Architecture

This is a **zero-dependency static personal site** — no framework, bundler, or package manager.

### Layout system (desktop vs mobile)

The app uses a CSS grid layout with two modes controlled by the `app--browsing` class on `#app`:

- **Default (about page):** `sidebar + content` — sidebar is visible, topbar is hidden
- **Browsing mode (other sections):** topbar replaces sidebar on desktop; topbar is always shown on mobile via `@media (max-width: 767px)` overrides

### Navigation

`js/main.js` drives all navigation via the `navigate(section)` function, which:
1. Toggles `app--browsing` class on `#app`
2. Swaps active states on `.nav-btn` (sidebar) and `.tab` (topbar) buttons
3. Shows/hides `<section>` elements by toggling `.active`
4. Lazy-loads GitHub repos (once) and renders portfolio cards (once) on first visit

### Portfolio cards

Projects are defined in the `PROJECTS` array in `js/main.js`. Each entry renders an expandable card via `buildCard()`. Cards support nested `subItems` (second-level collapsibles). Expand/collapse uses the CSS `grid-template-rows: 0fr → 1fr` animation trick.

**To add a project:** push a new object to `PROJECTS` with keys: `id`, `color`, `icon`, `title`, `subtitle`, `org`, `period`, `tags`, `bullets`. Optional: `links`, `subItems`.

### Email obfuscation

The email address in `js/main.js` is ROT13-encoded to deter scrapers. It's decoded at runtime and injected into both the sidebar (`#email`) and the mobile about header (`#email-mobile`).

### CSS variables

All design tokens are in `:root` in `css/main.css`: `--sidebar-w`, `--bar-h`, `--clr-*`, `--t` (transition duration).
