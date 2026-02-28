/* ── Email obfuscation ─────────────────────────────────────── */
function rot13(s) {
  return s.replace(/[a-zA-Z]/g, function(c) {
    return String.fromCharCode((c <= 'Z' ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
  });
}

var email = rot13('avfgngu@zvg.rqh');

['email', 'email2', 'email3'].forEach(function(id) {
  var el = document.getElementById(id);
  if (!el) return;
  var span = el.querySelector('span');
  if (span) span.textContent = email;
  el.href = 'mailto:' + email;
});

/* ── SPA navigation ────────────────────────────────────────── */
var app = document.getElementById('app');
var githubLoaded = false;

function setActiveTabs(page) {
  document.querySelectorAll('.tab, .hero-tab').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
}

function showPage(page) {
  document.querySelectorAll('.page').forEach(function(el) {
    el.classList.remove('active');
  });
  var el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
}

function navigate(page) {
  app.classList.add('fading');
  setTimeout(function() {
    if (page === null) {
      app.classList.remove('browsing');
      setActiveTabs(null);
    } else {
      app.classList.add('browsing');
      showPage(page);
      setActiveTabs(page);
      if (page === 'github' && !githubLoaded) loadGitHub();
    }
    app.classList.remove('fading');
  }, 180);
}

// All elements with data-page (hero tabs, header tabs, bio links)
document.querySelectorAll('[data-page]').forEach(function(el) {
  el.addEventListener('click', function(e) {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// Header identity → return to landing
document.getElementById('header-home').addEventListener('click', function() {
  navigate(null);
});

/* ── GitHub repos ──────────────────────────────────────────── */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function loadGitHub() {
  githubLoaded = true;
  var container = document.getElementById('github-repos');

  fetch('https://api.github.com/users/nistath/repos?sort=updated&per_page=24&type=public')
    .then(function(r) { return r.json(); })
    .then(function(repos) {
      var cards = repos
        .filter(function(r) { return !r.fork; })
        .map(function(r) {
          var meta = '';
          if (r.language) meta += '<span><i class="fa-solid fa-code"></i> ' + escapeHtml(r.language) + '</span>';
          if (r.stargazers_count) meta += '<span><i class="fa-regular fa-star"></i> ' + r.stargazers_count + '</span>';
          return '<a class="repo-card" href="' + escapeHtml(r.html_url) + '" target="_blank" rel="noopener">' +
            '<div class="repo-name">' + escapeHtml(r.name) + '</div>' +
            (r.description ? '<div class="repo-desc">' + escapeHtml(r.description) + '</div>' : '') +
            (meta ? '<div class="repo-meta">' + meta + '</div>' : '') +
            '</a>';
        });

      container.innerHTML = cards.length
        ? cards.join('')
        : '<div class="repos-loading">No public repositories found.</div>';
    })
    .catch(function() {
      container.innerHTML = '<div class="repos-loading">Could not load repositories.</div>';
    });
}
