const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

const rootDir = path.resolve(__dirname, '..');
const contentDir = path.join(rootDir, 'content');
const indexPath = path.join(rootDir, 'index.html');

const beginMarker = '<!-- BEGIN GENERATED: greece-content (edit content/greece.njk, then run `npm run content`) -->';
const endMarker = '<!-- END GENERATED: greece-content -->';

const env = new nunjucks.Environment(
  new nunjucks.FileSystemLoader(contentDir, { noCache: true }),
  {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true,
    throwOnUndefined: true,
  }
);

function assertSingleMarker(source, marker) {
  const first = source.indexOf(marker);
  if (first === -1) {
    throw new Error('Missing generated-content marker: ' + marker);
  }
  if (source.indexOf(marker, first + marker.length) !== -1) {
    throw new Error('Duplicate generated-content marker: ' + marker);
  }
  return first;
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function assertNoNestedCardAnchors(rendered) {
  const guardedClasses = [
    'gr-venue-name',
    'gr-venue-desc',
    'gr-sight-name',
    'gr-sight-desc',
  ];
  const divPattern = /<div\b([^>]*)>([\s\S]*?)<\/div>/gi;
  let match;

  while ((match = divPattern.exec(rendered)) !== null) {
    const attrs = match[1];
    const body = match[2];
    const classMatch = attrs.match(/\bclass="([^"]*)"/i);
    if (!classMatch) {
      continue;
    }

    const classes = classMatch[1].split(/\s+/);
    const guardedClass = guardedClasses.find(function(className) {
      return classes.indexOf(className) !== -1;
    });

    if (guardedClass && /<a\b/i.test(body)) {
      throw new Error(
        'Nested anchor guard failed: found <a> inside .' +
          guardedClass +
          ' near rendered line ' +
          lineNumber(rendered, match.index) +
          '. Use .gr-inline-link only outside full-card .gr-venue/a.gr-sight wrappers, or use groupedSight().'
      );
    }
  }
}

function indentRendered(rendered, indent) {
  return rendered
    .trim()
    .split(/\r?\n/)
    .map(function(line) {
      return line ? indent + line : '';
    })
    .join('\n');
}

const rendered = env.render('greece.njk');
assertNoNestedCardAnchors(rendered);

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const beginIndex = assertSingleMarker(indexHtml, beginMarker);
const endIndex = assertSingleMarker(indexHtml, endMarker);

if (endIndex <= beginIndex) {
  throw new Error('Generated-content markers are out of order.');
}

const beginLineStart = indexHtml.lastIndexOf('\n', beginIndex) + 1;
const markerIndent = indexHtml.slice(beginLineStart, beginIndex);
const before = indexHtml.slice(0, beginIndex + beginMarker.length);
const after = indexHtml.slice(endIndex);
const nextIndexHtml =
  before +
  '\n' +
  indentRendered(rendered, markerIndent) +
  '\n' +
  markerIndent +
  after;

fs.writeFileSync(indexPath, nextIndexHtml, 'utf8');
