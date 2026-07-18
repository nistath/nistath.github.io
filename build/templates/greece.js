'use strict';

/* Renders the Greece guide section from content/greece.yaml.

   Link-pattern invariants are enforced structurally here (and checked in
   build/lib/content.js): full-card anchors (.gr-venue, a.gr-sight) never
   contain nested links; prose links always use .gr-inline-link; rows with
   several destinations use the grouped .gr-sight--grouped pattern. */

var { esc, md, resolveHref } = require('../lib/text');

var GR = { linkClass: 'gr-inline-link' };
var EXT = ' <span class="gr-venue-ext">↗</span>';
var HHTICKET = 'https://hhticket.gr/';

function anchorAttrs(href) {
  return 'href="' + esc(href) + '" target="_blank" rel="noopener noreferrer"';
}

/* ── Body blocks ── */

function renderImage(image) {
  var style = 'aspect-ratio:' + (image.aspect || '16/9') + (image.gap ? ';margin-bottom:12px' : '');
  return '<div class="gr-img" style="' + style + '">'
    + '<img src="' + esc(image.src) + '" alt="' + esc(image.alt) + '" loading="lazy">'
    + '</div>';
}

function renderFeatureImage(image) {
  return '<div class="gr-city-feature">'
    + '<div class="gr-img gr-city-image" role="img" aria-label="' + esc(image.alt) + '" style="--gr-city-image:url(\'' + esc(image.src) + '\')"></div>'
    + '</div>';
}

function renderChips(value) {
  var flush = !Array.isArray(value) && value.flush;
  var items = Array.isArray(value) ? value : value.items;
  var chips = items.map(function(chip) {
    if (typeof chip === 'string') {
      return '<span class="gr-chip">' + esc(chip) + '</span>';
    }
    return '<a class="gr-chip" ' + anchorAttrs(resolveHref(chip)) + '>' + esc(chip.label) + '</a>';
  }).join('');
  return '<div class="gr-chips' + (flush ? ' gr-chips--flush' : '') + '">' + chips + '</div>';
}

function renderSight(sight) {
  var href = resolveHref(sight);
  if (sight.tickets) {
    return '<div class="gr-sight gr-sight--ticketed">'
      + '<div class="gr-sight-name">' + esc(sight.name) + '</div>'
      + '<div class="gr-sight-desc">' + md(sight.desc, GR) + '</div>'
      + '<div class="gr-sight-actions">'
      + '<a class="gr-sight-action gr-sight-action--map" ' + anchorAttrs(href) + '><span class="gr-sight-action-icon" aria-hidden="true">📍</span>Map</a>'
      + '<a class="gr-sight-action gr-sight-action--ticket" ' + anchorAttrs(HHTICKET) + '><span class="gr-sight-action-icon" aria-hidden="true">🎟️</span>Official tickets</a>'
      + '</div>'
      + '</div>';
  }
  if (sight.links) {
    var links = sight.links.map(function(l) {
      return '<a class="gr-sight-link" ' + anchorAttrs(resolveHref(l)) + '>' + esc(l.label) + EXT + '</a>';
    }).join('');
    return '<div class="gr-sight gr-sight--grouped">'
      + '<div class="gr-sight-name">' + esc(sight.name) + '</div>'
      + '<div class="gr-sight-desc">' + md(sight.desc, GR) + '</div>'
      + '<div class="gr-sight-links">' + links + '</div>'
      + '</div>';
  }
  if (href) {
    /* Whole card is the anchor — no nested links inside (invalid HTML). */
    return '<a class="gr-sight" ' + anchorAttrs(href) + '>'
      + '<div class="gr-sight-name">' + esc(sight.name) + EXT + '</div>'
      + '<div class="gr-sight-desc">' + esc(sight.desc) + '</div>'
      + '</a>';
  }
  return '<div class="gr-sight">'
    + '<div class="gr-sight-name">' + esc(sight.name) + '</div>'
    + '<div class="gr-sight-desc">' + md(sight.desc, GR) + '</div>'
    + '</div>';
}

