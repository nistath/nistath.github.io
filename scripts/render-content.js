#!/usr/bin/env node
/*
 * Regenerate the Greece guide's generated content region in index.html from
 * content/greece.njk (+ content/macros.njk).
 *
 *   npm run content
 *
 * This is a manual, human-run step (like `npm run og`) -- there is no CI.
 * Edit content/greece.njk, run this script, review the resulting index.html
 * diff, then commit both files together. Never hand-edit index.html between
 * the BEGIN/END GENERATED markers -- the next run silently overwrites it.
 */
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const INDEX_PATH = path.join(ROOT, 'index.html');
const INDENT = '            '; // 12 spaces, matches surrounding index.html markup

const BEGIN_MARKER = '<!-- BEGIN GENERATED: greece-content (edit content/greece.njk, then run `npm run content`) -->';
const END_MARKER = '<!-- END GENERATED: greece-content -->';

function renderGreece() {
  const env = new nunjucks.Environment(
    new nunjucks.FileSystemLoader(CONTENT_DIR),
    { autoescape: true, trimBlocks: true, lstripBlocks: true, throwOnUndefined: true }
  );
  return env.render('greece.njk').replace(/\s+$/, '');
}

// Cheap structural guard for the nested-anchor rule documented in CLAUDE.md:
// .gr-venue and a.gr-sight are full-card anchors, so their name/desc text
// must never itself contain another <a>.
function assertNoNestedAnchors(html) {
  const blockRe = /<div class="gr-(venue|sight)-(name|desc)">([\s\S]*?)<\/div>/g;
  let match;
  while ((match = blockRe.exec(html))) {
    const inner = match[3];
    if (/<a[\s>]/i.test(inner)) {
      throw new Error(
        'Nested <a> found inside a gr-' + match[1] + '-' + match[2] +
        ' block -- this would produce invalid nested anchors. Offending snippet:\n' +
        match[0]
      );
    }
  }
}

function main() {
  const rendered = renderGreece();
  assertNoNestedAnchors(rendered);

  const original = fs.readFileSync(INDEX_PATH, 'utf8');
  const beginIdx = original.indexOf(BEGIN_MARKER);
  const endIdx = original.indexOf(END_MARKER);

  if (beginIdx === -1 || endIdx === -1) {
    throw new Error('Could not find BEGIN/END GENERATED markers in index.html -- aborting to avoid corrupting the file.');
  }
  if (original.indexOf(BEGIN_MARKER, beginIdx + 1) !== -1) {
    throw new Error('Found more than one BEGIN GENERATED marker in index.html -- aborting.');
  }
  if (original.indexOf(END_MARKER, endIdx + 1) !== -1) {
    throw new Error('Found more than one END GENERATED marker in index.html -- aborting.');
  }
  if (endIdx < beginIdx) {
    throw new Error('END marker appears before BEGIN marker -- aborting.');
  }

  const before = original.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = original.slice(endIdx);

  const indented = rendered
    .split('\n')
    .map(function(line) { return line ? INDENT + line : line; })
    .join('\n');

  const next = before + '\n' + indented + '\n' + INDENT + after;

  fs.writeFileSync(INDEX_PATH, next);
  console.log('Regenerated greece-content region in index.html');
}

main();
