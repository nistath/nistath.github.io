/* ── Email deobfuscation ── */
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode(
      (c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
    );
  });
}

var email = rot13('avfgngu@zvg.rqh');

/* Sidebar email (desktop) */
var emailEl   = document.getElementById('email');
var emailText = document.getElementById('email-text');
if (emailEl && emailText) {
  emailText.textContent = email;
  emailEl.setAttribute('href', 'mailto:' + email);
}

/* Mobile topbar hero email */
var emailTopbar     = document.getElementById('email-topbar');
var emailTextTopbar = document.getElementById('email-text-topbar');
if (emailTopbar && emailTextTopbar) {
  emailTextTopbar.textContent = email;
  emailTopbar.setAttribute('href', 'mailto:' + email);
}

/* ── Which shell is on screen ──
   The site has two presentations and the choice is about the space
   available, not the width alone: a phone held in landscape reports
   874×402, wide enough to clear any width-only breakpoint and nowhere near
   tall enough for a full-height sidebar.  css/main.css switches on this
   exact string; the two must stay in step. */
var COMPACT_SHELL_QUERY = '(max-width: 767px), (max-height: 600px) and (pointer: coarse)';
var compactShell = window.matchMedia(COMPACT_SHELL_QUERY);

function isCompactShell() {
  return compactShell.matches;
}

/* Mobile hero email: switch to icon-only only when its actual width is too small. */
var HERO_EMAIL_ICON_ONLY_WIDTH_PX = 120;

function updateHeroEmailMode() {
  if (!emailTopbar) return;

  if (!isCompactShell()) {
    emailTopbar.classList.remove('hero-email-inline--icon-only');
    return;
  }

  var buttonWidth = emailTopbar.clientWidth || 0;
  var shouldBeIconOnly = buttonWidth > 0 && buttonWidth < HERO_EMAIL_ICON_ONLY_WIDTH_PX;
  emailTopbar.classList.toggle('hero-email-inline--icon-only', shouldBeIconOnly);
}

if (emailTopbar) {
  window.addEventListener('resize', updateHeroEmailMode, { passive: true });
  if ('ResizeObserver' in window) {
    var heroEmailResizeObserver = new ResizeObserver(updateHeroEmailMode);
    heroEmailResizeObserver.observe(emailTopbar);
  }
  requestAnimationFrame(updateHeroEmailMode);
}

/* Mobile compact sticky row email */
var emailTopbarCompact = document.getElementById('email-topbar-compact');
if (emailTopbarCompact) {
  emailTopbarCompact.setAttribute('href', 'mailto:' + email);
}

/* ── Navigation state ──
   The build injects the route registry (scripts/content/routes.cjs), so a
   route the site does not generate — an empty content/portfolio/, say — is
   simply absent here, and every path, title, social card, and surface color
   comes from the same record the redirect stubs were built from. */
var githubLoaded = false;
var resumeLoaded = false;
var activeSection = null;
var ROUTES = (window.SITE_CONTENT && window.SITE_CONTENT.routes) || [];
var DEFAULT_SECTION = ROUTES.length ? ROUTES[0].id : null;

function routeById(section) {
  for (var i = 0; i < ROUTES.length; i++) {
    if (ROUTES[i].id === section) return ROUTES[i];
  }
  return null;
}

function routeByPath(pathname) {
  for (var i = 0; i < ROUTES.length; i++) {
    if (ROUTES[i].path === pathname) return ROUTES[i];
  }
  return null;
}

var SITE_ORIGIN = 'https://nistath.com';