function renderVenue(venue) {
  /* Whole card is the anchor — no nested links inside (invalid HTML). */
  return '<a class="gr-venue" ' + anchorAttrs(resolveHref(venue)) + '>'
    + '<div class="gr-venue-inner">'
    + '<span class="gr-venue-icon">' + esc(venue.icon) + '</span>'
    + '<div>'
    + '<div class="gr-venue-name"' + (venue.lang ? ' lang="' + esc(venue.lang) + '"' : '') + '>' + esc(venue.name) + EXT + '</div>'
    + '<div class="gr-venue-desc">' + esc(venue.desc) + '</div>'
    + '</div>'
    + '</div>'
    + '</a>';
}

function renderBlock(block) {
  var key = Object.keys(block)[0];
  var value = block[key];
  switch (key) {
    case 'h3':      return '<h3 class="gr-h3">' + md(value, GR) + '</h3>';
    case 'p':       return '<p class="gr-p">' + md(value, GR) + '</p>';
    case 'intro':   return '<p class="gr-p gr-intro-copy">' + md(value, GR) + '</p>';
    case 'tagline': return '<p class="gr-tagline">' + md(value, GR) + '</p>';
    case 'note':    return '<div class="gr-note"><p>' + md(value, GR) + '</p></div>';
    case 'image':   return renderImage(value);
    case 'feature_image': return renderFeatureImage(value);
    case 'card':
      return '<div class="gr-card gr-card--' + esc(value.style) + '">'
        + value.blocks.map(renderBlock).join('\n')
        + '</div>';
    case 'chips':   return renderChips(value);
    case 'sights':
      return '<div class="gr-card gr-card--flush">' + value.map(renderSight).join('\n') + '</div>';
    case 'venues':
      return '<div class="gr-venue-list">' + value.map(renderVenue).join('\n') + '</div>';
    default:
      throw new Error('greece: unknown body block "' + key + '"');
  }
}

/* ── Aside tip cards ── */

function renderAsideCard(card) {
  var body;
  if (card.items) {
    body = '<ul class="gr-tip-list">'
      + card.items.map(function(item) { return '<li>' + md(item, GR) + '</li>'; }).join('')
      + '</ul>';
  } else if (card.facts) {
    body = '<dl class="gr-fact-list">'
      + card.facts.map(function(row) {
          return '<div><dt>' + md(row.term, GR) + '</dt><dd>' + md(String(row.def), GR) + '</dd></div>';
        }).join('')
      + '</dl>';
  } else if (card.days) {
    body = '<div class="gr-day-plan">'
      + card.days.map(function(day) {
          return '<div>'
            + '<span class="gr-day-label">' + esc(day.label) + '</span>'
            + '<ul class="gr-tip-list">'
            + day.items.map(function(item) { return '<li>' + md(item, GR) + '</li>'; }).join('')
            + '</ul>'
            + '</div>';
        }).join('')
      + '</div>';
  }
  return '<div class="gr-tip gr-tip--' + esc(card.style) + '">'
    + '<div class="gr-tip-title">' + esc(card.title) + '</div>'
    + body
    + '</div>';
}

function renderGrid(section) {
  return '<div class="gr-grid">'
    + '<div class="gr-body">' + section.body.map(renderBlock).join('\n') + '</div>'
    + '<aside class="gr-aside">' + (section.aside || []).map(renderAsideCard).join('\n') + '</aside>'
    + '</div>';
}

/* ── Sections ── */

function renderGuideSection(section) {
  return '<section id="gr-' + esc(section.id) + '" class="gr-section">'
    + '<h2 class="gr-h2">' + md(section.title, GR) + '</h2>'
    + renderGrid(section)
    + '</section>';
}

