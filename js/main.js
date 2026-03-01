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

/* ── Navigation state ── */
var githubLoaded = false;

var PAGE_TITLES = {
  'about':     'Nick Stathas',
  'github':    'GitHub — Nick Stathas',
  'resume':    'Resume — Nick Stathas',
  'portfolio': 'Portfolio — Nick Stathas'
};

function navigate(section) {
  var app = document.getElementById('app');

  /* Desktop: about = expanded sidebar, anything else = topbar */
  if (section === 'about') {
    app.classList.remove('app--browsing');
  } else {
    app.classList.add('app--browsing');
  }

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

  /* Update page title */
  document.title = PAGE_TITLES[section] || 'Nick Stathas';

  /* Lazy-load GitHub repos */
  if (section === 'github' && !githubLoaded) {
    githubLoaded = true;
    loadGitHubRepos();
  }

  /* Lazy-render portfolio cards */
  if (section === 'portfolio') {
    renderPortfolio();
  }

  /* On mobile: scroll content back to top so the hero re-expands for each new section */
  if (window.innerWidth <= 767) {
    var contentScrollEl = document.getElementById('content');
    if (contentScrollEl) {
      contentScrollEl.scrollTop = 0;
      updateHeaderCollapse(0);
    }
  }
}

/* ── Wire up sidebar nav buttons ── */
document.querySelectorAll('.sidebar-nav .nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() { navigate(btn.dataset.section); });
});

/* ── Wire up topbar tabs ── */
document.querySelectorAll('.topbar-nav .tab').forEach(function(btn) {
  btn.addEventListener('click', function() { navigate(btn.dataset.section); });
});

/* ── Topbar home button → back to about / expanded sidebar ── */
var topbarHome = document.getElementById('topbar-home');
if (topbarHome) {
  topbarHome.addEventListener('click', function() { navigate('about'); });
}

/* ── Mobile header: collapse/expand on content scroll ── */
var topbarEl    = document.getElementById('topbar');
var stickyHeaderEl = document.querySelector('.sticky-header');
var contentEl   = document.getElementById('content');

/* Hysteresis thresholds — wide gap prevents jitter near the boundary */
var COLLAPSE_THRESHOLD = 60;  /* scroll down past this → collapse  */
var EXPAND_THRESHOLD   = 15;  /* scroll up past this  → expand     */
var _headerCollapsed   = false;

function updateHeaderCollapse(scrollTop) {
  if (!topbarEl) return;
  var next = _headerCollapsed
    ? scrollTop > EXPAND_THRESHOLD          /* stay collapsed unless well above */
    : scrollTop > COLLAPSE_THRESHOLD;       /* only collapse when far enough down */
  if (next === _headerCollapsed) return;
  _headerCollapsed = next;
  topbarEl.classList.toggle('is-collapsed', next);
  if (stickyHeaderEl) stickyHeaderEl.classList.toggle('is-collapsed', next);
}

/* #content is now the scroll container on mobile */
contentEl.addEventListener('scroll', function() {
  if (window.innerWidth > 767) return;
  updateHeaderCollapse(this.scrollTop);
}, { passive: true });

/* Forward wheel events from hero to content (needed in desktop/DevTools) */
topbarEl.addEventListener('wheel', function(e) {
  if (window.innerWidth > 767) return;
  contentEl.scrollTop += e.deltaY;
}, { passive: true });

/* Forward touch-swipe from hero to content (needed on real mobile) */
var _heroTouchY = 0;
topbarEl.addEventListener('touchstart', function(e) {
  _heroTouchY = e.touches[0].clientY;
}, { passive: true });
topbarEl.addEventListener('touchmove', function(e) {
  if (window.innerWidth > 767) return;
  var dy = _heroTouchY - e.touches[0].clientY;
  contentEl.scrollTop += dy;
  _heroTouchY = e.touches[0].clientY;
}, { passive: true });

