#!/usr/bin/env node
/**
 * Render Open Graph preview images by screenshotting the live site headers.
 *
 *   npm run og        # regenerate img/og/og-default.png and img/og/og-greece.png
 *
 * Boots a tiny static server against the repo, drives headless Chromium with
 * Playwright, clips the relevant hero element on each route, and writes a
 * 1200x630 PNG suitable for Open Graph / Twitter / Messenger / iMessage.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'img', 'og');
const PORT = 0; // ephemeral

const SPA_ROUTES = new Set(['/about', '/github', '/resume', '/portfolio', '/greece']);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.pdf':  'application/pdf',
  '.txt':  'text/plain; charset=utf-8',
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    const normalized = urlPath.replace(/\/+$/, '') || '/';
    // SPA route fallback so /greece etc. load index.html with the right URL.
    if (SPA_ROUTES.has(normalized)) urlPath = '/index.html';
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(ROOT, urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(PORT, '127.0.0.1', () => resolve(server)));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  console.log('serving', ROOT, 'on', origin);

  const browser = await chromium.launch({
    args: ['--ignore-certificate-errors'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 800 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();

  /* ─── Default OG: profile hero (avatar + name on dark blue) ─── */
  await page.goto(origin + '/about', { waitUntil: 'networkidle' });
  // Force the topbar-hero (normally only shown on mobile) to render at OG
  // dimensions, hide everything else. The selector wins via !important.
  await page.addStyleTag({ content: `
    html, body { background: #2b4557 !important; margin: 0 !important; }
    #app { display: block !important; grid: none !important; background: #2b4557 !important; }
    #sidebar, .topbar-nav, .topbar-compact-wrap, .sticky-header,
    .hero-social-row, .section, .gr-nav, footer,
    #content > main, #content > .section, #mobile-spill { display: none !important; }
    #content { display: block !important; }
    /* Solid --shell-hero-dark to match the reference; no polygon texture. */
    #topbar { display: block !important; position: static !important;
      grid-area: auto !important;
      width: 1200px !important; height: 630px !important;
      background: #2b4557 !important;
      box-shadow: none !important; padding: 0 !important; margin: 0 !important; }
    #topbar::before, #topbar::after { display: none !important; }
    .topbar-hero-wrap { display: block !important; height: 100% !important;
      width: 100% !important; padding: 0 !important; overflow: visible !important;
      position: relative !important; }
    .topbar-hero { display: grid !important;
      grid-template-columns: 320px 1fr !important;
      grid-template-areas: "avatar name" !important;
      align-items: center !important;
      justify-content: start !important;
      column-gap: 72px !important; row-gap: 0 !important;
      width: 100% !important; height: 100% !important;
      padding: 0 100px !important;
      box-sizing: border-box !important; }
    .avatar-hero { grid-area: avatar !important;
      width: 320px !important; height: 320px !important;
      border-radius: 18px !important;
      box-shadow: 0 24px 60px rgba(0,0,0,0.4),
                  0 0 0 4px rgba(255,255,255,0.10) !important; }
    .hero-name { grid-area: name !important;
      font-family: 'Inter', 'Segoe UI', sans-serif !important;
      font-weight: 800 !important; font-size: 144px !important;
      line-height: 0.96 !important; letter-spacing: -0.03em !important;
      color: #ffffff !important; width: auto !important; max-width: none !important;
      text-shadow: 0 4px 24px rgba(0,0,0,0.35) !important; }
  `});
  await page.waitForFunction(() => {
    const img = document.querySelector('.avatar-hero');
    return img && img.complete && img.naturalWidth > 0;
  }, { timeout: 30000 });
  await page.evaluate(() => document.fonts && document.fonts.ready);

  await page.locator('#topbar').screenshot({
    path: path.join(OUT_DIR, 'og-default.png'),
    omitBackground: false,
  });
  console.log('wrote og-default.png');

  /* ─── Greece OG: just the gr-hero ─── */
  await page.goto(origin + '/greece', { waitUntil: 'networkidle' });
  // Belt-and-suspenders: ensure the SPA actually activated the greece section
  // before applying our screenshot CSS, since the .active class drives opacity.
  await page.evaluate(() => {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const g = document.getElementById('section-greece');
    if (g) g.classList.add('active');
  });
  await page.addStyleTag({ content: `
    /* Match the gradient's 0% color so any alpha stops blend cleanly even
       when the Athens skyline image fails to load. */
    html, body { margin: 0 !important; background: #003c96 !important; }
    #sidebar, #topbar, .sticky-header, .gr-nav, .gr-section, footer,
    #mobile-spill { display: none !important; }
    #app { display: block !important; grid: none !important; background: #003c96 !important; }
    #content { display: block !important; position: static !important; }
    .section { position: static !important; opacity: 1 !important;
      pointer-events: auto !important; inset: auto !important; }
    .greece-wrap { background: #003c96 !important; width: 1200px !important; }
    .gr-hero {
      width: 1200px !important;
      height: 630px !important;
      padding: 0 96px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: center !important;
      align-items: flex-start !important;
      box-sizing: border-box !important;
    }
    .gr-hero-eyebrow { font-size: 24px !important; letter-spacing: 7px !important;
      margin-bottom: 28px !important; color: rgba(255,255,255,0.72) !important; }
    .gr-hero h1 { font-size: 148px !important; line-height: 1.0 !important;
      max-width: 100% !important; }
    .gr-hero h1 em { font-size: 0.78em !important; }
  `});
  // Wait for hero background image (Wikimedia) to load.
  await page.waitForFunction(() => {
    const el = document.querySelector('.gr-hero');
    if (!el) return false;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return false;
    // Decode & wait via Image() to ensure backing file is in cache.
    const matches = bg.match(/url\("?(.+?\.(?:jpe?g|png|webp))"?\)/i);
    if (!matches) return true;
    const test = new Image();
    test.src = matches[1];
    return test.complete && test.naturalWidth > 0;
  }, { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready);

  await page.locator('.gr-hero').screenshot({
    path: path.join(OUT_DIR, 'og-greece.png'),
  });
  console.log('wrote og-greece.png');

  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
