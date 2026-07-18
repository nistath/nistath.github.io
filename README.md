# Nick's Personal Website

A static personal site served directly by GitHub Pages, generated from
hand-editable YAML content by a small dependency-light build.

## Editing content (the common case)

All prose — the about page, portfolio cards, and the Greece guide — lives
in [`content/`](content/) as YAML with a tiny inline-Markdown dialect.
Edit a file (the GitHub mobile app works great for this), commit to
`master`, and a GitHub Action rebuilds and publishes the site
automatically. Bad edits fail the build with a precise error instead of
breaking the live site.

**Start here: [`content/README.md`](content/README.md)** — the full
authoring guide.

## Local development

```bash
npm install
npm run dev
```

Builds the site, serves it on [http://127.0.0.1:8080](http://127.0.0.1:8080)
with live reload, watches `content/` and `build/` and rebuilds on save.
The dev server includes a whitelist-based fallback (`bs-config.js`) so the
site's direct SPA paths — `/about`, `/github`, `/resume`, `/portfolio`,
`/greece` — refresh correctly, and trailing slashes like `/greece/`
normalize back to `/greece`.

Other scripts:

```bash
npm run build    # one-shot build: renders index.html + route stubs
npm run check    # validate content without writing anything
npm run serve    # serve only, no build/watch
```

`python3 -m http.server` still works for a quick static sanity check
(generated pages are committed), but it won't rebuild or emulate direct
route refreshes.

## How it fits together

- `content/*.yaml` — the words (human-owned)
- `build/` — templates and build script that render them into HTML
  (agent-owned; see [`AGENTS.md`](AGENTS.md))
- `index.html`, `github/`, `resume/`, `portfolio/`, `greece/` —
  **generated output**, checked in so GitHub Pages can serve the repo
  directly; never edited by hand
- `js/main.js`, `css/` — runtime behavior and styling (plain JS/CSS,
  zero runtime dependencies)

## Deployment

Commit to `master` and push. GitHub Pages serves the repository contents
as-is. The `Rebuild generated pages` workflow regenerates the HTML
whenever `content/` or `build/` change and commits the result back, so
content edits made in the GitHub UI deploy without any local tooling.
