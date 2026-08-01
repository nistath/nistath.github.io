Repository guidance for contributors and coding agents working in this repo.

## Local Development

Eleventy builds the authored content and templates into a static site. Node.js
20 or newer is required.

```bash
npm install
npm run dev
```

The development server runs at `http://127.0.0.1:8080` with live reload.

Before handing off a change, run the checks appropriate to its scope. For any
content, template, JavaScript, routing, or build change, run the full check:

```bash
npm run check
```

Useful commands:

```bash
npm run build              # validate content and generate _site/
npm run validate:content   # validate authored YAML only
npm run check              # build plus generated-site safety checks
npm run og                 # build and regenerate Open Graph images
npm run texture            # regenerate img/shell-texture.png
```

`_site/` is generated, ignored, and never an authoring source. Do not edit or
commit it. For a quick static sanity check, build first and serve `_site/`, not
the repository root:

```bash
npm run build
python3 -m http.server --directory _site
```

## Deployment

Pushes to `master` run `.github/workflows/pages.yml`, which installs locked
dependencies, runs `npm run check`, uploads `_site/`, and deploys the artifact
to GitHub Pages. Pull requests run the build and checks without deploying.

The repository's one-time GitHub Pages setting must be **Settings → Pages →
Build and deployment → Source: GitHub Actions**. GitHub Pages must not be
configured to serve the repository root or `_site/` from a branch.

## Architecture

The production artifact is zero-framework static HTML, CSS, and JavaScript.
Eleventy, Nunjucks, YAML parsing, Markdown rendering, and schema validation are
build-time tools only.

pdf.js is the one library that reaches the browser, vendored into
`_site/vendor/pdfjs/` at build time and loaded only by browsers with no inline
PDF viewer of their own, only on the resume route. See the resume section
below. Treat it as the exception it is: a second one needs the same
justification — a capability the platform genuinely lacks, paid for only by
the visitors who lack it.

### Source boundaries

- `content/*.yml`, `content/portfolio/`, and `content/greece/` are the
  human-authoring surface. They contain meaning, prose, links, ordering, and
  basic nesting. About, GitHub, Resume, and pinned-repository configuration
  must stay here rather than in templates or runtime JavaScript.
- `src/index.njk` is the application shell that replaces the old authored root
  `index.html`.
- `src/routes.njk` and `src/404.njk` generate the clean-path redirect stubs and
  the direct-load fallback. They are output, not authoring surfaces.
- `scripts/content/routes.cjs` is the single route registry. Shell navigation,
  redirect stubs, the 404 fallback list, the route table injected into
  `js/main.js`, and the generated checks all read it.
- `src/_includes/portfolio/` and `src/_includes/greece/` own generated markup,
  CSS classes, SVGs, and accessibility attributes.
- `src/_data/portfolioThemes.json` maps stable portfolio theme keys to visual
  values. Theme icons live beside the portfolio template.
- `schemas/` defines every accepted content shape. Unknown fields and invalid
  combinations should fail validation rather than be silently ignored.
- `scripts/content/load-content.cjs` parses and validates content for both the
  build and standalone checks. `scripts/validate-content.cjs` is its CLI.
- `scripts/content/links.cjs` owns the `map:` shorthand and conversion to
  canonical Google Maps search URLs.
- `scripts/check-generated.cjs` checks the built artifact for expected content,
  unique IDs, valid anchor nesting, generated route files, and JavaScript
  syntax. It also asserts that a disabled route emits no stub or 404 entry.
- `.eleventy.js` wires content into templates and copies runtime assets to
  `_site/`.

Do not put HTML, entities, Nunjucks, CSS classes, SVG, or ARIA attributes in
content YAML. Use natural Unicode and Markdown strings. Templates must remain
responsible for escaping and semantic markup. See
`docs/content-authoring.md` for the complete authoring contract and recipes.

### Layout system

The app uses a CSS grid layout with two modes controlled by the
`app--browsing` class on `#app`:

- Default (`about`): sidebar plus content
- Browsing mode (other sections): topbar replaces the desktop sidebar
- The compact shell replaces both with a scrolling page

Which shell a visitor gets is a question of the space available, not of width
alone. A phone held in landscape reports 874×402: wide enough to satisfy a
width-only breakpoint, and nowhere near tall enough for a full-height sidebar.
The condition is therefore

```
(max-width: 767px), (max-height: 600px) and (pointer: coarse)
```

written verbatim in `css/main.css`, in the Greece mobile block in
`css/greece.css`, and as `COMPACT_SHELL_QUERY` in `js/main.js`, which matches
it with `matchMedia` rather than measuring `window.innerWidth`. All three must
stay in step. The compact shell scrolls the page, which is also what lets a
phone browser get its own toolbars out of the way — the two-pane layout never
scrolls, so it never gets that height back.