function setMetaContent(selector, value) {
  var el = document.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

function updateSocialMeta(route) {
  var absUrl = SITE_ORIGIN + route.path;
  var absImg = SITE_ORIGIN + route.social.image;

  setMetaContent('meta[property="og:title"]', route.social.title);
  setMetaContent('meta[property="og:url"]', absUrl);
  setMetaContent('meta[property="og:image"]', absImg);
  setMetaContent('meta[property="og:image:alt"]', route.social.title);
  setMetaContent('meta[name="twitter:title"]', route.social.title);
  setMetaContent('meta[name="twitter:image"]', absImg);
  setMetaContent('meta[name="twitter:image:alt"]', route.social.title);

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', absUrl);
}

function setMobilePageSurface(route) {
  document.documentElement.style.setProperty('--mobile-page-bg', route.surface);
}

/* ── Sync <meta name="theme-color"> from the CSS variable so
   --shell-hero-dark is the single source of truth. ── */
var themeColorMeta = document.querySelector('meta[name="theme-color"]');
if (themeColorMeta) {
  var shellHeroDark = getComputedStyle(document.documentElement)
    .getPropertyValue('--shell-hero-dark').trim();
  if (shellHeroDark) themeColorMeta.setAttribute('content', shellHeroDark);
}

function normalizeRoutePath(pathname) {
  if (!pathname) return '/';

  var normalized = pathname.replace(/\/index\.html$/, '').replace(/\/+$/, '');
  return normalized || '/';
}

function getSectionFromPath(pathname) {
  var route = routeByPath(normalizeRoutePath(pathname));
  return route ? route.id : DEFAULT_SECTION;
}

/* ── Resume ──
   The route reads the document in place; nobody is sent off the site to see
   it.  How it is drawn depends on what the browser can do, which is asked
   directly rather than guessed from the viewport:

   - embed    the browser has an inline PDF viewer of its own (every desktop
              browser). Handing it the file gives real text, real selection,
              search, and printing for free.
   - render   it does not (no browser on iOS does, and neither does Chrome
              on Android). pdf.js paints the pages into canvases instead.
   - fallback the file could not be fetched at all — a cross-origin host
              that sends no CORS headers, or an offline reader. The card
              links out, which is the only thing left that can work.

   pdf.js is vendored under /vendor/pdfjs and only requested by the browsers
   that reach the render path, so the desktop route stays as light as it was
   and the phone downloads it once, on the route that needs it. */
var RESUME = (window.SITE_CONTENT && window.SITE_CONTENT.resume) || null;
var PDFJS_MODULE_URL = '/vendor/pdfjs/pdf.min.mjs';
var PDFJS_WORKER_URL = '/vendor/pdfjs/pdf.worker.min.mjs';
var PDFJS_STANDARD_FONTS_URL = '/vendor/pdfjs/standard_fonts/';
/* Painting above the device's own density buys headroom for a pinch-zoom
   before the sheet turns soft.  The two caps are what keep that affordable
   on a phone: iOS gives a tab a hard canvas-area budget and discards the
   backing store of anything past it — a blank page where a rendered one
   should be — so no single page may be enormous, and the pages together may
   not be either.  A resume never comes near the budget; a long document
   loses sharpness instead of losing pages. */
var RESUME_OVERSAMPLE = 1.5;
var RESUME_MAX_CANVAS_PX = 2400;
var RESUME_MAX_TOTAL_PX = 24e6;
var RESUME_PAGE_ASPECT_GUESS = 1.4;
var RESUME_REPAINT_THRESHOLD_PX = 32;

var resumeSection = document.getElementById('section-resume');
var resumeDoc = null;
var resumePaintedWidth = 0;

function setResumeState(state) {
  if (!resumeSection) return;
  resumeSection.classList.remove('resume--embed', 'resume--render', 'resume--fallback');
  resumeSection.classList.add('resume--' + state);
}

/* Does this browser display a PDF inline when given one?  navigator
   .pdfViewerEnabled answers exactly that question and is the whole reason
   this can be a capability test rather than a guess about screen size.
   Engines predating it only ever advertised a PDF plug-in on desktop. */
function browserRendersPdfInline() {
  if (typeof navigator.pdfViewerEnabled === 'boolean') return navigator.pdfViewerEnabled;
  return Boolean(navigator.mimeTypes && navigator.mimeTypes['application/pdf']);
}

function embedResume() {
  var frame = document.querySelector('#section-resume iframe[data-src]');
  if (frame) {
    frame.setAttribute('src', frame.dataset.src);
    frame.removeAttribute('data-src');
  }
  setResumeState('embed');
}

/* Pages are painted one after another rather than all at once: a phone
   holding several full-resolution page bitmaps at the same time is how this
   turns into a memory warning. */
function paintResumePages() {
  var host = document.getElementById('resume-pages');
  if (!host || !resumeDoc) return Promise.resolve();

  var cssWidth = host.clientWidth;
  if (!cssWidth) return Promise.resolve();

  resumePaintedWidth = cssWidth;
  var density = Math.min(3, (window.devicePixelRatio || 1) * RESUME_OVERSAMPLE);
  var pixelWidth = Math.min(RESUME_MAX_CANVAS_PX, Math.round(cssWidth * density));

  /* Spend the whole-document budget evenly, and never below the width the
     page is displayed at — a soft sheet still beats a blank one. */
  var perPageBudget = RESUME_MAX_TOTAL_PX / resumeDoc.numPages;
  if (pixelWidth * pixelWidth * RESUME_PAGE_ASPECT_GUESS > perPageBudget) {
    pixelWidth = Math.max(
      Math.round(cssWidth),
      Math.floor(Math.sqrt(perPageBudget / RESUME_PAGE_ASPECT_GUESS))
    );
  }

  var painted = document.createDocumentFragment();
  var chain = Promise.resolve();

  for (var number = 1; number <= resumeDoc.numPages; number++) {
    chain = chain.then(paintOnePage(number, pixelWidth, painted));
  }

  return chain.then(function() {
    host.innerHTML = '';
    host.appendChild(painted);
  });
}

function paintOnePage(number, pixelWidth, painted) {
  return function() {
    return resumeDoc.getPage(number).then(function(page) {
      var unscaled = page.getViewport({ scale: 1 });
      var viewport = page.getViewport({ scale: pixelWidth / unscaled.width });
      var canvas = document.createElement('canvas');
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      painted.appendChild(canvas);

      return page.render({
        canvasContext: canvas.getContext('2d'),
        viewport: viewport
      }).promise;
    });
  };
}

function renderResume() {
  setResumeState('render');
  var status = document.getElementById('resume-viewer-status');

  return import(PDFJS_MODULE_URL).then(function(pdfjs) {
    pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
    return pdfjs.getDocument({
      url: RESUME.pdfUrl,
      standardFontDataUrl: PDFJS_STANDARD_FONTS_URL
    }).promise;
  }).then(function(doc) {
    resumeDoc = doc;
    return paintResumePages();
  }).then(function() {
    if (status) status.hidden = true;
  }).catch(function(error) {
    /* Anything at all — a blocked cross-origin fetch, a parse failure, a
       browser without dynamic import — lands on the link that still works.
       The most likely cause by far is the first, and it is not the visitor's
       to fix, so leave the owner a note rather than a silent downgrade. */
    if (window.console && console.warn) {
      console.warn(
        'Resume: could not render ' + RESUME.pdfUrl + ' inline, falling back to a link. '
        + 'If this is a cross-origin fetch the host is refusing, host the PDF in this '
        + 'repository and point content/resume.yml at its path instead.',
        error
      );
    }
    setResumeState('fallback');
  });
}

function loadResume() {
  if (resumeLoaded || !RESUME || !resumeSection) return;
  resumeLoaded = true;

  if (browserRendersPdfInline()) {
    embedResume();
    return;
  }
  renderResume();
}

/* A rotation changes the column width, and a canvas painted for the old one
   is either soft or oversized.  Repaint from the document already in memory
   once the width has settled and actually moved. */
var resumeRepaintTimer = null;

function scheduleResumeRepaint() {
  if (!resumeDoc) return;

  var host = document.getElementById('resume-pages');
  if (!host || !host.clientWidth) return;
  if (Math.abs(host.clientWidth - resumePaintedWidth) < RESUME_REPAINT_THRESHOLD_PX) return;

  window.clearTimeout(resumeRepaintTimer);
  resumeRepaintTimer = window.setTimeout(paintResumePages, 250);
}

window.addEventListener('resize', scheduleResumeRepaint, { passive: true });

function restoreSectionRoute() {
  var params = new URLSearchParams(window.location.search);
  var requestedRoute = params.get('route');

  if (!requestedRoute || normalizeRoutePath(window.location.pathname) !== '/') return;

  var requestedUrl;
  try {
    requestedUrl = new URL(requestedRoute, window.location.origin);
  } catch (err) {
    return;
  }

  if (requestedUrl.origin !== window.location.origin) return;

  var nextUrl = normalizeRoutePath(requestedUrl.pathname) + requestedUrl.search + requestedUrl.hash;
  window.history.replaceState(
    { section: getSectionFromPath(requestedUrl.pathname) },
    '',
    nextUrl
  );
}

function navigate(section, options) {
  options = options || {};
  var route = routeById(section) || routeById(DEFAULT_SECTION);
  if (!route) return;
  section = route.id;

  if (options.updateHistory !== false) {
    var nextRoute = route.path;
    var currentRoute = normalizeRoutePath(window.location.pathname);

    if (currentRoute !== nextRoute || window.location.search || window.location.hash) {
      window.history[options.replaceHistory ? 'replaceState' : 'pushState'](
        { section: section },
        '',
        nextRoute
      );
    }
  }
  activeSection = section;

  var app = document.getElementById('app');
  var contentScrollEl = document.getElementById('content');
  /* Collapse the hero on mobile for all non-about sections.  This covers
     explicit nav clicks (collapseMobileHero: true), popstate (back/forward),
     and direct-route entry. */
  var shouldCollapseMobileHero = section !== 'about';

  setMobilePageSurface(route);

  /* Desktop: about = expanded sidebar, anything else = topbar */
  if (section === 'about') {
    app.classList.remove('app--browsing');
  } else {
    app.classList.add('app--browsing');
  }
  /* Greece brings its own sticky guide nav; the mobile site header stays in
     flow and scrolls away so the guide owns the top of the viewport. */
  app.classList.toggle('app--greece', section === 'greece');

  /* Update all nav button active states */
  document.querySelectorAll('.nav-btn, .tab').forEach(function(btn) {
    var isActive = btn.dataset.section === section;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-current', isActive ? 'page' : 'false');
  });

  /* Swap visible section */
  document.querySelectorAll('.section').forEach(function(sec) {
    sec.classList.toggle('active', sec.id === 'section-' + section);
  });

  /* Update page title and social preview metadata */
  document.title = route.title;
  updateSocialMeta(route);

  /* Lazy-load GitHub repos */
  if (section === 'github' && !githubLoaded) {
    githubLoaded = true;
    loadGitHubRepos();
  }

  /* Defer the remote PDF and browser PDF viewer until Resume is opened. */
  if (section === 'resume') {
    loadResume();
  }

  /* Lazy-render portfolio cards */
  if (section === 'portfolio') {
    renderPortfolio();
  }

  /* Init Greece guide internal nav */
  if (section === 'greece') {
    greeceNavInit();
  }

  /* On mobile: navigation clicks should always land in the compact state.
     Re-apply after layout so the sticky header cannot get stuck mid-reveal.
     The header is updated directly rather than through a synthetic scroll
     event, which used to wake every other scroll listener on the page too. */
  if (isCompactShell() && contentScrollEl) {
    measureHero();
    var targetScrollTop = shouldCollapseMobileHero ? heroMetrics.height : 0;

    window.scrollTo(0, targetScrollTop);
    updateHeroVisibility();

    requestAnimationFrame(function() {
      window.scrollTo(0, targetScrollTop);
      updateHeroVisibility();
    });
  }
}

/* ── Wire up sidebar nav buttons and topbar tabs ── */
document.querySelectorAll('.sidebar-nav .nav-btn, .topbar-nav .tab').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    navigate(btn.dataset.section, { collapseMobileHero: true });
  });
});

