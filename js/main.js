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

/* Mobile hero email: switch to icon-only only when its actual width is too small. */
var HERO_EMAIL_ICON_ONLY_WIDTH_PX = 120;

function updateHeroEmailMode() {
  if (!emailTopbar) return;

  var isMobile = window.innerWidth <= 767;
  if (!isMobile) {
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

/* ── Navigation state ── */
var githubLoaded = false;
var DEFAULT_SECTION = 'about';
var SECTION_PATHS = {
  'about':     '/about',
  'github':    '/github',
  'resume':    '/resume',
  'portfolio': '/portfolio',
  'greece':    '/greece'
};

var PAGE_TITLES = {
  'about':     'Nick Stathas',
  'github':    'GitHub — Nick Stathas',
  'resume':    'Resume — Nick Stathas',
  'portfolio': 'Portfolio — Nick Stathas',
  'greece':    'Guide to Greece — Nick Stathas'
};

/* Per-section social preview metadata. Mirrors the per-route stub HTML files
   so that in-app navigation also keeps OG/Twitter tags accurate (useful when
   users copy the URL after navigating). The Greece guide gets its own card;
   every other section reuses the default profile card. */
var PAGE_META = {
  'about':     { title: 'Nick Stathas',                    image: '/img/og/og-default.png' },
  'github':    { title: 'Nick Stathas — GitHub',           image: '/img/og/og-default.png' },
  'resume':    { title: 'Nick Stathas — Resume',           image: '/img/og/og-default.png' },
  'portfolio': { title: 'Nick Stathas — Portfolio',        image: '/img/og/og-default.png' },
  'greece':    { title: "Nick's Guide to Athens & Beyond", image: '/img/og/og-greece.png' }
};

var SITE_ORIGIN = 'https://nistath.com';

function setMetaContent(selector, value) {
  var el = document.querySelector(selector);
  if (el) el.setAttribute('content', value);
}

function updateSocialMeta(section) {
  var meta = PAGE_META[section] || PAGE_META[DEFAULT_SECTION];
  var route = SECTION_PATHS[section] || '/';
  var absUrl = SITE_ORIGIN + route;
  var absImg = SITE_ORIGIN + meta.image;

  setMetaContent('meta[property="og:title"]', meta.title);
  setMetaContent('meta[property="og:url"]', absUrl);
  setMetaContent('meta[property="og:image"]', absImg);
  setMetaContent('meta[property="og:image:alt"]', meta.title);
  setMetaContent('meta[name="twitter:title"]', meta.title);
  setMetaContent('meta[name="twitter:image"]', absImg);
  setMetaContent('meta[name="twitter:image:alt"]', meta.title);

  var canonical = document.querySelector('link[rel="canonical"]');
  if (canonical) canonical.setAttribute('href', absUrl);
}

var MOBILE_PAGE_BACKGROUNDS = {
  'about': '#0d1117',
  'github': '#0d1117',
  'resume': '#0d1117',
  'portfolio': '#0d1117',
  'greece': '#f5f0e8'
};

/* ── Viewport meta: keep one consistent viewport across sections.
   Mobile PDF viewers behave better when we do not override scaling on the
   resume route, especially on iOS where users may need to zoom back out. ── */
var viewportMeta = document.querySelector('meta[name="viewport"]');
var viewportDefault = viewportMeta ? viewportMeta.getAttribute('content') : null;

function setViewportForSection(section) {
  if (!viewportMeta || !viewportDefault) return;
  viewportMeta.setAttribute('content', viewportDefault);
}

function setMobilePageSurface(section) {
  var surface = MOBILE_PAGE_BACKGROUNDS[section] || MOBILE_PAGE_BACKGROUNDS[DEFAULT_SECTION];
  document.documentElement.style.setProperty('--mobile-page-bg', surface);
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
  var normalized = normalizeRoutePath(pathname);
  if (normalized === '/') return DEFAULT_SECTION;

  var section = normalized.slice(1);
  return PAGE_TITLES[section] ? section : DEFAULT_SECTION;
}

function getRouteForSection(section) {
  return SECTION_PATHS[section] || SECTION_PATHS[DEFAULT_SECTION];
}

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
  section = PAGE_TITLES[section] ? section : DEFAULT_SECTION;

  if (options.updateHistory !== false) {
    var nextRoute = getRouteForSection(section);
    var currentRoute = normalizeRoutePath(window.location.pathname);

    if (currentRoute !== nextRoute || window.location.search || window.location.hash) {
      window.history[options.replaceHistory ? 'replaceState' : 'pushState'](
        { section: section },
        '',
        nextRoute
      );
    }
  }
  var app = document.getElementById('app');
  var contentScrollEl = document.getElementById('content');
  var heroEl = document.getElementById('topbar');
  /* Collapse the hero on mobile for all non-about sections.  This covers
     explicit nav clicks (collapseMobileHero: true), popstate (back/forward),
     direct-route entry, and the resume route. */
  var shouldCollapseMobileHero = section !== 'about';

  setViewportForSection(section);
  setMobilePageSurface(section);

  /* Desktop: about = expanded sidebar, anything else = topbar */
  if (section === 'about') {
    app.classList.remove('app--browsing');
  } else {
    app.classList.add('app--browsing');
  }
  app.classList.toggle('app--resume-compact', section === 'resume');

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
  document.title = PAGE_TITLES[section] || 'Nick Stathas';
  updateSocialMeta(section);

  /* Lazy-load GitHub repos */
  if (section === 'github' && !githubLoaded) {
    githubLoaded = true;
    loadGitHubRepos();
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
     Re-apply after layout so the sticky header cannot get stuck mid-reveal. */
  if (window.innerWidth <= 767 && contentScrollEl) {
    var targetScrollTop = 0;

    if (section !== 'resume' && shouldCollapseMobileHero && heroEl) {
      targetScrollTop = heroEl.offsetHeight;
    }

    window.scrollTo(0, targetScrollTop);
    window.dispatchEvent(new Event('scroll'));

    requestAnimationFrame(function() {
      window.scrollTo(0, targetScrollTop);
      window.dispatchEvent(new Event('scroll'));
    });
  }
}

/* ── Wire up sidebar nav buttons ── */
document.querySelectorAll('.sidebar-nav .nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    navigate(btn.dataset.section, { collapseMobileHero: true });
  });
});