function renderIsland(section) {
  return '<div id="gr-' + esc(section.id) + '" class="gr-island">'
    + '<div class="gr-img gr-island-img-wrap" style="aspect-ratio:16/9">'
    + '<img src="' + esc(section.image.src) + '" alt="' + esc(section.image.alt) + '" loading="lazy">'
    + '</div>'
    + '<div class="gr-island-card">'
    + '<div class="gr-island-card-inner">'
    + '<h2 class="gr-island-name">' + esc(section.name) + '</h2>'
    + '<p class="gr-island-tagline">' + md(section.tagline, GR) + '</p>'
    + '<div class="gr-island-body">'
    + renderGrid(section)
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>';
}

function renderDivider(section) {
  return '<div class="gr-islands-intro">'
    + '<div class="gr-islands-eyebrow">' + esc(section.eyebrow) + '</div>'
    + '<h2 class="gr-islands-title">' + esc(section.title) + '</h2>'
    + '<p class="gr-islands-sub">' + md(section.sub, GR) + '</p>'
    + '</div>';
}

function renderCardsSection(section) {
  return '<section id="gr-' + esc(section.id) + '" class="gr-section">'
    + '<h2 class="gr-h2">' + md(section.title, GR) + '</h2>'
    + '<div class="gr-other-list">'
    + section.cards.map(function(card) {
        return '<div class="gr-other-card">'
          + '<div class="gr-img" style="aspect-ratio:16/7">'
          + '<img src="' + esc(card.image.src) + '" alt="' + esc(card.image.alt) + '" loading="lazy">'
          + '</div>'
          + '<div class="gr-other-card-body">'
          + '<h3 class="gr-other-name">' + esc(card.name) + '</h3>'
          + '<p class="gr-other-desc">' + md(card.desc, GR) + '</p>'
          + '</div>'
          + '</div>';
      }).join('\n')
    + '</div>'
    + '</section>';
}

var SECTION_RENDERERS = {
  guide: renderGuideSection,
  island: renderIsland,
  divider: renderDivider,
  cards: renderCardsSection,
};

function renderGreeceSection(greece) {
  var navButtons = greece.sections
    .filter(function(s) { return s.nav; })
    .map(function(s, i) {
      return '<button class="gr-nav-btn' + (i === 0 ? ' active' : '') + '" data-gr="' + esc(s.id) + '">'
        + '<span class="gr-nav-icon">' + esc(s.nav.icon) + '</span>'
        + '<span class="gr-nav-label">' + esc(s.nav.label) + '</span>'
        + '</button>';
    })
    .join('\n            ');

  var sections = greece.sections
    .map(function(s) { return SECTION_RENDERERS[s.type](s); })
    .join('\n\n            ');

  return [
    '      <section id="section-greece" class="section">',
    '        <div class="greece-wrap">',
    '',
    '          <header class="gr-hero">',
    '            <div class="gr-hero-eyebrow">' + esc(greece.hero.eyebrow) + '</div>',
    '            <h1>' + md(greece.hero.title, GR) + '</h1>',
    '            <div class="gr-hero-curve"></div>',
    '          </header>',
    '',
    '          <nav class="gr-nav" id="gr-nav" aria-label="Guide sections">',
    '            ' + navButtons,
    '          </nav>',
    '',
    '          <main class="gr-main">',
    '',
    '            <aside class="gr-tickets-banner" role="note" aria-label="Official ticket source">',
    '              <span class="gr-tickets-banner-icon" aria-hidden="true">' + esc(greece.banner.icon) + '</span>',
    '              <div class="gr-tickets-banner-body">',
    /* The banner keeps unclassed links: .gr-tickets-banner-body a has its
       own amber styling in css/greece.css. */
    '                ' + md(greece.banner.text),
    '              </div>',
    '            </aside>',
    '',
    '            ' + sections,
    '',
    '            <div class="gr-footer">',
    '              <div class="gr-footer-greek">' + esc(greece.footer.greek) + '</div>',
    '              <p class="gr-footer-sub">' + md(greece.footer.sub, GR) + '</p>',
    '            </div>',
    '',
    '          </main>',
    '        </div>',
    '      </section>',
  ].join('\n');
}

module.exports = { renderGreeceSection: renderGreeceSection };
