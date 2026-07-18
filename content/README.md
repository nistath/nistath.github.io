# Editing the website content

Everything you'd want to reword by hand lives in this folder. Edit a
file (the GitHub app's editor on your phone works fine), commit to
`master`, and a GitHub Action rebuilds and publishes the site within a
minute or two. You never need to touch HTML.

| File | What it controls |
|---|---|
| `about.yaml` | The landing-page prose |
| `portfolio.yaml` | Portfolio cards (one entry per project) |
| `greece.yaml` | The entire Greece guide |
| `site.yaml` | GitHub section (pinned repos) and the resume PDF link |

If an edit contains a mistake, the build **fails instead of publishing**:
the live site keeps its previous version, GitHub emails you a failed-run
notice, and the Actions tab shows a message pointing at the exact file,
entry, and problem. Fix and commit again. You can't break the site with
a typo — the worst case is that your edit waits until it parses.

## Writing prose

Prose fields support a deliberately tiny Markdown dialect — nothing else:

| You write | You get |
|---|---|
| `**bold**` | **bold** |
| `*italic*` | *italic* |
| `[label](https://example.com)` | a link |
| `[label](map:Acropolis of Athens)` | a Google Maps search link for that place |

The `map:` shorthand is the house style for places: write the place name
the way you'd type it into Google Maps. No URL hunting needed.

Raw HTML is not supported (it renders as literal text). Emoji are used
literally: `icon: "🥐"`.

## The three YAML rules

YAML is mostly "just text", but three things trip people up:

1. **Quote lines that contain `: ` or start with `[` or `*`.**
   ```yaml
   - "Sunset drinks: [Caprice](map:Caprice Bar Mykonos)"
   - "[Portara](map:Portara Temple of Apollo Naxos) at sunset"
   ```
2. **Long paragraphs use `>-` blocks.** Everything indented under it
   folds into one paragraph, and no quoting is ever needed inside:
   ```yaml
   - p: >-
       Fly into **Athens International Airport (ATH)**. Taxi (~€40 flat
       rate, ~40 min), or private transfer.
   ```
3. **Quote hex colors** (`color: "#7c3aed"`) — a bare `#` starts a comment.

When in doubt, copy an existing entry and edit it. The build validates
everything and tells you precisely what's wrong.

## Portfolio: adding or editing a project

Each entry under `projects:` in `portfolio.yaml` becomes one card, in
order. Copy an existing project block and adjust. Required keys: `id`,
`color`, `icon`, `title`, `subtitle`, `org`, `period`, `tags`,
`bullets`. Optional: `links` (label + url) and `sub_items` (nested
expandable rows with `id`, `title`, `paragraphs`).

`icon:` names a pixel-art icon from `build/templates/icons.js`
(currently: `salient`, `car`, `bms`, `dash`). A new project needs a new
icon — that's a coding-agent task; just pick the closest existing icon in
the meantime and note what you want drawn.

## Greece guide: structure

`greece.yaml` is a list of `sections:` rendered in order. Each section
has a `type`:

- `guide` — a titled section (Travel, Sights, Eat & Drink): `title`,
  `body`, optional `aside`
- `island` — an island feature card: `name`, `tagline`, `image`, `body`,
  `aside`
- `divider` — the "Beyond Athens" interstitial
- `cards` — the "More Islands" mini-cards

Sections with a `nav:` key (icon + label) appear in the sticky nav, in
the same order. Reordering sections reorders the page and the nav.

### Body blocks

`body:` is a list of blocks; each is one `- key: value` entry:

| Block | Renders as |
|---|---|
| `- h3: Beaches` | a subheading |
| `- p: ...` | a paragraph |
| `- tagline: ...` | the italic lead-in line |
| `- intro: ...` | intro paragraph (Eat & Drink style) |
| `- note: ...` | the highlighted note box |
| `- image: {src, alt}` | a photo (optional `aspect: 16/7`, `gap: true`) |
| `- chips: [...]` | pill chips; strings are plain, `{label, map}` are links |
| `- sights: [...]` | a card of sight rows (see below) |
| `- venues: [...]` | restaurant/bar rows: `icon`, `name`, `map` or `url`, `desc` |

### Sight rows — pick the right link shape

The shape of a sight entry decides its layout, and the build enforces
the difference:

```yaml
- name: Acropolis          # ticketed: Map + Official tickets buttons
  map: Acropolis of Athens
  tickets: true
  desc: The must-see.
- name: Acropolis Museum   # the whole row is one link
  map: Acropolis Museum Athens
  desc: World-class collection.        # ← no [links] allowed in here
- name: Museums in Fira    # several destinations: grouped links
  desc: Good indoor stop.
  links:
    - { label: Fira, map: Fira Santorini }
    - { label: Museum of Prehistoric Thera, map: Museum of Prehistoric Thera Fira }
- name: Guided bus tour    # no link at all — plain row
  desc: Hit the major sights.
```

When a row is itself a link (`map`/`url`, and every `venue`), its text
must stay plain — the build rejects `[links](...)` inside it, because
nested links are invalid HTML. Mention secondary places as plain text,
or switch the row to the grouped `links:` shape.

### Aside tip cards

`aside:` is a list of the colored cards in the right column. `style`
picks the color scheme (`tips`, `facts`, `essentials`, `ferry`, `eats`,
`itinerary`, `logistics`), and the content is exactly one of:

```yaml
- style: tips              # bullet list
  title: 💡 Pro Tips
  items: [ ... ]
- style: facts             # term/definition rows
  title: 🛬 Quick Facts
  facts:
    - { term: Airport, def: ATH — Eleftherios Venizelos }
- style: itinerary         # day-by-day plan
  title: 🗓 Suggested Order
  days:
    - label: Day 1
      items: [ ... ]
```

## Previewing locally (optional)

```bash
npm install
npm run dev
```

serves the site at `http://127.0.0.1:8080` and rebuilds + reloads on
every save. Committing without previewing is fine too — validation has
your back.

## What this folder can't do

Layout, colors, new block types, new pages, and new visual elements live
in `build/templates/` and the CSS — that's coding-agent territory (see
`AGENTS.md`). If you need a new kind of element, describe it in a task
for an agent; once it exists, its content lands back here for you to
edit by hand.
