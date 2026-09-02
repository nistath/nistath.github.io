#!/usr/bin/env node
/**
 * Geometry checks against the built site, in a real browser.
 *
 *   npm run check:layout
 *
 * scripts/check-generated.cjs reads the artifact; this drives it. The bugs it
 * exists for are the ones that only appear at a particular size — a column
 * narrow enough to leave one word per line, a card that overflows its track
 * and slides under a sticky aside, a control that lands below a fold the page
 * cannot scroll to. None of those are visible in the markup.
 *
 * The viewport matrix is the shapes that have actually broken: a phone in
 * both orientations, the band where the sidebar leaves the content pane far
 * narrower than the window, and ordinary desktop sizes.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { loadContent } = require('./content/load-content.cjs');
const { siteRoutes } = require('./content/routes.cjs');

const ROOT = path.resolve(__dirname, '..');
const SITE = path.join(ROOT, '_site');
const ROUTES = siteRoutes(loadContent()).map((route) => route.path);
const SPA_ROUTES = new Set(ROUTES);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.pfb': 'application/octet-stream', '.pdf': 'application/pdf',
};

/* Every shape below is one that has broken before.  The width band from 900
   to 1199 is the one that matters most: the sidebar takes 300px, so the guide
   is working with 600-900px while the window says otherwise. */
const VIEWPORTS = [
  { name: 'phone portrait', width: 402, height: 874, phone: true },
  { name: 'phone landscape', width: 874, height: 402, phone: true },
  { name: 'small phone landscape', width: 568, height: 320, phone: true },
  { name: 'tablet portrait', width: 768, height: 1024 },
  { name: 'narrow desktop', width: 900, height: 985 },
  { name: 'desktop 1024', width: 1024, height: 996 },
  { name: 'desktop 1180', width: 1180, height: 900 },
  { name: 'desktop 1280', width: 1280, height: 900 },
  { name: 'desktop 1440', width: 1440, height: 900 },
  { name: 'short desktop', width: 1440, height: 520 },
  { name: 'wide desktop', width: 1920, height: 1080 },
];

/* Narrower than this and a card is a column of single words. */
const MIN_READABLE_CARD_PX = 180;

const failures = [];
let checks = 0;

function expect(ok, message) {
  checks += 1;
  if (!ok) failures.push(message);
}

