# Editing site content

The files under `content/` are the source of truth for the words and basic
nesting on the site. They are intentionally split into small YAML files so they
remain practical to edit in the GitHub mobile app.

- About, GitHub, and Resume content live in `content/about.yml`,
  `content/github.yml`, and `content/resume.yml`.
- Portfolio projects live in `content/portfolio/`, which is currently empty.
- Greece guide sections live in `content/greece/`.
- Templates own HTML, CSS classes, icons, and ARIA behavior.
- The generated site is build output. Do not edit `_site/` or generated HTML.

Most factual or prose changes require editing only one content file. Copy a
nearby entry when adding something; its shape is a safer starting point than a
blank file.

## Editing from GitHub mobile

1. Open the repository, then browse to the relevant file under `content/`.
2. Use the pencil action to edit it.
3. Preserve the surrounding indentation and field names.
4. Commit the change to `master`, or to a branch if you want review first.
5. Check the GitHub Actions result. A successful check builds and deploys the
   site; a failed check leaves the previously deployed site in place.

For a small wording correction, change only the text. There is no need to run
the project locally.

## YAML and Markdown conventions

YAML describes the structure; Markdown formats prose within that structure.

- Indent with two spaces. Never use tabs.
- Keep `id` values stable after publishing. Use lowercase slugs with hyphens
  for new IDs, such as `new-project`.
- Keep list markers aligned with their siblings.
- Write real punctuation and Unicode directly (`—`, `×`, `’`, Greek text), not
  HTML entities or JavaScript escapes.
- Use `>-` for a wrapped paragraph. YAML joins its source lines with spaces.
- Keep each prose value to one paragraph. For multiple paragraphs, add multiple
  `prose` blocks or list entries; this keeps the YAML easy to scan on a phone.
- Quote a value if YAML could mistake it for syntax, especially a value that
  starts with `#`, or looks like a date or boolean.
- Do not add HTML, Nunjucks/Liquid, CSS classes, SVG, or ARIA attributes to
  content files.

Normal Markdown is supported in prose fields:

```yaml
text: >-
  Book **well ahead**, especially in *August*. See the
  [official site](https://example.com/) for current details.
```

For a Google Maps search, use the phone-friendly `map:` shorthand instead of
finding and pasting a long URL:

```yaml
text: Meet at [Syntagma Square](map:Syntagma Square Athens).
```

Structured place entries use the same idea:

```yaml
name: Acropolis Museum
description: World-class collection at the base of the hill.
map: Acropolis Museum Athens
```

The build converts both forms to a normal Google Maps search URL. Use `url:`
instead when a specific shared pin, official site, or ticket page matters.

For multiple paragraphs, use separate blocks:

```yaml
body:
  - type: prose
    text: >-
      First paragraph.
  - type: prose
    text: >-
      Second paragraph.
```

The schemas reject unknown fields, missing required fields, invalid block
shapes, duplicate IDs, and other structural mistakes. `npm run check` is the
authoritative validation command.

## About, GitHub, and Resume

- `content/about.yml` contains the About heading, paragraphs, and farewell.
- `content/github.yml` contains the GitHub heading, subtitle, loading text,
  and ordered pinned-repository list.
- `content/resume.yml` contains the resume PDF address and title, the two
  strings the rendered viewer uses under `viewer`, and — under `fallback` —
  the heading, description, and button text of the card shown only when the
  file cannot be fetched at all.

  `pdf_url` takes either an `https://` address or a path to a file in this
  repository, such as `/files/resume.pdf`. Prefer the repository path. The
  site renders the résumé into the page for browsers that have no PDF viewer
  of their own — every browser on iOS — and that means fetching the file:
  another host only permits that if it sends CORS headers, while a file in
  this repository is always readable. If the fetch is refused, visitors get
  the `fallback` card instead of the résumé itself.

Routine wording, link, repository-order, and resume-source changes belong in
these files. The template and JavaScript consume them automatically.

## Portfolio

**The portfolio is switched off.** `content/portfolio/` has no files in it, so
the site builds without a portfolio section, without its navigation entries,
and without a `/portfolio` address — that URL returns the not-found page. The
templates and styles are untouched and waiting.

