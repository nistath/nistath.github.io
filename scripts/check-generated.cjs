#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadContent } = require('./content/load-content.cjs');

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

  for (const project of content.portfolio.projects) {
    if (!html.includes(`id="pcard-${project.id}"`)) fail(`Missing portfolio card: ${project.id}`);
  }
  if (countMatches(html, /class="pcard"/g) !== content.portfolio.projects.length) {
    fail('Generated portfolio card count does not match content');
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
  if (!html.includes('<iframe\n            data-src=') || html.includes('<iframe\n            src=')) {
    fail('The resume iframe must defer its remote source until the route is opened');
  }

  for (const required of [
    '404.html',
    'CNAME',
    'about/index.html',
    'css/main.css',
    'greece/index.html',
    'js/main.js',
    'portfolio/index.html',
  ]) {
    if (!fs.existsSync(path.join(SITE, required))) fail(`Build output is missing ${required}`);
  }

  for (const route of ['about', 'github', 'resume', 'portfolio', 'greece']) {
    const routeHtml = fs.readFileSync(path.join(SITE, route, 'index.html'), 'utf8');
    if (routeHtml.includes('rel="preload" as="image"')) {
      fail(`${route}/index.html eagerly preloads a social preview image before redirecting`);
    }
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