A second block, `(max-height: 600px) and (pointer: coarse)`, refines the
compact shell for a phone in landscape: the hero becomes a single identity row
and `--bar-h` shrinks, and every other measurement follows from those.

The two-pane layout is sized in `dvh` and its sidebar scrolls, so a window too
short to hold the profile still reaches the nav. Two tiers shrink it before it
comes to that — `(min-width: 768px) and (max-height: 720px)` trims the profile,
and `(max-height: 500px)` collapses it to one identity row, bringing the whole
sidebar to about 287px. After the compact shell claims every short touch
viewport, these only reach a squashed desktop window.

Landscape also puts the sensor housing beside the page rather than above it, on
whichever side the phone was turned toward. In the compact shell's single
centered column that is `--safe-x`, the symmetric form. The two-pane layout
insets per pane instead — the sidebar `--safe-left`, the content
`--safe-right` — so it is right either way round.

On the compact shell the page itself is the only scroll container. Overflow is
set on `html` (it propagates to the viewport) and must stay `visible` on `body`
and `.section`; giving either one its own overflow turns it into a scrollport
that never scrolls, which silently breaks every `position: sticky` descendant.

Greece is the one route that does not pin the site header on mobile. `navigate`
puts `app--greece` on `#app`, which keeps `app--mobile-header-fixed` off, so the
hero and the tab row scroll away as one unit and the guide's own nav takes the
top of the viewport. `css/main.css` repeats the exception defensively so a
scroll event arriving before the class update cannot mis-lay the page.

### Navigation and routing

`js/main.js` drives section changes through `navigate(section)`, which:

1. Toggles `app--browsing` on `#app`.
2. Swaps active states on the sidebar and topbar navigation controls.
3. Shows and hides generated `<section>` elements via the `.active` class.
4. Lazy-loads GitHub repos and initializes portfolio and Greece interactions
   once.
5. Syncs browser history and clean paths such as `/resume` and `/greece`.

Every path, title, social card, and mobile surface color comes from the route
registry the build injects as `window.SITE_CONTENT.routes`. `js/main.js` holds
no route list of its own, so a route the build does not generate cannot be
navigated to.

Production direct-route support is handled by the generated route stubs and
`404.html`, not server rewrites. The fallback only captures the routes in the
registry; unknown paths are intentionally left alone so other Pages content
under this domain, such as project repositories on their own path prefixes,
can continue to resolve normally.

Keep local asset references in `src/index.njk` root-relative, not
route-relative. Direct loads on nested paths depend on that. Adding a top-level
route means adding an entry to `scripts/content/routes.cjs`, a nav icon under
`src/_includes/nav/`, and its `<section>` in the shell. The stub, the 404
fallback, navigation, titles, and social metadata all follow from the registry.

### Resume

The route shows the document in place. Nobody is sent off the site to read it,
and which of three presentations they get is decided by what the browser can
do, not by screen size. `js/main.js` puts the matching state class on
`#section-resume` and `css/main.css` shows one child of it:

| state | when | presentation |
| --- | --- | --- |
| `resume--embed` | the browser has an inline PDF viewer | `.resume-wrap`'s iframe — real text, selection, search, print |
| `resume--render` | it does not: every browser on iOS, and Chrome on Android | `.resume-viewer` — pdf.js paints the pages into canvases |
| `resume--fallback` | the file could not be fetched at all | `.resume-handoff` — the card, which links out |

The markup ships in `resume--fallback`, the only state needing no JavaScript.
`check-generated.cjs` asserts that.

`navigator.pdfViewerEnabled` decides between the first two, with one platform
named outright ahead of it. There are two questions — does the browser display
a PDF when you navigate to one, and does it display one usefully inside an
iframe — and that property only answers the first. Safari answers yes to it on
iOS while still rendering an embedded PDF as a single fixed page: no
fit-to-width, no zoom, no scrolling, spilling out of the frame on every side.
Nothing in the platform distinguishes the two answers, so `js/main.js` names
iOS and iPadOS and sends them to the renderer. Do not simplify that away; the
embed state looked correct in every test that did not run on an iPhone.

pdf.js is vendored: `.eleventy.js` copies `pdf.min.mjs`, its worker, and the
standard fonts out of `node_modules` into `_site/vendor/pdfjs/`, so there is no
CDN and no third-party runtime dependency. It is a deliberate exception to the
zero-framework rule, and a narrow one — nothing requests it until a browser
without its own PDF viewer opens this route, so the desktop path is unchanged
and a phone pays for it once. Pages are painted one at a time, above CSS
resolution so a pinch-zoom stays sharp and under a pixel cap so a page cannot
allocate tens of megabytes; a width change repaints from the document already
in memory, which is what keeps a rotation sharp.

The renderer has to fetch the bytes, so `pdf_url` in `content/resume.yml`
matters: a root-relative path is served from this origin and always readable,
while another host only permits the fetch if it sends CORS headers. If it does
not, `getDocument` rejects and the route lands on `resume--fallback` — no worse
than a plain link, but not the inline read either. The `pdf-source` format in
`load-content.cjs` accepts both shapes.

