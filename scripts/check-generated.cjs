#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert/strict');
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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sliceBetween(source, start, end) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  if (startIndex < 0 || endIndex < 0) fail(`Could not find generated section boundary: ${start}`);
  return source.slice(startIndex, endIndex);
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
  if (html.includes('href="map:') || html.includes('](map:')) {
    fail('Generated HTML contains unexpanded map: shorthand');
  }
  if (countMatches(html, /<main\b/g) !== 1) fail('The generated page must contain exactly one main landmark');

  checkNoNestedAnchors(html);
  checkUniqueIds(html);

  const aboutHtml = sliceBetween(html, 'id="section-about"', 'id="section-github"');
  if (!aboutHtml.includes(`<h1>${escapeHtml(content.about.heading)}</h1>`)) fail('Missing About heading');
  if (!aboutHtml.includes('class="farewell"')) fail('Missing About farewell');
  if (countMatches(aboutHtml, /<p(?:\s|>)/g) !== content.about.paragraphs.length + 1) {
    fail('Generated About paragraph count does not match content');
  }

  const githubDataMatch = html.match(
    /<script id="github-content" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!githubDataMatch) fail('Missing generated GitHub runtime content');
  assert.deepStrictEqual(JSON.parse(githubDataMatch[1]), content.github);

  const resumeHtml = sliceBetween(html, 'id="section-resume"', 'id="section-portfolio"');
  if (!resumeHtml.includes(`src="${escapeHtml(content.resume.url)}"`)) fail('Missing resume URL');
  if (!resumeHtml.includes(`title="${escapeHtml(content.resume.title)}"`)) fail('Missing resume title');

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

  for (const required of [
    '404.html',
    'CNAME',
    'about/index.html',
    'css/main.css',
    'github/index.html',
    'greece/index.html',
    'js/main.js',
    'portfolio/index.html',
    'resume/index.html',
  ]) {
    if (!fs.existsSync(path.join(SITE, required))) fail(`Build output is missing ${required}`);
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
