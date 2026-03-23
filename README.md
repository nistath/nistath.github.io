# Nick's Personal Website

This repository now hosts a plain static site served directly by GitHub Pages. There is no build pipeline for production deployment.

## Local development

For normal development, use the BrowserSync setup in this repo. It gives you:

- live reload on file changes
- local serving on `http://127.0.0.1:8080`
- route fallback for the site's direct SPA paths: `/about`, `/github`, `/resume`, `/portfolio`, and `/greece`
- slash normalization for those SPA paths so `/greece/` resolves back to `/greece`

### Recommended

```bash
npm install
npm run dev
```

Then open [http://127.0.0.1:8080](http://127.0.0.1:8080).

This local dev server uses a whitelist-based fallback in `bs-config.js`, so the known site routes above are served from `index.html` during development. Unknown routes are left alone instead of being swallowed, which keeps local behavior closer to production where GitHub Pages routing is implemented via `404.html`.

If you want a reproducible clean install in CI or a fresh checkout, `npm ci` also works.

### Quick static check

If you only want to sanity-check files without live reload, you can still run:

```bash
python3 -m http.server
```

But note that a plain static server will not correctly emulate direct route refreshes unless it is configured with a fallback.

## Deployment

Commit your changes to the `master` branch and push. GitHub Pages automatically serves the contents of this repository.

Known direct routes are normalized to slashless paths like `/greece`, and local assets in `index.html` should stay root-relative so direct loads and GitHub Pages fallbacks do not break styling.

## Next steps

With the Ruby and Gulp dependencies removed, the repository is ready for a static site generator such as [Kaihan](https://github.com/Mononofu/kaihan). Generate your blog into a folder (for example `blog/`) and publish the resulting static files alongside the rest of the site.