The canvases carry `role="img"` and the document title: the rendered text is
not selectable and there is no text layer, so the viewer's own "open the
original" link is the accessible path to the real document.

### Portfolio cards

The portfolio route is optional and currently disabled: `content/portfolio/`
is empty, so `loadPortfolio` returns `null`, the registry drops `/portfolio`,
and no section, nav entry, stub, or 404 entry is generated. The schema,
renderer, theme map, icons, card styles, and expand/collapse code all remain,
so restoring the page is a content change. To revive it, add
`content/portfolio/index.yml` listing project slugs plus one YAML file per
project; `docs/content-authoring.md` has the shapes.

`content/portfolio/index.yml` defines the portfolio heading and project order.
Each referenced sibling YAML file defines one project. Projects render at build
time through `src/_includes/portfolio/section.njk`; runtime JavaScript only
initializes expand/collapse interactions.

Portfolio themes are stable presentation keys. Reusing a theme is a content
change. Adding or changing a theme requires updating
`src/_data/portfolioThemes.json`, its matching SVG include, and any relevant
styles or tests.

Cards support optional nested `details`. Expand/collapse uses the existing
`grid-template-rows: 0fr -> 1fr` transition pattern. Preserve the generated
`aria-expanded`, `aria-controls`, `aria-hidden`, and `inert` relationships when
refactoring interactions.

### Greece guide

`content/greece/index.yml` contains guide-wide hero, notice, island-intro, and
footer text. Every other YAML file is one nav target. Its `order` controls both
rendering and generated Greece navigation; there is no separate nav registry.

`src/_includes/greece/guide.njk` owns the guide-level layout and
`src/_includes/greece/components.njk` renders the schema's typed body and aside
blocks.

The guide nav is a horizontal rail (`.gr-nav-rail`) at every width, because
eight chips do not fit a narrow desktop content column. `greeceNavInit`
publishes the measured nav height as `--gr-nav-h` on `.greece-wrap`, and
`scroll-margin-top` plus the sticky aside offset are derived from it, so a
label wrap or a new section cannot leave headings under the bar. The rounded
top corners of the content sheet belong to `.gr-hero::after`, not the nav, so
the nav is a plain square bar once it pins. To add prose or an entry using an existing visual type, edit YAML only.
To add a new visual type or variant, update the schema, renderer, validation,
example content, tests, and authoring documentation together.

Greece link shapes must not be mixed:

- A venue, chip, or sight with `map` or `url` renders as a full-card or
  full-item anchor. Its name and description/text must not contain a Markdown
  link. `map` is a search query; `url` is a specific HTTPS destination.
- A sight with several peer links uses `links`; map/ticket buttons use
  `actions`. These render a non-anchor container with child anchors.
- Inline Markdown links belong in prose, notes, facts, tips, and other
  non-clickable containers. `[label](map:Place Name City)` is expanded by the
  Markdown filter before rendering.

`scripts/content/load-content.cjs` rejects Markdown links nested inside known
full-card fields. Keep this validation aligned with template changes. Never
work around it by inserting raw HTML.

### Email obfuscation

The email address in `js/main.js` is ROT13-encoded to reduce scraping. It is
decoded at runtime and injected into:

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

The sidebar, topbar, and sticky header use the moving `img/shell-texture.png`
directly. Do not rely on CSS blend-mode tinting for shell color, since Safari
renders it inconsistently.

That texture is a checked-in build product: `scripts/render-shell-texture.cjs`
(`npm run texture`) derives it from the original `img/background.png` tile,
darkening it and expanding its contrast so the pattern survives
`--sidebar-overlay` while the composited average stays `--shell-hero-dark`.
Overlay alpha and texture contrast are two halves of one setting — change
either and re-run the script. `npm run check` fails if the committed texture
no longer matches its generator.

## Extension checklist

For ordinary factual, prose, ordering, link, image, or existing-shape changes:

1. Edit only the relevant file under `content/`.
2. Preserve IDs unless intentionally migrating references.
3. Run `npm run validate:content` and `npm run check`.

For a new field, block type, presentation variant, or component:

1. Update the appropriate schema in `schemas/` first.
2. Update the Nunjucks renderer under `src/_includes/`.
3. Extend `scripts/content/load-content.cjs` for cross-file or semantic rules
   that JSON Schema cannot express.
4. Add or update generated-site checks and interaction code if needed.
5. Add representative content and update `docs/content-authoring.md`.
6. Run `npm run check` and verify the affected routes at a desktop width, a
   phone in portrait, and a phone in landscape (874×402 is the shape that
   breaks width-only assumptions).

Keep content and presentation separate throughout: a future author should be
able to revise prose and basic nesting from a phone without touching template
syntax, while an agent can safely evolve the rendering contract behind the
validated schema.
