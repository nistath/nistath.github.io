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

/* Keep this list in the same order as the profile's pinned repos. */
var PINNED_REPOS = [
  'MITIBMxGraph/SALIENT',
  'nistath/arpp',
  'nistath/o2p2_vizdoom',
  'MITMotorsports/MY18',
  'MITMotorsports/ParseCAN',
  'nistath/lidar_raycaster'
];

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
   PORTFOLIO
   Content (PROJECTS array + icon constants) lives in
   content/portfolio.js, loaded before this file.
   ===================================================== */

/* ── Card builder ── */
var CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
var CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

function buildCard(p) {
  /* tags */
  var tagsHtml = p.tags.map(function(t) {
    return '<span class="ptag">' + escapeHtml(t) + '</span>';
  }).join('');

  /* bullets — content is trusted (authored) HTML */
  var bulletsHtml = p.bullets.map(function(b) {
    return '<li>' + b + '</li>';
  }).join('');

  /* external links */
  var linksHtml = '';
  if (p.links && p.links.length) {
    linksHtml = '<div class="pcard-links">'
      + p.links.map(function(l) {
          return '<a class="pcard-link" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer">'
            + escapeHtml(l.label) + ' \u2192</a>';
        }).join('')
      + '</div>';
  }

  /* optional nested sub-items */
  var subItemsHtml = '';
  if (p.subItems && p.subItems.length) {
    var subRows = p.subItems.map(function(sub) {
      var paragraphs = sub.content.map(function(c) {
        return '<p>' + escapeHtml(c) + '</p>';
      }).join('');
      return '<div class="sub-item" id="subitem-' + escapeHtml(sub.id) + '">'
        + '<div class="sub-header" role="button" tabindex="0" aria-expanded="false">'
        + '<span class="sub-title">' + escapeHtml(sub.title) + '</span>'
        + '<span class="sub-chevron">' + CHEVRON_RIGHT + '</span>'
        + '</div>'
        + '<div class="sub-body"><div class="sub-body-inner">' + paragraphs + '</div></div>'
        + '</div>';
    }).join('');
    subItemsHtml = '<div class="sub-items">' + subRows + '</div>';
  }

  return '<article class="pcard" id="pcard-' + p.id + '" style="--card-color:' + p.color + '">'
    /* header row */
    + '<div class="pcard-header" role="button" tabindex="0" aria-expanded="false">'
    + '<div class="pcard-accent"></div>'
    + '<div class="pcard-icon" style="background:' + p.color + '">' + p.icon + '</div>'
    + '<div class="pcard-info">'
    + '<div class="pcard-title">' + escapeHtml(p.title) + '</div>'
    + '<div class="pcard-subtitle">' + escapeHtml(p.subtitle) + '</div>'
    + '<div class="pcard-tags">' + tagsHtml + '</div>'
    + '</div>'
    + '<div class="pcard-meta">'
    + '<div class="pcard-org">'  + escapeHtml(p.org)    + '</div>'
    + '<div class="pcard-period">' + escapeHtml(p.period) + '</div>'
    + '</div>'
    + '<div class="pcard-chevron">' + CHEVRON_DOWN + '</div>'
    + '</div>'
    /* expandable body */
    + '<div class="pcard-body"><div class="pcard-body-inner"><div class="pcard-content">'
    + '<ul class="pcard-bullets">' + bulletsHtml + '</ul>'
    + linksHtml
    + subItemsHtml
    + '</div></div></div>'
    + '</article>';
}

/* ── Toggle helpers ── */
function toggleCard(card) {
  var isOpen = card.classList.contains('is-open');
  card.classList.toggle('is-open', !isOpen);
  card.querySelector('.pcard-header').setAttribute('aria-expanded', String(!isOpen));
}

function toggleSubItem(item) {
  var isOpen = item.classList.contains('is-open');
  item.classList.toggle('is-open', !isOpen);
  item.querySelector('.sub-header').setAttribute('aria-expanded', String(!isOpen));
}

/* ── Render all cards (called once, lazily) ── */
var portfolioRendered = false;

function renderPortfolio() {
  if (portfolioRendered) return;
  portfolioRendered = true;

  var container = document.getElementById('portfolio-cards');
  container.innerHTML = PROJECTS.map(buildCard).join('');

  /* card expand/collapse */
  container.querySelectorAll('.pcard-header').forEach(function(header) {
    header.addEventListener('click', function() {
      toggleCard(header.closest('.pcard'));
    });
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleCard(header.closest('.pcard'));
      }
    });
  });

  /* sub-item expand/collapse */
  container.querySelectorAll('.sub-header').forEach(function(header) {
    header.addEventListener('click', function(e) {
      e.stopPropagation();
      toggleSubItem(header.closest('.sub-item'));
    });
    header.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        toggleSubItem(header.closest('.sub-item'));
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
  greeceNavInitialized = true;

  var nav = document.getElementById('gr-nav');
  if (!nav) return;

  var navBtns = nav.querySelectorAll('.gr-nav-btn');

  /* Click: smooth-scroll to the target section */
  navBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      var el = document.getElementById('gr-' + btn.dataset.gr);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  });

  /* IntersectionObserver: highlight the topmost visible section in the nav */
  var targets = document.querySelectorAll('#section-greece .gr-section, #section-greece .gr-island');

  var obs = new IntersectionObserver(function(entries) {
    var visible = entries.filter(function(e) { return e.isIntersecting; });
    if (!visible.length) return;
    visible.sort(function(a, b) { return a.boundingClientRect.top - b.boundingClientRect.top; });

    var key = visible[0].target.id.replace('gr-', '');
    navBtns.forEach(function(btn) {
      btn.classList.toggle('active', btn.dataset.gr === key);
    });

  }, { rootMargin: '-80px 0px -60% 0px', threshold: 0.1 });

  targets.forEach(function(el) { obs.observe(el); });

  /* Collapsible tip cards (visible on mobile, always-open on desktop via CSS) */
  document.querySelectorAll('#section-greece .gr-aside .gr-tip').forEach(function(tip) {
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

    /* Chevron indicator */
    var chevron = document.createElement('span');
    chevron.className = 'gr-tip-chevron';
    chevron.textContent = '›';
    title.appendChild(chevron);
    title.setAttribute('aria-expanded', 'false');

    /* Toggle open/closed — tap anywhere on the card header (full padding area),
       but ignore taps inside the expanded body so links/text remain usable */
    tip.addEventListener('click', function(e) {
      if (body.contains(e.target)) return;
      var isOpen = tip.classList.toggle('gr-tip--open');
      title.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

restoreSectionRoute();
navigate(getSectionFromPath(window.location.pathname), { updateHistory: false });