/* ── Topbar home button → back to about / expanded sidebar ── */
var topbarHome = document.getElementById('topbar-home');
if (topbarHome) {
  topbarHome.addEventListener('click', function(e) {
    e.preventDefault();
    navigate('about', { collapseMobileHero: true });
  });
}

window.addEventListener('popstate', function() {
  navigate(getSectionFromPath(window.location.pathname), { updateHistory: false });
});

/* ── Mobile: progressively reveal compact sticky identity row while hero scrolls out ── */
var stickyHeaderEl = document.querySelector('.sticky-header');
var topbarEl = document.getElementById('topbar');
var contentEl = document.getElementById('content');
var COMPACT_REVEAL_SPAN_RATIO = 0.55;
var COMPACT_REVEAL_MIN_SPAN_PX = 88;
var HERO_HIDDEN_PROGRESS = 0.995;

function clamp01(num) {
  return Math.min(1, Math.max(0, num));
}

/* Hero geometry only changes with the viewport, so it is measured on resize
   rather than on every scroll event.  Reading offsetHeight mid-scroll forces
   a synchronous layout, and doing that between writes to --compact-progress
   is what makes a scroll-linked header stutter. */
var heroMetrics = { height: 0, revealStart: 0, revealSpan: 1 };

function measureHero() {
  if (!topbarEl) return;

  var height = topbarEl.offsetHeight;
  var revealSpan = Math.max(COMPACT_REVEAL_MIN_SPAN_PX, height * COMPACT_REVEAL_SPAN_RATIO);
  var revealStart = Math.max(0, height - revealSpan);

  heroMetrics = {
    height: height,
    revealStart: revealStart,
    revealSpan: Math.max(1, height - revealStart)
  };
}

