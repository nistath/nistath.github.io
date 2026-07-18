'use strict';

/* Per-route stub pages (github/, resume/, portfolio/, greece/).

   GitHub Pages serves these on direct hits so social crawlers see
   route-specific Open Graph metadata; the inline script then bounces
   real visitors into the SPA via /?route=... (mirrored by 404.html for
   routes without a stub directory, like /about). Keep the metadata here
   in sync with PAGE_META in js/main.js when adding a route. */

var { esc } = require('../lib/text');

var ROUTES = [
  {
    dir: 'github',
    route: '/github',
    title: 'Nick Stathas — GitHub',
    label: 'GitHub',
    themeColor: '#2b4557',
    background: '#2b4557',
    ogImage: 'https://nistath.com/img/og/og-default.png',
    preload: '/img/og/og-default.png',
  },
  {
    dir: 'resume',
    route: '/resume',
    title: 'Nick Stathas — Resume',
    label: 'Resume',
    themeColor: '#2b4557',
    background: '#2b4557',
    ogImage: 'https://nistath.com/img/og/og-default.png',
    preload: '/img/og/og-default.png',
  },
  {
    dir: 'portfolio',
    route: '/portfolio',
    title: 'Nick Stathas — Portfolio',
    label: 'Portfolio',
    themeColor: '#2b4557',
    background: '#2b4557',
    ogImage: 'https://nistath.com/img/og/og-default.png',
    preload: '/img/og/og-default.png',
  },
  {
    dir: 'greece',
    route: '/greece',
    title: "Nick's Guide to Athens & Beyond",
    label: 'Greece',
    themeColor: '#003c96',
    background: '#003c96',
    ogImage: 'https://nistath.com/img/og/og-greece.png',
    preload: '/img/og/og-greece.png',
  },
];

function renderStub(r) {
  return `<!DOCTYPE html>
<!-- GENERATED FILE — DO NOT EDIT BY HAND. See build/templates/stubs.js; rebuild with \`npm run build\`. -->
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta http-equiv="x-ua-compatible" content="ie=edge">
  <title>${esc(r.title)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="${r.themeColor}">
  <meta name="author" content="Nick Stathas">
  <meta name="robots" content="index,follow">
  <link rel="canonical" href="https://nistath.com${r.route}">
  <link rel="manifest" href="/site.webmanifest">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="mask-icon" href="/favicon.svg" color="#2b4557">

  <!-- Open Graph -->
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Nick Stathas">
  <meta property="og:title" content="${esc(r.title)}">
  <meta property="og:url" content="https://nistath.com${r.route}">
  <meta property="og:image" content="${r.ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${esc(r.title)}">
  <meta property="og:locale" content="en_US">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(r.title)}">
  <meta name="twitter:image" content="${r.ogImage}">
  <meta name="twitter:image:alt" content="${esc(r.title)}">

  <link rel="preload" as="image" href="${r.preload}">
  <script>
    (function() {
      try {
        location.replace('/?route=' + encodeURIComponent('${r.route}'));
      } catch (err) {
        location.href = '/?route=' + encodeURIComponent('${r.route}');
      }
    }());
  </script>
  <noscript>
    <meta http-equiv="refresh" content="0;url=/">
  </noscript>
  <style>
    html, body { margin: 0; padding: 0; background: ${r.background}; color: #e6edf3;
      font: 16px/1.5 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    main { min-height: 100vh; display: grid; place-items: center; padding: 24px;
      text-align: center; }
    a { color: #68a7cb; }
  </style>
</head>
<body>
  <main>
    <div>
      <p>Loading ${esc(r.label)}…</p>
      <p><a href="/">Continue to nistath.com</a></p>
    </div>
  </main>
</body>
</html>
`;
}

module.exports = { ROUTES: ROUTES, renderStub: renderStub };