To bring the page back, add `content/portfolio/index.yml` and one file per
project using the shapes below. Nothing else needs changing; the section, both
navigation menus, and the `/portfolio` address reappear on the next build.

`content/portfolio/index.yml` contains the section heading and the ordered list
of project slugs. Each slug names a sibling file; for example, `salient` loads
`content/portfolio/salient.yml`.

```yaml
title: Portfolio
subtitle: Selected projects.
projects:
  - salient
```

Removing every file from `content/portfolio/` again switches the route back
off. A leftover project file with no `index.yml` is an error rather than a
silent half-state.

Each project contains:

- `id`: stable slug, matching its filename
- `theme`: an existing renderer-owned visual theme
- `title`, `subtitle`, `organization`, and `period`
- `tags`: short labels
- `highlights`: Markdown paragraphs shown as bullets
- optional `links`: labeled external links
- optional `details`: expandable groups of Markdown paragraphs

### Change project prose

Edit the relevant item under `highlights` or `details[].paragraphs`:

```yaml
highlights:
  - >-
    Led design and implementation of the system across multiple GPUs.
  - >-
    Achieved a **3× performance improvement** over the baseline.
```

### Add a link

```yaml
links:
  - label: Project page
    url: https://example.com/project
```

Use a full `https://` URL. The template adds external-link behavior; do not put
an `<a>` tag in the label.

### Add a project

1. Copy the most similar project file to `content/portfolio/new-project.yml`.
2. Change its `id` to `new-project` and edit its content.
3. Reuse an existing `theme` whose presentation fits.
4. Add `new-project` at the desired position in
   `content/portfolio/index.yml`.

Minimal shape:

```yaml
id: new-project
theme: salient
title: New Project
subtitle: One-line explanation
organization: Organization
period: "2026"
tags:
  - JavaScript
  - Systems
highlights:
  - >-
    Explain the work and its impact in natural prose.
links:
  - label: Project page
    url: https://example.com/project
```

To add an expandable detail, copy this shape:

```yaml
details:
  - id: implementation
    title: Implementation
    paragraphs:
      - >-
        Describe this part of the project.
```

