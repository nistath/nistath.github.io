#!/usr/bin/env node
'use strict';

/* Local dev: build once, watch content/ and build/ for changes and
   rebuild, and serve with BrowserSync (live reload + SPA route fallback
   from bs-config.js). BrowserSync notices the rewritten index.html via
   its own `files` watcher and reloads the browser. */

var fs = require('fs');
var path = require('path');
var { build } = require('./build');

var ROOT = path.join(__dirname, '..');
var WATCH_DIRS = ['content', 'build', 'build/lib', 'build/templates'];

function rebuild(reason) {
  /* Re-require so template/lib edits are picked up without restarting. */
  Object.keys(require.cache).forEach(function(key) {
    if (key.startsWith(__dirname)) delete require.cache[key];
  });
  try {
    require('./build').build({});
    console.log('[build] ok' + (reason ? ' (' + reason + ')' : ''));
  } catch (err) {
    console.error('[build] FAILED — the previous output is still being served');
    console.error(err.message);
  }
}

try {
  build({});
} catch (err) {
  console.error('[build] FAILED on startup:');
  console.error(err.message);
}

var timer = null;
WATCH_DIRS.forEach(function(dir) {
  fs.watch(path.join(ROOT, dir), function(event, filename) {
    if (!filename || filename.endsWith('~') || filename.startsWith('.')) return;
    clearTimeout(timer);
    timer = setTimeout(function() { rebuild(dir + '/' + filename); }, 120);
  });
});
console.log('[watch] rebuilding on changes in: ' + WATCH_DIRS.join(', '));

var bs = require('browser-sync').create();
bs.init(require(path.join(ROOT, 'bs-config.js')));
