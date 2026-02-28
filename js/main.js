/* ── Email deobfuscation ── */
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode(
      (c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26
    );
  });
}

var email = rot13('avfgngu@zvg.rqh');
var emailEl   = document.getElementById('email');
var emailText = document.getElementById('email-text');
if (emailEl && emailText) {
  emailText.textContent = email;
  emailEl.setAttribute('href', 'mailto:' + email);
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