var heroUpdateScheduled = false;

function setMobileHeaderFixed(isFixed) {
  var appEl = document.getElementById('app');
  if (!appEl) return;
  appEl.classList.toggle('app--mobile-header-fixed', !!isFixed);
}

function updateHeroVisibility() {
  if (!stickyHeaderEl || !topbarEl) return;

  var appEl = document.getElementById('app');

  /* Greece: never pin the site header.  The hero and the tab row scroll
     away together, leaving the guide's own nav sticking to the top. */
  if (!isCompactShell()
      || (appEl && appEl.classList.contains('app--greece'))) {
    stickyHeaderEl.style.setProperty('--compact-progress', '0');
    stickyHeaderEl.classList.remove('hero-hidden');
    setMobileHeaderFixed(false);
    return;
  }

  if (!heroMetrics.height) measureHero();
  if (!heroMetrics.height) return;

  var scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
  var progress = clamp01((scrollTop - heroMetrics.revealStart) / heroMetrics.revealSpan);
  var heroHidden = progress >= HERO_HIDDEN_PROGRESS;

  stickyHeaderEl.style.setProperty('--compact-progress', progress.toFixed(4));
  stickyHeaderEl.classList.toggle('hero-hidden', heroHidden);
  setMobileHeaderFixed(heroHidden);
}

