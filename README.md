# Nick's Personal Website

This is the source for [nistath.com](https://nistath.com). Eleventy turns
hand-editable YAML and Markdown content into a static site; the deployed result
is still plain HTML, CSS, and JavaScript.

## Edit content

The main hand-authored content is split into small files:

- `content/about.yml`, `content/github.yml`, and `content/resume.yml` contain
  the other page prose, the pinned-repository order, and the resume source.
- `content/portfolio/` holds the portfolio index and one YAML file per project.
  It is empty, which switches the whole `/portfolio` route off; adding the
  files back brings the page back.
- `content/greece/` contains the Greece guide metadata and one YAML file per
  guide section or island.

Prose fields support Markdown plus a short `map:` form for Google Maps links.
Templates, HTML structure, CSS classes, icons, and accessibility behavior
remain separate from the content. See
[Editing site content](docs/content-authoring.md) for the field reference,
mobile workflow, and copy/paste recipes.

For a quick change in the GitHub mobile app, edit the relevant file under
`content/`, commit it, and check the resulting GitHub Actions run. A successful
run publishes the update; a failed run leaves the previous deployment live.

## Local development

Node.js 20 or newer is required.

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:8080](http://127.0.0.1:8080). Eleventy watches the
templates, content, schemas, and static assets and reloads the site as they
change.

Use `npm ci` instead of `npm install` for a reproducible clean install.

## Build and check

```bash
npm run build
npm run check
```

- `npm run build` validates the content and writes the static site to `_site/`.
- `npm run check` builds, then checks the generated markup, expected content,
  and JavaScript syntax.

`_site/` is generated and ignored by Git. Do not edit or commit it. To serve a
built copy without the development server, run:

```bash
npm run build
python3 -m http.server --directory _site
```

## Deployment

The workflow in `.github/workflows/pages.yml` runs checks and deploys `_site/`
to GitHub Pages after a successful push to `master`. Pull requests run the same
checks without deploying.

One repository setting is mandatory: in **Settings → Pages → Build and
deployment**, set **Source** to **GitHub Actions**. This is a one-time setup;
without it, the workflow cannot publish the generated site.

The workflow deploys a build artifact rather than committing generated files.
Eleventy generates the clean-route stubs and `404.html` from the route registry
and copies `CNAME` and the static assets into that artifact.

## Project layout

- `content/` — human-authored YAML and Markdown strings
- `src/index.njk` — application shell
- `src/routes.njk`, `src/404.njk` — generated clean-path stubs and fallback
- `src/_includes/` — navigation, portfolio, and Greece rendering components
- `schemas/` — schemas for every content file shape
- `scripts/content/` — validated content loader and route registry used by
  Eleventy and the checks
- `css/`, `js/`, `img/`, `fonts/`, `files/` — static runtime assets
- `_site/` — ignored generated output
