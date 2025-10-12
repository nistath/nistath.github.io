# Nick's Personal Website

This repository now hosts a plain static site served directly by GitHub Pages. There is no build pipeline, Bundler, or Node tooling required.

## Local development

Open `index.html` in a browser, or run a simple static server (for example, `python3 -m http.server`) from the project root if you need proper routing for the redirect pages.

## Deployment

Commit your changes to the `main` branch and push. GitHub Pages automatically serves the contents of this repository.

## Next steps

With the Ruby and Gulp dependencies removed, the repository is ready for a static site generator such as [Kaihan](https://github.com/Mononofu/kaihan). Generate your blog into a folder (for example `blog/`) and publish the resulting static files alongside the rest of the site.
