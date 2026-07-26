#!/usr/bin/env node
/**
 * Render Open Graph preview images by screenshotting the live site headers.
 *
 *   npm run og        # regenerate img/og/og-default.png and img/og/og-greece.png
 *
 * Boots a tiny static server against the generated site, drives headless Chromium with
 * Playwright, and captures two real elements verbatim:
 *
 *   - og-default.png — the mobile topbar (.topbar) at a phone viewport, which
 *     is the avatar + "Nick Stathas" hero people see when they first load the
 *     site on a phone. Polygonal blue background and all.
 *   - og-greece.png — the .gr-hero from the Greece guide at a desktop
 *     viewport, which is the "NICK'S GUIDE TO Athens & Beyond" header on top
 *     of the Athens skyline gradient.
 *
 * No CSS overrides for layout — both images use the exact code path the live
 * site uses. The Greece hero uses the checked-in Athens skyline cache, so the
 * screenshot is deterministic and works offline.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SITE_ROOT = path.join(ROOT, '_site');
const OUT_DIR = path.join(ROOT, 'img', 'og');

const SPA_ROUTES = new Set(['/about', '/github', '/resume', '/portfolio', '/greece']);
const MIME = {
  '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8',
  '.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8',
  '.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.ico':'image/x-icon','.webp':'image/webp','.woff':'font/woff','.woff2':'font/woff2',
  '.ttf':'font/ttf',
};

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    const normalized = urlPath.replace(/\/+$/, '') || '/';
    if (SPA_ROUTES.has(normalized)) urlPath = '/index.html';
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(SITE_ROOT, urlPath);
    if (!filePath.startsWith(SITE_ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function waitForImage(page, selector) {
  await page.waitForFunction(sel => {
    const img = document.querySelector(sel);
    return img && img.complete && img.naturalWidth > 0;
  }, selector, { timeout: 30000 });
}

async function waitForBackgroundImage(page, selector) {
  await page.waitForFunction(sel => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const bg = getComputedStyle(el).backgroundImage;
    if (!bg || bg === 'none') return false;
    const m = bg.match(/url\("?(.+?\.(?:jpe?g|png|webp))"?\)/i);
    if (!m) return true;
    return new Promise(res => {
      const img = new Image();
      img.onload = () => res(true);
      // Don't block forever; the gradient overlay alone still looks fine.
      img.onerror = () => res(true);
      img.src = m[1];
    });
  }, selector, { timeout: 20000 }).catch(() => {});
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await startServer();
  const port = server.address().port;
  const origin = `http://127.0.0.1:${port}`;
  console.log('serving', SITE_ROOT, 'on', origin);

  const browser = await chromium.launch({ args: ['--ignore-certificate-errors'] });

  /* ─── Default OG: mobile topbar hero at a phone viewport ───
     The mobile topbar is what triggers the avatar + name horizontal hero
     with the polygonal blue background. We render at iPhone-ish dimensions
     (414px wide), screenshot just the .topbar element, and let chromium's
     deviceScaleFactor 3 produce a sharp 1242px-wide image — close enough to
     OG's preferred ~1200px width that platforms render it crisply. */
  {
    const ctx = await browser.newContext({
      viewport: { width: 414, height: 896 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.goto(origin + '/about', { waitUntil: 'networkidle' });
    await waitForImage(page, '.avatar-hero');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.locator('#topbar').screenshot({
      path: path.join(OUT_DIR, 'og-default.png'),
    });
    await ctx.close();
    console.log('wrote og-default.png');
  }

  /* ─── Greece OG: gr-hero at desktop viewport ───
     The Greece guide is content-width-bound; at 1200px the gr-hero renders
     with the same proportions visitors see. */
  {
    const ctx = await browser.newContext({
      viewport: { width: 1200, height: 900 },
      deviceScaleFactor: 2,
      ignoreHTTPSErrors: true,
    });
    const page = await ctx.newPage();
    await page.goto(origin + '/greece', { waitUntil: 'networkidle' });
    // Force the Greece section active (the SPA also toggles this on navigation).
    await page.evaluate(() => {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      const g = document.getElementById('section-greece');
      if (g) g.classList.add('active');
    });
    await waitForBackgroundImage(page, '.gr-hero');
    await page.evaluate(() => document.fonts && document.fonts.ready);
    await page.locator('.gr-hero').screenshot({
      path: path.join(OUT_DIR, 'og-greece.png'),
    });
    await ctx.close();
    console.log('wrote og-greece.png');
  }

  await browser.close();
  server.close();
}

main().catch(err => { console.error(err); process.exit(1); });
