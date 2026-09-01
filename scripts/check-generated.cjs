#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadContent } = require('./content/load-content.cjs');
const { siteRoutes, shellPages, SITE_ORIGIN } = require('./content/routes.cjs');
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

/* The Greece guide renders inside the content pane, which the sidebar makes
   300px narrower than the window.  Sizing it against the window is therefore
   always wrong by that much: at a 1000px window the guide has 700px, and a
   viewport breakpoint that reads "wide" hands it a two-column layout and a
   288px aside it cannot fit, leaving cards one word wide and spilling under
   the aside.  The guide measures itself instead, and this keeps it that
   way — the failure is silent at most window sizes and only shows up in the
   band where the two disagree. */
function checkGuideMeasuresItself() {
  const guide = fs.readFileSync(path.join(ROOT, 'css', 'greece.css'), 'utf8');

  if (!/#section-greece\s*\{[^}]*container:\s*guide\s*\/\s*inline-size/.test(guide)) {
    fail('css/greece.css must declare the `guide` container that its queries measure');
  }

  const viewportUnit = guide.match(/\d(?:\.\d+)?(?:vw|vmin|vmax)\b/);
  if (viewportUnit) {
    fail(`css/greece.css sizes the guide against the window (${viewportUnit[0]}); use cqw`);
  }

  /* One media query is legitimate: which shell the guide is sitting in is a
     fact about the window, not about the guide, and it is what decides
     whether the site header is pinned above it and where the safe area
     falls.  It is the same condition css/main.css switches the shell on. */
  const shell = fs.readFileSync(path.join(ROOT, 'css', 'main.css'), 'utf8');
  const compactShell = (shell.match(/@media \(max-width: 767px\), \(max-height: \d+px\) and \(pointer: coarse\)/) || [])[0];
  if (!compactShell) fail('Could not find the compact-shell media query in css/main.css');

  for (const query of guide.matchAll(/@media[^{]*/g)) {
    const condition = query[0].trim();
    if (condition === compactShell.trim()) continue;
    if (/\b(?:min|max)-width\b/.test(condition)) {
      fail(`css/greece.css switches the guide's layout on window width (${condition}); use @container guide`);
    }
  }

  /* The stylesheet opens ordinary aside tip cards at a guide width of 900px
     and js/main.js decides there whether they are collapsible.  Where the
     two disagree the bodies stay collapsed and refuse to open. */
  const runtime = fs.readFileSync(path.join(ROOT, 'js', 'main.js'), 'utf8');
  const cssThreshold = guide.match(/@container guide \(min-width: (\d+)px\)/);
  const jsThreshold = runtime.match(/GUIDE_WIDE_PX = (\d+)/);
  if (!cssThreshold || !jsThreshold || cssThreshold[1] !== jsThreshold[1]) {
    fail('The guide width that opens the tip cards differs between css/greece.css and js/main.js');
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
  if (html.includes('gr-tickets-banner')) {
    fail('The removed Greece ticket banner is still present');
  }
  const collapsibleTipCount = content.greece.sections.reduce(
    (count, section) => count + section.aside.filter((tip) => tip.collapsible).length,
    0
  );
  if (countMatches(html, /class="gr-tip gr-tip--[^\"]+ gr-tip--collapsible"/g) !== collapsibleTipCount) {
    fail('Generated collapsible Greece tip count does not match content');
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

  checkGuideMeasuresItself();

  /* Every registered route is a complete copy of the shell at its own clean
     path, carrying that route's title and social card, and every unregistered
     one is absent. Nothing in the artifact may still route through a query
     string: /greece is the whole address. */
  const routes = siteRoutes(content);
  const notFound = fs.readFileSync(path.join(SITE, '404.html'), 'utf8');
  const runtime = fs.readFileSync(path.join(SITE, 'js', 'main.js'), 'utf8');

  for (const shellPage of shellPages(routes)) {
    const file = path.join(SITE, shellPage.permalink);
    if (!fs.existsSync(file)) fail(`Build output is missing ${shellPage.permalink}`);

    const pageHtml = fs.readFileSync(file, 'utf8');
    const pageUrl = SITE_ORIGIN + shellPage.path;
    if (!pageHtml.includes('<div id="app"')) fail(`${shellPage.permalink} is not the application shell`);
    if (!pageHtml.includes(`<link rel="canonical" href="${pageUrl}">`)) {
      fail(`${shellPage.permalink} does not declare ${pageUrl} as its canonical URL`);
    }
    if (!pageHtml.includes(`<meta property="og:url" content="${pageUrl}">`)) {
      fail(`${shellPage.permalink} does not carry its own social card`);
    }
    if (!pageHtml.includes(`<title>${shellPage.route.title}</title>`)) {
      fail(`${shellPage.permalink} does not carry its route's title`);
    }
    if (pageHtml.includes('rel="preload" as="image"')) {
      fail(`${shellPage.permalink} eagerly preloads a social preview image`);
    }
    if (pageHtml.includes('?route=')) fail(`${shellPage.permalink} still routes through a query string`);
  }

  for (const route of routes) {
    if (!html.includes(`data-section="${route.id}"`)) fail(`Missing shell navigation for ${route.path}`);
  }

  for (const [name, source] of [['404.html', notFound], ['js/main.js', runtime]]) {
    if (source.includes('?route=') || source.includes("get('route')")) {
      fail(`${name} still routes through a query string`);
    }
  }
  if (!notFound.includes('<a href="/"')) fail('404.html does not link back to the site');

  for (const disabled of ['portfolio']) {
    if (routes.some((route) => route.id === disabled)) continue;
    if (fs.existsSync(path.join(SITE, disabled))) fail(`Disabled route /${disabled} is still written`);
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