/* Coalesce to one update per frame. Scroll events can outpace frames, and
   without this the header is restyled several times per painted frame. */
function scheduleHeroUpdate() {
  if (heroUpdateScheduled) return;
  heroUpdateScheduled = true;
  requestAnimationFrame(function() {
    heroUpdateScheduled = false;
    updateHeroVisibility();
  });
}

if (stickyHeaderEl && topbarEl && contentEl) {
  window.addEventListener('scroll', scheduleHeroUpdate, { passive: true });
  window.addEventListener('resize', function() {
    measureHero();
    scheduleHeroUpdate();
  }, { passive: true });

  measureHero();
  updateHeroVisibility();
}

/* Rotating a phone swaps the whole shell, so re-derive everything that was
   decided from it.  The hero has to be re-measured before the header is
   re-evaluated: the landscape hero is a single row, a third of the height
   the stacked one had. */
compactShell.addEventListener('change', function() {
  updateHeroEmailMode();
  measureHero();
  updateHeroVisibility();
  if (activeSection === 'resume') loadResume();
});

/* ── Handle internal section links inside content (e.g. in about text) ── */
document.getElementById('content').addEventListener('click', function(e) {
  var link = e.target.closest('a[data-section]');
  if (link) {
    e.preventDefault();
    navigate(link.dataset.section, { collapseMobileHero: true });
  }
});

