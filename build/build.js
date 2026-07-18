#!/usr/bin/env node
'use strict';

/* Static build for nistath.com.

   Reads content/*.yaml, renders build/templates/*, and writes the
   generated pages (index.html and the per-route stubs) into the repo
   root, where GitHub Pages serves them directly. Deterministic: same
   inputs always produce byte-identical output.

     node build/build.js           build and write
     node build/build.js --check   validate + render without writing

   Fails loudly (non-zero exit, precise messages) on invalid content so
   a bad phone edit can never half-render the live site. */

var fs = require('fs');
var path = require('path');
var { loadContent } = require('./lib/content');
var { renderPage } = require('./templates/page');
var { ROUTES, renderStub } = require('./templates/stubs');

var ROOT = path.join(__dirname, '..');

function build(options) {
  var checkOnly = options && options.checkOnly;
  var content = loadContent(ROOT);
  var outputs = [{ file: 'index.html', html: renderPage(content) }];
  ROUTES.forEach(function(route) {
    outputs.push({ file: path.join(route.dir, 'index.html'), html: renderStub(route) });
  });

  outputs.forEach(function(out) {
    var dest = path.join(ROOT, out.file);
    if (checkOnly) {
      console.log('ok       ' + out.file + ' (' + out.html.length + ' bytes, not written)');
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    var previous = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : null;
    if (previous === out.html) {
      console.log('unchanged ' + out.file);
    } else {
      fs.writeFileSync(dest, out.html);
      console.log('wrote    ' + out.file + ' (' + out.html.length + ' bytes)');
    }
  });
}

module.exports = { build: build };

if (require.main === module) {
  try {
    build({ checkOnly: process.argv.indexOf('--check') !== -1 });
  } catch (err) {
    console.error('\nBUILD FAILED\n');
    console.error(err.message);
    process.exit(1);
  }
}
