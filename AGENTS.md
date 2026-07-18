Repository guidance for contributors and coding agents working in this repo.

## The one rule that matters most

`index.html` and the four route stubs (`github/index.html`,
`resume/index.html`, `portfolio/index.html`, `greece/index.html`) are
**GENERATED FILES**. Never edit them by hand. They are rendered from:

- `content/*.yaml` — all prose and structured content, hand-edited by the
  site owner (often from a phone). Authoring guide: `content/README.md`.
- `build/templates/*.js` — all markup, owned by coding agents.

Change content in `content/`, change markup in `build/templates/`, then run
`npm run build` and **commit the regenerated output together with your
change**. A GitHub Actions workflow (`.github/workflows/build.yml`) also
rebuilds and commits generated pages on pushes to `master`, so content-only
edits made through the GitHub UI deploy themselves.

## Division of labor

The architecture is deliberately split so that a human can always edit
prose without touching code, and an agent can always refactor markup
without touching prose:

- **Human-owned:** `content/*.yaml`. Keep it that way: when adding
  features, put every user-visible string, list, link, and ordering choice
  into content, not into templates.
- **Agent-owned:** `build/` (templates, validation, build), `js/main.js`
  (runtime behavior), `css/` (styling), route stubs config, `404.html`,
  this file.

When you add a new visual element, extend the content schema (a new block
type or key), add validation for it in `build/lib/content.js`, render it in
the template, and document it in `content/README.md` so the owner can use
it. The schema is the contract; keep it small, explicit, and validated.

## Local development

```bash
npm install
npm run dev      # build + watch content/ and build/, serve with live reload
npm run build    # one-shot build (writes index.html + route stubs)
npm run check    # validate content and render without writing files
```

`npm run dev` serves `http://127.0.0.1:8080` with a whitelist-based route
fallback so direct refreshes on `/about`, `/github`, `/resume`,
`/portfolio`, and `/greece` work locally (see `bs-config.js`). A plain
static server (`python3 -m http.server`) still works for sanity checks
because generated files are checked in — but it won't rebuild or handle
route fallbacks.

## Deployment

Push to `master`. GitHub Pages serves the repository contents directly —
there is no production build step at serve time. The build workflow only
regenerates pages when `content/` or `build/` change and commits them back
with `[skip ci]`.

If content fails validation, the build fails, nothing is committed, and
the live site keeps its last good version. Validation errors name the
file, entry path, and problem — keep them that helpful when you add rules.

## Build system layout

```
content/            YAML content + authoring README (human-owned)
build/
  build.js          entry point; deterministic, byte-stable output
  dev.js            build + fs.watch + BrowserSync wrapper
  lib/text.js       esc(), inline-Markdown renderer, map: link shorthand
  lib/content.js    YAML loading + strict validation (path-annotated errors)
  templates/
    page.js         page chrome (head, sidebar, topbar) + section assembly
    portfolio.js    portfolio cards (markup mirror of js/main.js wiring)
    greece.js       Greece guide (all gr-* markup)
    icons.js        pixel-art SVG icons, referenced by name from content
    stubs.js        per-route stub pages + route metadata
```

Templates are plain JS template-literal functions — no template language.
Every piece of content text passes through `esc()` (plain) or `md()`
(inline Markdown: `**bold**`, `*italic*`, `[label](url)`,
`[label](map:Place)`); never interpolate content into markup raw. In
Greece-guide contexts call `md(text, GR)` so prose links get the
`gr-inline-link` class.

### Adding things

- **A portfolio icon:** export a new key from `build/templates/icons.js`
  (white pixel-art shapes, crispEdges rects/lines); content refers to it
  by name. Validation lists available icons in its error message.
- **A Greece body block type:** add it to `BODY_BLOCK_KEYS` +
  `validateBody()` in `build/lib/content.js`, render it in
  `renderBlock()` in `build/templates/greece.js`, document it in
  `content/README.md`.
- **A page/route:** add the section template and wire it in
  `build/templates/page.js`; add the route to `build/templates/stubs.js`,
  `js/main.js` (`SECTION_PATHS`, `PAGE_TITLES`, `PAGE_META`), `404.html`'s
  known-routes list, and `bs-config.js`'s whitelist. Unknown paths must
  stay untouched by the 404 fallback so other GitHub Pages projects under
  this domain keep resolving.

### Verifying markup refactors

The bar for template changes is DOM-equivalence, not byte-equivalence.
A reliable way to check: serve the site before and after, capture
canonicalized DOM (sorted attributes, collapsed whitespace) of `#app`
and the rendered sections with Playwright (a dev dependency), and diff.
Whitespace between tags is insignificant — the layouts that could care
(chips, nav rows, link groups) are all flex/grid with `gap`.

## Runtime architecture

Runtime remains a zero-dependency static site: plain HTML, CSS, and JS.
`package.json` and `node_modules` exist only for the build and dev
workflow.

### Layout system

The app uses a CSS grid layout with two modes controlled by the
`app--browsing` class on `#app`:

- Default (`about`): sidebar plus content
- Browsing mode (other sections): topbar replaces the desktop sidebar
- Mobile layout is handled through `@media (max-width: 767px)` overrides

### Navigation and routing

`js/main.js` drives section changes through `navigate(section)`, which:

1. Toggles `app--browsing` on `#app`
2. Swaps active states on the sidebar and topbar navigation controls
3. Shows and hides `<section>` elements via the `.active` class
4. Lazy-loads GitHub repos when first needed (portfolio is baked into the
   HTML at build time; only its expand/collapse wiring lives in JS)
5. Syncs browser history and clean paths like `/portfolio` or `/greece`

Production direct-route support on GitHub Pages is handled by the
generated route stubs plus `404.html`, not by server rewrites. The
fallback only captures the known personal-site routes: `/about`,
`/github`, `/resume`, `/portfolio`, `/greece`.

Keep local asset references in generated pages root-relative, not
route-relative. Direct loads on nested paths depend on that.

Data flow into runtime JS: the build injects `window.SITE_CONTENT`
(currently the pinned-repo list from `content/site.yaml`) via an inline
script before `js/main.js`. Extend that object rather than hardcoding
content in JS.

### Email obfuscation

The email address in `js/main.js` is ROT13-encoded to reduce scraping. It
is decoded at runtime and injected into `#email`, `#email-topbar`, and
`#email-topbar-compact`.

### Styling

Design tokens live in `:root` in `css/main.css`.

The shell and hero treatment are controlled by the shell theme variables:
`--shell-hero-base`, `--shell-hero-accent`, `--shell-divider`,
`--shell-bg-image`, `--shell-bg-size`.

The sidebar, topbar, and sticky header use the moving
`img/background-blue.png` texture directly. Do not rely on CSS blend-mode
tinting for shell color, since Safari renders it inconsistently.

### Greece guide link patterns

These invariants are now enforced structurally — the templates decide the
link shape from the content shape, and `build/lib/content.js` rejects
violations — but keep them in mind when changing templates:

- `.gr-venue` and `a.gr-sight` are full-card anchors. Never render
  another `<a>` anywhere inside them (names, descriptions): nested
  anchors are invalid HTML and browsers reparse them inconsistently.
- `.gr-inline-link` is only for prose, list items, fact rows, and other
  non-clickable containers. `md(text, GR)` applies it automatically.
- If one row needs multiple destination links, the row stays
  non-clickable and uses the grouped pattern: `.gr-sight--grouped` with
  child `.gr-sight-links` / `.gr-sight-link` items (the `links:` shape in
  content).
- When a card is already the link target, secondary place mentions in
  that card stay plain text (validation rejects Markdown links there).