/* ── GitHub repository loader ── */
var LANG_COLORS = {
  'JavaScript':      '#f1e05a',
  'TypeScript':      '#3178c6',
  'Python':          '#3572A5',
  'C++':             '#f34b7d',
  'C':               '#555555',
  'Rust':            '#dea584',
  'Go':              '#00ADD8',
  'HTML':            '#e34c26',
  'CSS':             '#563d7c',
  'SCSS':            '#c6538c',
  'Shell':           '#89e051',
  'MATLAB':          '#e16737',
  'Jupyter Notebook':'#DA5B0B',
  'Makefile':        '#427819',
  'VHDL':            '#adb2cb',
  'Verilog':         '#b2b7f8'
};

/* The build injects this list from content/github.yml. */
var PINNED_REPOS = (window.SITE_CONTENT && window.SITE_CONTENT.pinnedRepos) || [];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadGitHubRepos() {
  var container = document.getElementById('github-repos');

  Promise.all(
    PINNED_REPOS.map(function(fullName) {
      return fetch('https://api.github.com/repos/' + fullName)
        .then(function(res) {
          if (!res.ok) throw new Error('Failed to load ' + fullName);
          return res.json();
        })
        .catch(function() {
          return {
            full_name: fullName,
            name: fullName.split('/')[1] || fullName,
            html_url: 'https://github.com/' + fullName,
            description: 'Pinned repository (metadata temporarily unavailable)',
            language: null,
            stargazers_count: 0
          };
        });
    })
  )
    .then(function(repos) {
      var cards = repos
        .map(function(repo) {
          var langColor = LANG_COLORS[repo.language] || '#8b949e';

          var langHtml = repo.language
            ? '<span class="repo-lang"><span class="lang-dot" style="background:' + escapeHtml(langColor) + '"></span><span>' + escapeHtml(repo.language) + '</span></span>'
            : '';

          var starsHtml = repo.stargazers_count > 0
            ? '<span>\u2605 ' + repo.stargazers_count + '</span>'
            : '';

          var desc = repo.description
            ? escapeHtml(repo.description)
            : '<span style="opacity:0.35">No description</span>';

          return '<a class="repo-card" href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">'
            + '<div class="repo-name">' + escapeHtml(repo.full_name) + '</div>'
            + '<div class="repo-desc">' + desc + '</div>'
            + '<div class="repo-meta">' + langHtml + starsHtml + '</div>'
            + '</a>';
        })
        .join('');

      container.innerHTML = cards || '<p class="status-msg">Could not load pinned repositories. <a href="https://github.com/nistath" target="_blank" rel="noopener">Visit GitHub directly \u2192</a></p>';
    })
    .catch(function() {
      container.innerHTML = '<p class="status-msg">Could not load pinned repositories. <a href="https://github.com/nistath" target="_blank" rel="noopener">Visit GitHub directly \u2192</a></p>';
    });
}

/* =====================================================
   PORTFOLIO — pre-rendered card interactions

   Dormant while content/portfolio/ is empty: without projects the build
   emits no portfolio route or section, so navigate() never reaches
   renderPortfolio(). Kept, with the schema, renderer, and card styles, so
   restoring the content restores the page.
   ===================================================== */