/* ── Wire up topbar tabs ── */
document.querySelectorAll('.topbar-nav .tab').forEach(function(btn) {
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
var MOBILE_BREAKPOINT = 767;
var COMPACT_REVEAL_SPAN_RATIO = 0.55;
var COMPACT_REVEAL_MIN_SPAN_PX = 88;
var HERO_HIDDEN_PROGRESS = 0.995;

function clamp01(num) {
  return Math.min(1, Math.max(0, num));
}

if (stickyHeaderEl && topbarEl && contentEl) {
  function setMobileHeaderFixed(isFixed) {
    var appEl = document.getElementById('app');
    if (!appEl) return;
    appEl.classList.toggle('app--mobile-header-fixed', !!isFixed);
  }

  function updateHeroVisibility() {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      stickyHeaderEl.style.setProperty('--compact-progress', '0');
      stickyHeaderEl.classList.remove('hero-hidden');
      setMobileHeaderFixed(false);
      return;
    }

    if (document.getElementById('app').classList.contains('app--resume-compact')) {
      stickyHeaderEl.style.setProperty('--compact-progress', '1');
      stickyHeaderEl.classList.add('hero-hidden');
      setMobileHeaderFixed(true);
      return;
    }

    var heroHeight = topbarEl.offsetHeight;
    if (!heroHeight) return;

    var revealSpan = Math.max(COMPACT_REVEAL_MIN_SPAN_PX, heroHeight * COMPACT_REVEAL_SPAN_RATIO);
    var revealStart = Math.max(0, heroHeight - revealSpan);
    var scrollTop = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    var progress = clamp01((scrollTop - revealStart) / Math.max(1, heroHeight - revealStart));
    var heroHidden = progress >= HERO_HIDDEN_PROGRESS;

    stickyHeaderEl.style.setProperty('--compact-progress', progress.toFixed(4));
    stickyHeaderEl.classList.toggle('hero-hidden', heroHidden);
    setMobileHeaderFixed(heroHidden);
  }

  window.addEventListener('scroll', updateHeroVisibility, { passive: true });
  window.addEventListener('resize', updateHeroVisibility, { passive: true });
  updateHeroVisibility();
}

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

var githubContentNode = document.getElementById('github-content');
var GITHUB_CONTENT = JSON.parse(githubContentNode.textContent);
var PINNED_REPOS = GITHUB_CONTENT.pinned_repositories;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadGitHubRepos() {
  var container = document.getElementById('github-repos');

  function showError() {
    var error = GITHUB_CONTENT.fallback.error;
    container.innerHTML = '<p class="status-msg">' + escapeHtml(error.message)
      + ' <a href="' + escapeHtml(error.link.url) + '" target="_blank" rel="noopener">'
      + escapeHtml(error.link.label) + '</a></p>';
  }

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
            description: GITHUB_CONTENT.fallback.metadata_unavailable,
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
            : '<span style="opacity:0.35">' + escapeHtml(GITHUB_CONTENT.fallback.no_description) + '</span>';

          return '<a class="repo-card" href="' + escapeHtml(repo.html_url) + '" target="_blank" rel="noopener noreferrer">'
            + '<div class="repo-name">' + escapeHtml(repo.full_name) + '</div>'
            + '<div class="repo-desc">' + desc + '</div>'
            + '<div class="repo-meta">' + langHtml + starsHtml + '</div>'
            + '</a>';
        })
        .join('');

      if (cards) {
        container.innerHTML = cards;
      } else {
        showError();
      }
    })
    .catch(showError);
}

/* =====================================================
   PORTFOLIO — pre-rendered card interactions
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
  var targets = Array.from(document.querySelectorAll(
    '#section-greece .gr-section, #section-greece .gr-island'
  ));

  function setActiveSection(key) {
    navBtns.forEach(function(btn) {
      var isActive = btn.dataset.gr === key;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.setAttribute('aria-current', 'true');
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
      var isCollapsible = window.innerWidth <= MOBILE_BREAKPOINT;
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
      if (window.innerWidth > MOBILE_BREAKPOINT) return;
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
