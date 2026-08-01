#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadContent } = require('./content/load-content.cjs');
const { siteRoutes } = require('./content/routes.cjs');
const { buildShellTexture, OUTPUT: SHELL_TEXTURE } = require('./render-shell-texture.cjs');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, '_site');
const INDEX = path.join(SITE, 'index.html');

function fail(message) {
  throw new Error(message);
}

function countMatches(source, pattern) {
  return Array.from(source.matchAll(pattern)).length;
}

function checkNoNestedAnchors(html) {
  let anchorDepth = 0;
  for (const match of html.matchAll(/<\/?a\b[^>]*>/gi)) {
    if (/^<\/a/i.test(match[0])) {
      anchorDepth = Math.max(0, anchorDepth - 1);
    } else {
      if (anchorDepth > 0) fail(`Generated HTML contains a nested anchor near byte ${match.index}`);
      anchorDepth += 1;
    }
  }
  if (anchorDepth !== 0) fail('Generated HTML contains an unclosed anchor');
}

function checkUniqueIds(html) {
  const seen = new Set();
  for (const match of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(match[1])) fail(`Generated HTML contains duplicate id="${match[1]}"`);
    seen.add(match[1]);
  }
}

function main() {
  if (!fs.existsSync(INDEX)) fail('Missing _site/index.html; run npm run build first');
  const html = fs.readFileSync(INDEX, 'utf8');
  const content = loadContent();

  if (html.includes('{%') || html.includes('{{')) fail('Unrendered template syntax remains in index.html');
  if (countMatches(html, /<main\b/g) !== 1) fail('The generated page must contain exactly one main landmark');

  checkNoNestedAnchors(html);
  checkUniqueIds(html);

  if (html.includes('href="map:')) fail('Generated HTML contains an unresolved map: link');
  if (!html.includes(`<h1>${content.about.heading}</h1>`)) fail('Missing authored About heading');
  for (const repository of content.github.pinned_repositories) {
    if (!html.includes(repository)) fail(`Missing injected pinned repository: ${repository}`);
  }

  /* The portfolio is optional. With content it renders one card per project;
     without it the route must be gone from the shell, not merely empty. */
  if (content.portfolio) {
    for (const project of content.portfolio.projects) {
      if (!html.includes(`id="pcard-${project.id}"`)) fail(`Missing portfolio card: ${project.id}`);
    }
    if (countMatches(html, /class="pcard"/g) !== content.portfolio.projects.length) {
      fail('Generated portfolio card count does not match content');
    }
  } else if (html.includes('data-section="portfolio"') || html.includes('id="section-portfolio"')) {
    fail('Portfolio content is absent but the shell still renders its navigation or section');
  }

  for (const section of content.greece.sections) {
    if (!html.includes(`id="gr-${section.id}"`)) fail(`Missing Greece section: ${section.id}`);
    if (!html.includes(`data-gr="${section.id}"`)) fail(`Missing Greece nav item: ${section.id}`);
  }
  if (countMatches(html, /class="gr-nav-btn(?: active)?"/g) !== content.greece.sections.length) {
    fail('Generated Greece nav count does not match content');
  }
  if (html.includes('https://upload.wikimedia.org/wikipedia/commons/')) {
    fail('Generated HTML links to a full-resolution Wikimedia Commons original');
  }
  if (!html.includes('width=640 640w') || !html.includes('width=1280 1280w')) {
    fail('Generated Greece images are missing responsive Wikimedia thumbnails');
  }
  if (!html.includes('loading="lazy"') || !html.includes('decoding="async"')) {
    fail('Generated Greece images must be lazy-loaded and asynchronously decoded');
  }
  const resumeFrame = (html.match(/<iframe\b[\s\S]*?>/) || [''])[0];
  if (!/\sdata-src=/.test(resumeFrame) || /\ssrc=/.test(resumeFrame)) {
    fail('The resume iframe must defer its remote source until the route is opened');
  }
  /* Last resort when the file cannot be fetched: a plain link out to the
     browser's own viewer, which needs no fetch and no renderer. */
  const handoff = html.match(/class="resume-handoff-action" href="([^"]+)"/);
  if (!handoff || handoff[1].replace(/&amp;/g, '&') !== content.resume.pdf_url) {
    fail('The resume route is missing its link to the PDF');
  }
  /* Without JavaScript no state class is ever applied, so the markup has to
     ship in the one state that needs none. */
  if (!/id="section-resume" class="section resume--fallback"/.test(html)) {
    fail('The resume section must ship in its no-JavaScript fallback state');
  }
  /* The renderer reads the URL from the injected content, not from markup. */
  if (!html.includes(JSON.stringify(content.resume.pdf_url))) {
    fail('The injected site content is missing the resume PDF URL');
  }
  /* pdf.js is vendored at build time; a missing copy would leave every
     browser without an inline PDF viewer on the fallback card. */
  for (const asset of [
    'vendor/pdfjs/pdf.min.mjs',
    'vendor/pdfjs/pdf.worker.min.mjs',
    'vendor/pdfjs/standard_fonts/LiberationSans-Regular.ttf',
  ]) {
    if (!fs.existsSync(path.join(SITE, asset))) fail(`Build output is missing ${asset}`);
  }

  for (const required of ['404.html', 'CNAME', 'css/main.css', 'js/main.js']) {
    if (!fs.existsSync(path.join(SITE, required))) fail(`Build output is missing ${required}`);
  }

  /* Every registered route needs its redirect stub and its entry in the 404
     fallback, and every unregistered one must have neither. */
  const routes = siteRoutes(content);
  const notFound = fs.readFileSync(path.join(SITE, '404.html'), 'utf8');

  for (const route of routes) {
    const stub = path.join(SITE, route.path.slice(1), 'index.html');
    if (!fs.existsSync(stub)) fail(`Build output is missing ${route.path}/index.html`);

    const routeHtml = fs.readFileSync(stub, 'utf8');
    if (routeHtml.includes('rel="preload" as="image"')) {
      fail(`${route.path}/index.html eagerly preloads a social preview image before redirecting`);
    }
    if (!routeHtml.includes(`encodeURIComponent('${route.path}')`)) {
      fail(`${route.path}/index.html does not hand its route back to the shell`);
    }
    if (!notFound.includes(`"${route.path}":true`)) fail(`404.html does not recover ${route.path}`);
    if (!html.includes(`data-section="${route.id}"`)) fail(`Missing shell navigation for ${route.path}`);
  }

  for (const disabled of ['portfolio']) {
    if (routes.some((route) => route.id === disabled)) continue;
    if (fs.existsSync(path.join(SITE, disabled))) fail(`Disabled route ${disabled} still emits a stub`);
    if (notFound.includes(`"/${disabled}"`)) fail(`404.html still recovers the disabled /${disabled} route`);
  }

  /* The shell texture is a checked-in build product balanced against
     --sidebar-overlay. Catch it drifting from its generator. */
  if (!fs.readFileSync(SHELL_TEXTURE).equals(buildShellTexture().texture)) {
    fail('img/shell-texture.png is stale; run npm run texture');
  }

  execFileSync(process.execPath, ['--check', path.join(ROOT, 'js', 'main.js')], { stdio: 'inherit' });
  console.log('Generated site checks passed.');
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