function setExpandedState(container, header, body, isOpen) {
  container.classList.toggle('is-open', isOpen);
  header.setAttribute('aria-expanded', String(isOpen));
  body.setAttribute('aria-hidden', String(!isOpen));
  body.toggleAttribute('inert', !isOpen);
}

function toggleCard(card) {
  var header = card.querySelector('.pcard-header');
  var body = card.querySelector('.pcard-body');
  if (!header || !body) return;

  setExpandedState(card, header, body, !card.classList.contains('is-open'));
}

function toggleSubItem(item) {
  var header = item.querySelector('.sub-header');
  var body = item.querySelector('.sub-body');
  if (!header || !body) return;

  setExpandedState(item, header, body, !item.classList.contains('is-open'));
}

var portfolioInitialized = false;

function renderPortfolio() {
  if (portfolioInitialized) return;

  var container = document.getElementById('portfolio-cards');
  if (!container) return;
  portfolioInitialized = true;

  container.querySelectorAll('.pcard').forEach(function(card) {
    var header = card.querySelector('.pcard-header');
    var body = card.querySelector('.pcard-body');
    if (!header || !body) return;

    setExpandedState(card, header, body, false);
    header.addEventListener('click', function() {
      toggleCard(card);
    });
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard(card);
      }
    });
  });

  container.querySelectorAll('.sub-item').forEach(function(item) {
    var header = item.querySelector('.sub-header');
    var body = item.querySelector('.sub-body');
    if (!header || !body) return;

    setExpandedState(item, header, body, false);
    header.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleSubItem(item);
    });
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleSubItem(item);
      }
    });
  });
}

/* =====================================================
   GREECE GUIDE — internal sticky nav
   ===================================================== */
var greeceNavInitialized = false;