function startServer() {
  const server = http.createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);
    const normalized = urlPath.replace(/\/+$/, '') || '/';
    if (SPA_ROUTES.has(normalized)) urlPath = `${normalized}/index.html`;
    if (urlPath === '/') urlPath = '/index.html';
    const filePath = path.join(SITE, urlPath);
    if (!filePath.startsWith(SITE)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* Runs in the page.  A grid item's default minimum is its min-content width,
   so a card holding one long unbreakable name refuses to shrink and overflows
   its track — under a sticky aside, in the guide's case.  Current content is
   short enough to hide that, so put a long name in and see whether the track
   still holds it.  Restores the card before returning. */
function stressLongestName() {
  /* Not every section has a venue list — the first one does not — so find a
     column that actually holds one rather than trusting the first .gr-body. */
  const body = Array.from(document.querySelectorAll('#section-greece .gr-body'))
    .find((el) => el.querySelector('.gr-venue-name') && el.getBoundingClientRect().width > 0);
  const name = body && body.querySelector('.gr-venue-name');
  if (!body || !name) return null;

  const card = name.closest('.gr-venue');
  const original = name.textContent;
  name.textContent = 'Loukoumadakipapagiannopouloukonstantinopoulos';
  void body.offsetWidth;

  const overflow = Math.round(
    card.getBoundingClientRect().right - body.getBoundingClientRect().right
  );

  name.textContent = original;
  void body.offsetWidth;
  return overflow;
}

/* Runs in the page.  Returns everything the assertions below need, measured
   once so a single layout pass answers all of them. */
function measure() {
  const rect = (el) => el.getBoundingClientRect();
  const visible = (el) => {
    const r = rect(el);
    return r.width > 0 && r.height > 0;
  };
  const onScreen = (el) => {
    const r = rect(el);
    return r.height > 0 && r.top >= -1 && r.bottom <= window.innerHeight + 1
      && r.left >= -1 && r.right <= window.innerWidth + 1;
  };

  const doc = document.documentElement;
  const active = document.querySelector('.section.active');
  const result = {
    route: location.pathname,
    pageScrollsSideways: doc.scrollWidth > doc.clientWidth + 1,
    sectionScrollsSideways: active ? active.scrollWidth > active.clientWidth + 1 : false,
    navReachable: true,
    guide: null,
  };

  /* Whichever nav is on screen, every entry in it has to be reachable
     without scrolling a box that cannot scroll. */
  const shellNav = getComputedStyle(document.getElementById('sidebar')).display === 'none'
    ? '.topbar-nav .tab'
    : '.sidebar-nav .nav-btn';
  const navItems = Array.from(document.querySelectorAll(shellNav));
  result.navCount = navItems.length;
  result.navOffScreen = navItems.filter((el) => !onScreen(el)).map((el) => el.textContent.trim());
  if (shellNav === '.sidebar-nav .nav-btn') {
    result.navOffScreen = result.navOffScreen.concat(
      Array.from(document.querySelectorAll('.sidebar .social-link')).filter((el) => !onScreen(el)).map(() => 'social')
    );
  }

  const wrap = document.querySelector('#section-greece .greece-wrap');
  if (wrap && visible(wrap)) {
    const body = document.querySelector('#section-greece .gr-body');
    const aside = document.querySelector('#section-greece .gr-aside');
    const bodyR = body ? rect(body) : null;
    const asideR = aside && visible(aside) ? rect(aside) : null;
    const CARDS = '.gr-venue, .gr-other-card, .gr-sight';
    const cards = Array.from(document.querySelectorAll('#section-greece ' + CARDS)).filter(visible);
    /* Only the cards inside the main column can overflow it or reach the
       aside; the island cards sit in a full-width section of their own. */
    const columnCards = body ? Array.from(body.querySelectorAll(CARDS)).filter(visible) : [];

    const overlapsAside = (r) => Boolean(asideR)
      && r.right > asideR.left + 1 && r.left < asideR.right - 1
      && r.bottom > asideR.top + 1 && r.top < asideR.bottom - 1;

    const tips = Array.from(document.querySelectorAll('#section-greece .gr-aside .gr-tip')).filter(visible);

    result.guide = {
      width: Math.round(rect(wrap).width),
      cards: cards.length,
      narrowestCard: cards.length ? Math.round(Math.min(...cards.map((c) => rect(c).width))) : null,
      cardsPastMainColumn: bodyR ? columnCards.filter((c) => rect(c).right > bodyR.right + 1).length : 0,
      cardsOverlappingAside: columnCards.filter((c) => overlapsAside(rect(c))).length,
      navPinned: null,
      /* A tip whose body is collapsed but whose title is not a button can
         never be opened: its content is simply gone. */
      unreachableTips: tips.filter((tip) => {
        const inner = tip.querySelector('.gr-tip-body-inner');
        if (!inner) return false;
        const collapsed = rect(inner).height < 1;
        const toggleable = tip.querySelector('.gr-tip-title[role="button"]') !== null;
        return collapsed && !toggleable;
      }).length,
      /* Above the chips is the sheet's lip plus the bar's own padding; below
         is the padding alone.  They should read as the same band. */
      navSpaceAbove: null,
      navSpaceBelow: null,
      navCentred: null,
    };

    const nav = document.getElementById('gr-nav');
    const rail = document.querySelector('.gr-nav-rail');
    if (nav && rail) {
      const navR = rect(nav);
      const railR = rect(rail);
      const chips = Array.from(nav.querySelectorAll('.gr-nav-btn'));
      const first = chips.length ? rect(chips[0]) : null;
      const last = chips.length ? rect(chips[chips.length - 1]) : null;
      const lip = parseFloat(getComputedStyle(wrap).getPropertyValue('--gr-sheet-lip')) || 0;
      const padTop = parseFloat(getComputedStyle(nav).paddingTop) || 0;
      const padBottom = parseFloat(getComputedStyle(nav).paddingBottom) || 0;
      result.guide.navSpaceAbove = Math.round(lip + padTop);
      result.guide.navSpaceBelow = Math.round(padBottom);
      /* Whether the rail still has something to scroll to, which is the only
         stable answer: the last chip's right edge lands within a pixel of the
         rail's a good 40px before the overflow actually goes away, so reading
         the edges makes this a coin toss that different font metrics — CI's
         against a local machine's — land on opposite sides of. */
      result.guide.railFits = rail.scrollWidth <= rail.clientWidth + 1;
      if (result.guide.railFits && first && last) {
        const chipsCentre = (first.left + last.right) / 2;
        result.guide.navCentred = Math.abs(chipsCentre - (navR.left + navR.width / 2)) <= 2;
      }
      result.guide.navFirstChipReachable = first ? first.left >= railR.left - 1 : true;
    }
  }

  return result;
}

async function main() {
  if (!fs.existsSync(path.join(SITE, 'index.html'))) {
    throw new Error('Missing _site/index.html; run npm run build first');
  }

  const server = await startServer();
  const origin = `http://127.0.0.1:${server.address().port}`;
  /* CHROMIUM_PATH is for sandboxes that ship a browser Playwright did not
     install itself; normally Playwright finds its own. */
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
  );

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: Boolean(viewport.phone),
      hasTouch: Boolean(viewport.phone),
    });
    const page = await context.newPage();

    for (const route of ROUTES) {
      await page.goto(origin + route, { waitUntil: 'load' });
      await page.waitForTimeout(500);
      const at = `${viewport.name} ${route}`;
      const m = await page.evaluate(measure);

      expect(!m.pageScrollsSideways, `${at}: the page scrolls sideways`);
      expect(!m.sectionScrollsSideways, `${at}: the section scrolls sideways`);
      expect(m.navCount > 0, `${at}: no navigation is on screen`);
      expect(
        m.navOffScreen.length === 0,
        `${at}: navigation is off screen (${m.navOffScreen.join(', ')})`
      );

      if (!m.guide) continue;
      const g = m.guide;
      const stressOverflow = await page.evaluate(stressLongestName);
      expect(
        stressOverflow === null || stressOverflow <= 1,
        `${at}: a card with a long name overflows its column by ${stressOverflow}px`
      );
      expect(
        g.narrowestCard === null || g.narrowestCard >= MIN_READABLE_CARD_PX,
        `${at}: a guide card is ${g.narrowestCard}px wide in a ${g.width}px guide (min ${MIN_READABLE_CARD_PX})`
      );
      expect(g.cardsPastMainColumn === 0, `${at}: ${g.cardsPastMainColumn} guide cards overflow their column`);
      expect(g.cardsOverlappingAside === 0, `${at}: ${g.cardsOverlappingAside} guide cards sit under the aside`);
      expect(g.unreachableTips === 0, `${at}: ${g.unreachableTips} tip cards are collapsed and cannot be opened`);
      expect(g.navFirstChipReachable !== false, `${at}: the first guide nav chip is scrolled out of reach`);
      /* The sheet's lip is above the chips only while the bar is unpinned,
         so the two bands can never be exactly equal; this is the margin
         within which they still read as one even band. */
      expect(
        Math.abs(g.navSpaceAbove - g.navSpaceBelow) <= 8,
        `${at}: the guide nav band is lopsided (${g.navSpaceAbove}px above the chips, ${g.navSpaceBelow}px below)`
      );
      if (g.railFits) {
        expect(g.navCentred, `${at}: the guide nav chips fit but are not centred`);
      }
    }

    await context.close();
  }

  await browser.close();
  server.close();

  if (failures.length) {
    for (const failure of failures) console.error(`  ${failure}`);
    throw new Error(`${failures.length} of ${checks} layout checks failed`);
  }
  console.log(`Layout checks passed (${checks} across ${VIEWPORTS.length} viewports).`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
