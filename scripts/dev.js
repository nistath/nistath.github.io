#!/usr/bin/env node
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const BUILD_SCRIPT = path.join(ROOT, 'scripts', 'build-content.js');
const BROWSER_SYNC = path.join(ROOT, 'node_modules', '.bin', 'browser-sync');

function runBuild() {
  const result = spawnSync(process.execPath, [BUILD_SCRIPT], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

function debounce(fn, delayMs) {
  let timer = null;
  return function debounced() {
    clearTimeout(timer);
    timer = setTimeout(fn, delayMs);
  };
}

runBuild();

const rebuild = debounce(runBuild, 120);
const watchDirs = [CONTENT_DIR];
for (const entry of fs.readdirSync(CONTENT_DIR, { withFileTypes: true })) {
  if (entry.isDirectory()) watchDirs.push(path.join(CONTENT_DIR, entry.name));
}

try {
  for (const dir of watchDirs) {
    const watcher = fs.watch(dir, (_event, filename) => {
      if (!filename || !/\.(ya?ml|md)$/.test(filename)) return;
      rebuild();
    });
    watcher.on('error', () => {
      console.warn('Content watch failed; run npm run content after edits.');
    });
  }
} catch {
  console.warn('Content watch unavailable; run npm run content after edits.');
}

const child = spawn(BROWSER_SYNC, ['start', '--config', 'bs-config.js'], {
  cwd: ROOT,
  stdio: 'inherit',
});

function shutdown(signal) {
  child.kill(signal);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code || 0);
});
