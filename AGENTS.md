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

This is a zero-dependency static personal site. Runtime behavior is plain HTML, CSS, and JavaScript. `package.json` exists only to support the local BrowserSync workflow.

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

Projects are defined in the `PROJECTS` array in `js/main.js`. Each entry renders through `buildCard()`. Cards support nested `subItems`, and expand/collapse uses the `grid-template-rows: 0fr -> 1fr` transition pattern.

To add a project, append a new object to `PROJECTS` with keys such as `id`, `color`, `icon`, `title`, `subtitle`, `org`, `period`, `tags`, and `bullets`. Optional keys include `links` and `subItems`.

### Email obfuscation

The email address in `js/main.js` is ROT13-encoded to reduce scraping. It is decoded at runtime and injected into:

- `#email`
- `#email-topbar`
- `#email-topbar-compact`

### Styling

Design tokens live in `:root` in `css/main.css`.

The shell and hero treatment are controlled by the shell theme variables:

- `--shell-hero-base`
- `--shell-hero-depth`
- `--shell-hero-accent`
- `--shell-divider`
- `--shell-hero-tint-start`
- `--shell-hero-tint-mid`
- `--shell-hero-tint-end`

The sidebar, topbar, and sticky header use the moving `img/background.png` texture with a blue tint layered over it.