function greeceNavInit() {
  if (greeceNavInitialized) return;

  var nav = document.getElementById('gr-nav');
  if (!nav) return;
  greeceNavInitialized = true;

  var navBtns = nav.querySelectorAll('.gr-nav-btn');
  var navRail = nav.querySelector('.gr-nav-rail') || nav;
  var greeceWrap = document.querySelector('#section-greece .greece-wrap');
  var targets = Array.from(document.querySelectorAll(
    '#section-greece .gr-section, #section-greece .gr-island'
  ));

  /* Publish the measured nav height so scroll-margin and the sticky aside
     offset stay exact at every breakpoint and label wrap. */
  function syncNavHeight() {
    if (!greeceWrap) return;
    var height = nav.offsetHeight;
    if (height) greeceWrap.style.setProperty('--gr-nav-h', height + 'px');
  }

  /* The mobile nav is a horizontal rail; fade the trailing edge until it is
     scrolled all the way, and keep the active chip in view. */
  function syncRailEdge() {
    nav.classList.toggle('gr-nav--rail-start', navRail.scrollLeft <= 1);
    nav.classList.toggle(
      'gr-nav--rail-end',
      navRail.scrollLeft + navRail.clientWidth >= navRail.scrollWidth - 2
    );
  }

  function revealNavBtn(btn) {
    if (navRail.scrollWidth <= navRail.clientWidth) return;
    var left = btn.offsetLeft - (navRail.clientWidth - btn.offsetWidth) / 2;
    navRail.scrollTo({ left: Math.max(0, left), behavior: 'smooth' });
  }

  function setActiveSection(key) {
    navBtns.forEach(function(btn) {
      var isActive = btn.dataset.gr === key;
      var wasActive = btn.classList.contains('active');
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'true');
        if (!wasActive) revealNavBtn(btn);
      } else {
        btn.removeAttribute('aria-current');
      }
    });
  }

  /* Pick the last section whose heading has reached the visible content area.
     Computing from every target avoids stale IntersectionObserver entries
     during long smooth scrolls, especially across tall mobile sections. */
  function updateActiveSection() {
    var greeceSection = document.getElementById('section-greece');
    if (!greeceSection || !greeceSection.classList.contains('active') || !targets.length) return;

    var targetScrollMargin = parseFloat(getComputedStyle(targets[0]).scrollMarginTop) || 0;
    var activationLine = Math.max(
      80,
      nav.getBoundingClientRect().bottom + 16,
      targetScrollMargin + 16
    );
    var activeTarget = targets[0];

    targets.forEach(function(target) {
      if (target.getBoundingClientRect().top <= activationLine) activeTarget = target;
    });

    setActiveSection(activeTarget.id.replace('gr-', ''));
  }

  var navUpdateScheduled = false;
  function scheduleActiveSectionUpdate() {
    if (navUpdateScheduled) return;
    navUpdateScheduled = true;
    requestAnimationFrame(function() {
      navUpdateScheduled = false;
      updateActiveSection();
    });
  }

  /* Click: smooth-scroll to the target section */
  navBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var el = document.getElementById('gr-' + btn.dataset.gr);
      if (el) {
        setActiveSection(btn.dataset.gr);
        el.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  window.addEventListener('scroll', scheduleActiveSectionUpdate, { passive: true });
  window.addEventListener('resize', scheduleActiveSectionUpdate, { passive: true });
  document.getElementById('section-greece').addEventListener(
    'scroll',
    scheduleActiveSectionUpdate,
    { passive: true }
  );
  scheduleActiveSectionUpdate();

  navRail.addEventListener('scroll', syncRailEdge, { passive: true });
  window.addEventListener('resize', function() {
    syncNavHeight();
    syncRailEdge();
  }, { passive: true });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function() {
      syncNavHeight();
      syncRailEdge();
    }).observe(nav);
  }
  syncNavHeight();
  syncRailEdge();

  /* Collapsible tip cards (visible on mobile, always-open on desktop via CSS) */
  document.querySelectorAll('#section-greece .gr-aside .gr-tip').forEach(function(tip, index) {
    var title = tip.querySelector('.gr-tip-title');
    if (!title) return;

    /* Wrap all non-title children in a collapsible body div */
    var body = document.createElement('div');
    body.className = 'gr-tip-body';
    var bodyInner = document.createElement('div');
    bodyInner.className = 'gr-tip-body-inner';
    Array.from(tip.children).forEach(function(child) {
      if (child !== title) bodyInner.appendChild(child);
    });
    body.appendChild(bodyInner);
    tip.appendChild(body);
    body.id = 'gr-tip-body-' + index;

    /* Chevron indicator */
    var chevron = document.createElement('span');
    chevron.className = 'gr-tip-chevron';
    chevron.textContent = '›';
    title.appendChild(chevron);

    function syncTipState() {
      var isCollapsible = isCompactShell();
      var isOpen = !isCollapsible || tip.classList.contains('gr-tip--open');

      if (isCollapsible) {
        title.setAttribute('role', 'button');
        title.setAttribute('tabindex', '0');
        title.setAttribute('aria-controls', body.id);
        title.setAttribute('aria-expanded', String(isOpen));
      } else {
        title.removeAttribute('role');
        title.removeAttribute('tabindex');
        title.removeAttribute('aria-controls');
        title.removeAttribute('aria-expanded');
      }

      body.setAttribute('aria-hidden', String(!isOpen));
      body.toggleAttribute('inert', !isOpen);
    }

    function toggleTip() {
      if (!isCompactShell()) return;
      tip.classList.toggle('gr-tip--open');
      syncTipState();
    }

    syncTipState();
    window.addEventListener('resize', syncTipState, { passive: true });

    tip.addEventListener('click', function(e) {
      if (!body.contains(e.target)) toggleTip();
    });
    title.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTip();
      }
    });
  });
}

restoreSectionRoute();
navigate(getSectionFromPath(window.location.pathname), { updateHistory: false });