/* ── Handle internal section links inside content (e.g. in about text) ── */
document.getElementById('content').addEventListener('click', function(e) {
  var link = e.target.closest('a[data-section]');
  if (link) {
    e.preventDefault();
    navigate(link.dataset.section);
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

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadGitHubRepos() {
  var container = document.getElementById('github-repos');

  fetch('https://api.github.com/users/nistath/repos?sort=updated&per_page=20&type=owner')
    .then(function(res) { return res.json(); })
    .then(function(repos) {
      if (!Array.isArray(repos)) {
        container.innerHTML = '<p class="status-msg">Could not load repositories. <a href="https://github.com/nistath" target="_blank" rel="noopener">Visit GitHub directly \u2192</a></p>';
        return;
      }

      var cards = repos
        .filter(function(r) { return !r.fork; })
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
            + '<div class="repo-name">' + escapeHtml(repo.name) + '</div>'
            + '<div class="repo-desc">' + desc + '</div>'
            + '<div class="repo-meta">' + langHtml + starsHtml + '</div>'
            + '</a>';
        })
        .join('');

      container.innerHTML = cards || '<p class="status-msg">No repositories found.</p>';
    })
    .catch(function() {
      container.innerHTML = '<p class="status-msg">Could not load repositories. <a href="https://github.com/nistath" target="_blank" rel="noopener">Visit GitHub directly \u2192</a></p>';
    });
}

/* =====================================================
   PORTFOLIO
   ===================================================== */

/* Pixel-art SVG icons (white shapes on the card's colour background) */
var ICON_SALIENT = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* input-layer nodes */
  + '<rect x="1" y="2"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="1" y="7"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="1" y="12" width="2" height="2" fill="white" opacity="0.70"/>'
  /* hidden-layer nodes */
  + '<rect x="10" y="1"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="5"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="9"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="10" y="13" width="2" height="2" fill="white" opacity="0.70"/>'
  /* output-layer nodes */
  + '<rect x="21" y="4"  width="2" height="2" fill="white" opacity="0.90"/>'
  + '<rect x="21" y="10" width="2" height="2" fill="white" opacity="0.90"/>'
  /* connections layer 1 → 2 */
  + '<line x1="3" y1="3"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="3"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="8"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
  + '<line x1="3" y1="8"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="8"  x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="3" y1="13" x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.25"/>'
  + '<line x1="3" y1="13" x2="10" y2="14" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  /* connections layer 2 → 3 */
  + '<line x1="12" y1="2"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="6"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="10" x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
  + '<line x1="12" y1="10" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.35"/>'
  + '<line x1="12" y1="14" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.25"/>'
  + '</svg>';

var ICON_CAR = '<svg viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* rear wing */
  + '<rect x="18" y="1" width="6"  height="1" fill="white" opacity="0.90"/>'
  + '<rect x="21" y="2" width="1"  height="3" fill="white" opacity="0.60"/>'
  /* cockpit hump */
  + '<rect x="8"  y="2" width="6"  height="2" fill="white" opacity="0.95"/>'
  + '<rect x="9"  y="2" width="4"  height="1" fill="black" opacity="0.50"/>'
  /* main body */
  + '<rect x="2"  y="4" width="20" height="2" fill="white" opacity="0.95"/>'
  /* nose */
  + '<rect x="0"  y="5" width="3"  height="1" fill="white" opacity="0.75"/>'
  /* side pods / underfloor cut */
  + '<rect x="3"  y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
  + '<rect x="15" y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
  /* front wing */
  + '<rect x="0"  y="7" width="5"  height="1" fill="white" opacity="0.75"/>'
  /* wheels */
  + '<rect x="3"  y="7" width="4"  height="4" fill="#0d0d0d"/>'
  + '<rect x="15" y="7" width="4"  height="4" fill="#0d0d0d"/>'
  /* tyre shine */
  + '<rect x="4"  y="8" width="2"  height="2" fill="#2e2e2e"/>'
  + '<rect x="16" y="8" width="2"  height="2" fill="#2e2e2e"/>'
  + '</svg>';

var ICON_BMS = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* case fill */
  + '<rect x="1" y="3" width="19" height="10" fill="white" opacity="0.06"/>'
  /* case outline */
  + '<rect x="1" y="3"  width="19" height="1"  fill="white" opacity="0.85"/>'
  + '<rect x="1" y="12" width="19" height="1"  fill="white" opacity="0.85"/>'
  + '<rect x="1" y="3"  width="1"  height="10" fill="white" opacity="0.85"/>'
  + '<rect x="19" y="3" width="1"  height="10" fill="white" opacity="0.85"/>'
  /* positive terminal (+) */
  + '<rect x="20" y="6" width="3"  height="4"  fill="white" opacity="0.80"/>'
  + '<rect x="21" y="5" width="1"  height="6"  fill="white" opacity="0.80"/>'
  /* cell dividers */
  + '<rect x="5"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  + '<rect x="9"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  + '<rect x="13" y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
  /* cell fills (varying charge levels) */
  + '<rect x="2"  y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
  + '<rect x="6"  y="5" width="3"  height="7"  fill="white" opacity="0.75"/>'
  + '<rect x="10" y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
  + '<rect x="14" y="6" width="5"  height="6"  fill="white" opacity="0.60"/>'
  + '</svg>';

var ICON_DASH = '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
  /* screen fill */
  + '<rect x="1"  y="1"  width="22" height="14" fill="white" opacity="0.05"/>'
  /* screen border */
  + '<rect x="1"  y="1"  width="22" height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="1"  y="14" width="22" height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="1"  y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
  + '<rect x="22" y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
  /* vertical divider */
  + '<rect x="14" y="2"  width="1"  height="12" fill="white" opacity="0.22"/>'
  /* left panel — bar chart */
  + '<rect x="3"  y="11" width="2"  height="3"  fill="white" opacity="0.90"/>'
  + '<rect x="5"  y="9"  width="2"  height="5"  fill="white" opacity="0.90"/>'
  + '<rect x="7"  y="7"  width="2"  height="7"  fill="white" opacity="0.80"/>'
  + '<rect x="9"  y="10" width="2"  height="4"  fill="white" opacity="0.70"/>'
  + '<rect x="11" y="8"  width="2"  height="6"  fill="white" opacity="0.60"/>'
  /* right panel — data rows */
  + '<rect x="16" y="3"  width="5"  height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="16" y="5"  width="3"  height="1"  fill="white" opacity="0.70"/>'
  + '<rect x="16" y="7"  width="5"  height="1"  fill="white" opacity="0.80"/>'
  + '<rect x="16" y="9"  width="4"  height="1"  fill="white" opacity="0.60"/>'
  + '<rect x="16" y="11" width="2"  height="1"  fill="white" opacity="0.40"/>'
  /* status indicator dots */
  + '<rect x="21" y="5"  width="1"  height="1"  fill="white" opacity="1.00"/>'
  + '<rect x="21" y="7"  width="1"  height="1"  fill="white" opacity="0.55"/>'
  + '</svg>';

/* ── Project data ─────────────────────────────────────
   To add a new project: push a new object to this array.
   Required keys: id, color, title, subtitle, org, period, tags, icon, bullets
   Optional keys: links [ {label, url} ], subItems [ {id, title, content[]} ]
   ───────────────────────────────────────────────────── */
var PROJECTS = [
  {
    id:       'salient',
    color:    '#7c3aed',
    icon:     ICON_SALIENT,
    title:    'SALIENT',
    subtitle: 'Distributed multi-GPU graph neural network acceleration',
    org:      'MIT-IBM Watson AI Lab',
    period:   '2020 \u2013 2021',
    tags:     ['PyTorch', 'C++', 'CUDA', 'Distributed Systems', 'GNNs', 'MLSys 2022'],
    bullets: [
      'Led design and implementation of SALIENT, a distributed multi-GPU system for training and inference of graph neural networks (GNNs) on massive graphs.',
      'Achieves a drop-in <strong>3\u00d7 performance improvement</strong> over an optimized PyTorch Geometric baseline, with notable speedups over competing distributed systems.',
      'Optimized PyG\u2019s C++ neighborhood sampling code and designed a GIL-free thread-based parallelization strategy for non-blocking data loading.',
      'Co-authored <em>Accelerating Training and Inference of Graph Neural Networks with Fast Sampling and Pipelining</em>, presented at <strong>MLSys 2022</strong> and featured in MIT News.',
    ],
    links: [
      { label: 'MLSys 2022 Paper', url: 'https://proceedings.mlsys.org/paper_files/paper/2022/hash/35f4a8d465e6e1edc05f3d8ab658c551-Abstract.html' },
      { label: 'GitHub', url: 'https://github.com/MITIBMxGraph/SALIENT' },
      { label: 'MIT News', url: 'https://news.mit.edu/2022/accelerating-graph-neural-network-training-0519' },
    ],
  },
  {
    id:       'my18',
    color:    '#c0392b',
    icon:     ICON_CAR,
    title:    'MY18 Electric Race Car',
    subtitle: 'Software lead for MIT\u2019s Formula SAE championship entry',
    org:      'MIT Motorsports',
    period:   'Nov. 2017 \u2013 June 2018',
    tags:     ['C++', 'CAN Bus', 'Embedded', 'Team Lead', 'Formula SAE'],
    bullets: [
      'Led and coordinated 8 engineers across 9 software subsystems of MIT\u2019s electric race car.',
      'The car finished the 22\u202fkm Formula SAE Electric 2018 endurance race <strong>113 seconds ahead</strong> of the next fastest competitor.',
      'Built <em>CANlib</em> \u2014 a code-generated CAN bus serialization library \u2014 alongside Makefile improvements, automated toolchain installation, and Git-versioned binary flashing.',
      'Developed documentation, unit and integration tests, and verification procedures for the car\u2019s electrical systems.',
      'Held regular individual status reviews and all-hands architecture sessions.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
  },
  {
    id:       'my19-bms',
    color:    '#0a7c5c',
    icon:     ICON_BMS,
    title:    'MY19 Battery Management System',
    subtitle: 'High-voltage BMS and data acquisition for an electric racer',
    org:      'MIT Motorsports',
    period:   '2017 \u2013 2020',
    tags:     ['C++', 'STM32F413', 'LTC6813', 'CAN Bus', 'DMA', 'Python', 'NumPy', 'MATLAB'],
    bullets: [
      'Implemented C++ drivers for a daisy chain of <strong>LTC6813</strong> multicell battery monitor ICs, enabling precise per-cell voltage and temperature monitoring.',
      'Designed a custom STM32F413-based data logger using <strong>DMA</strong> for simultaneous high-throughput SD card logging of internal messages and CAN bus traffic.',
      'Built a Python data pipeline for storing, tagging, and parsing logs into MATLAB or NumPy formats for post-race analysis.',
      'Created a modern CAN bus <strong>serialization specification language</strong> and accompanying Python code-generation framework used across the team.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
  },
  {
    id:       'my19-dash',
    color:    '#1a56a0',
    icon:     ICON_DASH,
    title:    'MY19 Dashboard & Telemetry',
    subtitle: 'Real-time driver HUD and live pit-side telemetry system',
    org:      'MIT Motorsports',
    period:   '2017 \u2013 2020',
    tags:     ['kdb+', 'Q', 'Kx Dashboards', 'Python', 'CAN Bus', 'Real-time', 'Embedded'],
    bullets: [
      'Designed the driver-facing dashboard display surfacing battery state, motor metrics, system alerts, and lap data in a glanceable layout.',
      'Developed a kdb+/Q real-time telemetry pipeline ingesting live CAN bus data wirelessly to a pit-side system during competition.',
    ],
    links: [
      { label: 'MIT Motorsports', url: 'https://www.mitmotorsports.com/' },
    ],
    subItems: [
      {
        id:      'pit-telemetry',
        title:   'Pit Telemetry System',
        content: [
          'Built a real-time telemetry pipeline using kdb+/Q that ingests live CAN bus data wirelessly from the car to a pit-side laptop throughout dynamic events.',
          'Visualised vehicle state \u2014 motor temperatures, battery cell voltages, current draw, and fault codes \u2014 using Kx Dashboards, enabling engineers to monitor and diagnose the car live from the pits.',
        ],
      },
      {
        id:      'driver-display',
        title:   'Driver Dashboard Display',
        content: [
          'Designed and implemented the embedded dashboard display shown to the driver throughout competition.',
          'The display surfaces critical alerts, battery state of charge, lap timing, and key motor metrics within a clear layout optimised for high-vibration, high-G environments.',
        ],
      },
    ],
  },
];

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
