Repository guidance for contributors and coding agents working in this repo.

## Local Development

Production is a plain static site served directly by GitHub Pages. There is no production build step.

For normal development, use the BrowserSync setup in this repo:

```bash
npm install
npm run dev
```

That serves the site on `http://127.0.0.1:8080` with live reload and a whitelist-based route fallback so direct refreshes on `/about`, `/github`, `/resume`, `/portfolio`, and `/greece` work locally without swallowing unrelated paths.

The local server also normalizes trailing-slash SPA routes like `/greece/` back to `/greece`.

For a quick static sanity check, you can still run:

```bash
python3 -m http.server
```

But a plain static server will not emulate direct route refreshes unless it is configured with a fallback.

## Deployment

Push to `master`. GitHub Pages serves the repository contents automatically.

## Architecture

This is a zero-dependency static personal site. Runtime behavior is plain HTML, CSS, and JavaScript. `package.json`'s dependencies are dev-only tooling (BrowserSync for local serving, Playwright for OG image generation, Nunjucks for the greece content template) — nothing is shipped to production or loaded at runtime.

### Content authoring workflow

Prose content for the portfolio and the Greece guide lives under `content/`, separate from the rendering/behavior logic in `js/main.js`:

- `content/portfolio.js` — the `PROJECTS` array and its icon SVG constants (see "Portfolio cards" below). Plain script, loaded via `<script src="/content/portfolio.js">` in `index.html` before `js/main.js`. No build step — edit it and refresh the browser (`npm run dev`).
- `content/greece.njk` (+ `content/macros.njk`) — the Greece guide's prose and card markup, written as a Nunjucks template using macros defined in `macros.njk` (`venue()`, `sight()`, `groupedSight()`, `factList()`, `tipList()`, `chips()`, `otherIslandCard()`, `islandHeader()`/`islandFooter()`). This is a **build-time** template, not runtime. After editing it, run:

  ```bash
  npm run content
  ```

  This regenerates the region of `index.html` between the `<!-- BEGIN GENERATED: greece-content -->` / `<!-- END GENERATED: greece-content -->` markers inside `<main class="gr-main">`. **Never hand-edit `index.html` between those markers** — the next `npm run content` run silently overwrites it. Everything outside the markers (the `.gr-hero` header and `.gr-nav` buttons, which are tightly coupled to the scrollspy logic in `greeceNavInit()`) is still plain hand-written HTML, edited directly as before.

  The render script (`scripts/render-content.js`) fails loudly — refusing to touch `index.html` — if the markers are missing, duplicated, or out of order, and it also rejects a render that would produce a nested `<a>` inside a `.gr-venue`/`.gr-sight` full-card link (see "Greece Guide Link Patterns" below). Preview with `npm run dev`, review the `index.html` diff, then commit the template source and the regenerated `index.html` together — the same manual pattern already used by `npm run og` for OG image generation. There is no CI; nothing regenerates `index.html` automatically.

### Layout system

The app uses a CSS grid layout with two modes controlled by the `app--browsing` class on `#app`:

- Default (`about`): sidebar plus content
- Browsing mode (other sections): topbar replaces the desktop sidebar
- Mobile layout is handled through `@media (max-width: 767px)` overrides

### Navigation and routing

`js/main.js` drives section changes through `navigate(section)`, which:

1. Toggles `app--browsing` on `#app`
2. Swaps active states on the sidebar and topbar navigation controls
3. Shows and hides `<section>` elements via the `.active` class
4. Lazy-loads GitHub repos and lazy-renders portfolio content when first needed
5. Syncs browser history and clean paths like `/portfolio` or `/greece`

Production direct-route support on GitHub Pages is handled by `404.html`, not by server rewrites. The fallback only captures the known personal-site routes:

- `/about`
- `/github`
- `/resume`
- `/portfolio`
- `/greece`

Unknown paths are intentionally left alone so other Pages content under this domain, such as project repos on their own path prefixes, can continue to resolve normally.

Keep local asset references in `index.html` root-relative, not route-relative. Direct loads on nested paths depend on that.

### Portfolio cards

Projects are defined in the `PROJECTS` array in `content/portfolio.js`. Each entry renders through `buildCard()` in `js/main.js`. Cards support nested `subItems`, and expand/collapse uses the `grid-template-rows: 0fr -> 1fr` transition pattern.

To add a project, append a new object to `PROJECTS` (in `content/portfolio.js`) with keys such as `id`, `color`, `icon`, `title`, `subtitle`, `org`, `period`, `tags`, and `bullets`. Optional keys include `links` and `subItems`. `bullets` (and subItem `content`) are inserted as raw HTML, so inline `<strong>`/`<em>` works; every other field is escaped.

### Email obfuscation

The email address in `js/main.js` is ROT13-encoded to reduce scraping. It is decoded at runtime and injected into:

- `#email`
- `#email-topbar`
- `#email-topbar-compact`

### Styling

Design tokens live in `:root` in `css/main.css`.

The shell and hero treatment are controlled by the shell theme variables:

- `--shell-hero-base`
- `--shell-hero-accent`
- `--shell-divider`
- `--shell-bg-image`
- `--shell-bg-size`

The sidebar, topbar, and sticky header use the moving `img/background-blue.png` texture directly. Do not rely on CSS blend-mode tinting for shell color, since Safari renders it inconsistently.

### Greece Guide Link Patterns

The Greece guide (authored in `content/greece.njk`, rendered into `index.html` by `npm run content`) uses two different link patterns that should not be mixed:

- `.gr-venue` and `a.gr-sight` are full-card anchors, produced by the `venue()` and `sight(href=...)` macros in `content/macros.njk`. Do not place another `<a>` anywhere inside their `name`/`desc` arguments. Nested anchors are invalid HTML and browsers will reparse the markup in inconsistent ways. `scripts/render-content.js` scans the rendered output and fails the build if it finds one anyway.
- `.gr-inline-link` is only for prose, list items, fact rows, and other non-clickable containers (e.g. inside a `tipList()`/`factList()` item, or in a plain `<p class="gr-p">` paragraph).
- If one row needs multiple destination links, keep the row itself non-clickable and use the `groupedSight(name, desc, links)` macro (`.gr-sight--grouped` with child `.gr-sight-links`/`.gr-sight-link`) instead of nesting anchors.
- When a card is already the link target, keep secondary place mentions in that card as plain text instead of adding more anchors.
