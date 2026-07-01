#!/usr/bin/env node
/**
 * Render the Greece guide content template into index.html.
 *
 *   npm run content     # regenerate the generated region of index.html
 *
 * content/greece.njk (plus content/macros.njk) is the human-edited source of
 * truth for prose in <main class="gr-main">. This script renders it with
 * Nunjucks, guards against a specific authoring mistake (nested anchors —
 * see CLAUDE.md's "Greece Guide Link Patterns"), and splices the result into
 * index.html between the BEGIN/END GENERATED marker comments.
 *
 * Never hand-edit the generated region directly — the next run silently
 * overwrites it. Edit content/greece.njk instead, then re-run this script.
 * Idempotent: running it twice in a row produces byte-identical output the
 * second time.
 */
const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const INDEX_HTML = path.join(ROOT, 'index.html');

const BEGIN_MARKER = '<!-- BEGIN GENERATED: greece-content (edit content/greece.njk, then run `npm run content`) -->';
const END_MARKER = '<!-- END GENERATED: greece-content -->';
const INDENT = ' '.repeat(12);

function renderGreeceContent() {
  const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(CONTENT_DIR), {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true,
    throwOnUndefined: true,
  });
  return env.render('greece.njk');
}

/* Cheap guard against the exact authoring mistake CLAUDE.md warns about:
   since gr-venue/gr-sight name & desc fields allow raw HTML via `| safe`,
   nothing stops an author from accidentally pasting an <a> inside one,
   producing invalid nested anchors. Scan the rendered output and fail loudly
   if it happens, rather than shipping broken markup silently. */
function guardAgainstNestedAnchors(html) {
  const scopedClasses = ['gr-venue-name', 'gr-venue-desc', 'gr-sight-name', 'gr-sight-desc'];
  const divRe = new RegExp(
    `<div class="(?:${scopedClasses.join('|')})"[^>]*>([\\s\\S]*?)<\\/div>`,
    'g'
  );
  let match;
  while ((match = divRe.exec(html))) {
    if (/<a[\s>]/.test(match[1])) {
      throw new Error(
        'render-content: found a nested <a> inside ' +
        match[0].slice(0, 80).replace(/\n/g, ' ') + '... ' +
        '(gr-venue/gr-sight cards are themselves full-card anchors — ' +
        'see CLAUDE.md "Greece Guide Link Patterns")'
      );
    }
  }
}

function indent(html) {
  return html
    .split('\n')
    .map(function (line) { return line.length ? INDENT + line : line; })
    .join('\n')
    .replace(/\n+$/, '');
}

function spliceIntoIndexHtml(renderedHtml) {
  const original = fs.readFileSync(INDEX_HTML, 'utf8');

  const beginIdx = original.indexOf(BEGIN_MARKER);
  const endIdx = original.indexOf(END_MARKER);
  if (beginIdx === -1) throw new Error('render-content: BEGIN marker not found in index.html');
  if (endIdx === -1) throw new Error('render-content: END marker not found in index.html');
  if (endIdx < beginIdx) throw new Error('render-content: END marker appears before BEGIN marker in index.html');
  if (original.indexOf(BEGIN_MARKER, beginIdx + 1) !== -1) {
    throw new Error('render-content: BEGIN marker appears more than once in index.html');
  }
  if (original.indexOf(END_MARKER, endIdx + 1) !== -1) {
    throw new Error('render-content: END marker appears more than once in index.html');
  }

  const before = original.slice(0, beginIdx + BEGIN_MARKER.length);
  const after = original.slice(endIdx);
  const body = indent(renderedHtml);

  const next = before + '\n' + body + '\n' + INDENT + after;
  fs.writeFileSync(INDEX_HTML, next);
}

function main() {
  const rendered = renderGreeceContent();
  guardAgainstNestedAnchors(rendered);
  spliceIntoIndexHtml(rendered);
  console.log('wrote generated greece content into index.html');
}

main();