Creating a new `theme`, icon, card layout, or detail behavior requires a coding
change; see [When to use a coding agent](#when-to-use-a-coding-agent).

## Greece guide

`content/greece/index.yml` holds guide-wide text: the hero, official-ticket
notice, island introduction, and footer. Every other YAML file is one nav
target. Nav buttons are derived from these files and sorted by `order`, so
there is no separate nav list to update.

A nav-target file has this outer shape:

```yaml
id: example-island
order: 90
kind: island
nav:
  label: Example
  icon: "🏝️"
title: Example Island
tagline: A short description
image:
  src: https://example.com/image.jpg
  alt: View of Example Island
body:
  - type: prose
    text: Start the section with a short introduction.
aside: []
```

`kind` is either `section` or `island`. Islands require `tagline` and `image`;
ordinary sections omit both. Use spaced order values such as 10, 20, and 30,
which make later insertion easy.

### Common body blocks

The `body` list accepts the existing block types below. Copy an existing block
of the same type when adding content.

| Type | Purpose |
| --- | --- |
| `heading` | A heading with `text` |
| `prose` | Markdown `text`, optionally with a presentation `variant` |
| `tagline` | Short emphasized `text` |
| `chips` | Small `items`, optionally linked |
| `sights` | Sight cards, including single-link, ticketed, or grouped variants |
| `venues` | Full-card venue links |
| `note` | A short Markdown note |
| `image` or `city_image` | An image with `src` and meaningful `alt` text |
| `card` | A nested group of other body `blocks` |
| `other_cards` | Compact cards for additional islands |

For Wikimedia Commons images, use a canonical
`https://commons.wikimedia.org/wiki/Special:FilePath/Filename.jpg` URL without
a `width` query parameter. The Greece template automatically requests
responsive 640, 960, and 1280-pixel thumbnails, so authored content should not
link directly to full-resolution `upload.wikimedia.org` originals.

Presentation variants are a closed set defined by the templates and schemas.
Reuse one visible in a neighboring file; inventing a new variant requires a
coding change.

### Add prose or a heading

```yaml
body:
  - type: heading
    text: Where to Stay
  - type: prose
    text: >-
      Stay near the center if this is your first visit. It makes the main
      sights easy to reach on foot.
```

### Add a venue

Add an item to an existing `venues` block:

```yaml
- type: venues
  items:
    - icon: "🍽️"
      name: Example Taverna
      description: >-
        Traditional cooking in a relaxed neighborhood setting.
      map: Example Taverna Athens
```

A venue is one full-card link. Do not put a Markdown link inside its `name` or
`description`; that would create a link inside a link.

### Add a sight

For one destination, use `map`:

```yaml
- type: sights
  items:
    - name: Example Museum
      description: >-
        A focused collection that takes about an hour to visit.
      map: Example Museum Athens
```

For separate map and ticket destinations, use `actions` instead of a direct
`map` or `url` target:

```yaml
- name: Example Archaeological Site
  description: >-
    Go early for cooler weather and smaller crowds.
  actions:
    - kind: map
      label: Map
      icon: "📍"
      map: Example Archaeological Site Athens
    - kind: ticket
      label: Official tickets
      icon: "🎟️"
      url: https://tickets.example.com/
```

For several peer destinations, use grouped `links`:

```yaml
- name: Museums in Town
  description: Good indoor options for the afternoon.
  links:
    - label: History Museum
      map: History Museum Athens
    - label: Archaeology Museum
      map: Archaeology Museum Athens
```

Use only one link shape on an item: a direct `map`/`url` target, `actions`, or
`links`. Within a target, choose exactly one of `map` or `url`. The templates
choose valid full-card or grouped markup from that shape.

### Add a tip, fact list, or day plan

These go under `aside`. An aside has `variant` and `title`, then exactly one of
`items`, `facts`, or `days`.

```yaml
aside:
  - variant: tips
    title: "💡 Pro Tips"
    items:
      - Carry water in summer.
      - Book popular restaurants ahead.
  - variant: facts
    title: "🛬 Quick Facts"
    facts:
      - term: Airport
        description: About 40 minutes from the center by metro.
```

For an itinerary:

```yaml
- variant: itinerary
  title: "🗓 Suggested Order"
  days:
    - label: Day 1
      items:
        - Acropolis early
        - Museum after lunch
```

Reuse an existing `variant`; its name selects styling, not prose meaning.

### Add or reorder a guide section

To reorder an existing section, change its numeric `order`. To add a section or
island using existing visual patterns:

1. Copy the closest file in `content/greece/`.
2. Give it a unique filename and matching `id`.
3. Set `kind`, `order`, `nav.label`, and `nav.icon`.
4. Keep only the body and aside blocks that the new section needs.

No navigation template change is needed. A section requiring a new layout or
new block type does require an agent.

## Local checks

From the repository root:

```bash
npm install
npm run dev
```

The development site runs at `http://127.0.0.1:8080` and reloads after content
changes.

Before committing a structural edit, run:

```bash
npm run check
```

Useful individual commands are:

```bash
npm run build
npm run check
```

`build` generates the static site. `check` validates content against the
schemas and runs the repository's build and safety checks. Fix the first error
reported; schema errors include the content file and field path when possible.

## Deployment

GitHub Actions builds and deploys the static output after a successful commit
to `master`. Content authors do not commit generated HTML or `_site/`. Pull
requests run the same checks without replacing the live site.

If an Action fails after a mobile edit, open its first failed `check` step. The
usual cause is indentation, a missing required field, an unknown field or
variant, a duplicate ID, or using two link shapes on one item.

## When to use a coding agent

Edit YAML yourself for factual corrections, prose, titles, tags, ordering,
links, images, and new entries that follow an existing shape.

Use a coding agent when a change needs any of the following:

- a new visual component, block type, theme, icon, or presentation variant
- different card nesting, columns, expansion behavior, navigation behavior, or
  responsive layout
- a new data field or a change to a schema
- HTML, CSS, JavaScript, templates, routes, metadata, or build/deploy changes
- migration of existing content into a different structure

Ask the agent to update the renderer, schema, validation tests, example
content, and this guide together. Content files should continue to describe
meaning and basic nesting; templates should continue to own markup, classes,
and accessibility behavior.
