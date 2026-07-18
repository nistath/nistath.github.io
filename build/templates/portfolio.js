'use strict';

/* Renders the Portfolio section from content/portfolio.yaml.
   Card markup must stay in sync with the expand/collapse wiring in
   js/main.js (.pcard-header / .sub-header handlers) and the styles in
   css/main.css. */

var { esc, md } = require('../lib/text');
var icons = require('./icons');

var CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
var CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

function renderCard(p) {
  var tagsHtml = p.tags.map(function(t) {
    return '<span class="ptag">' + esc(t) + '</span>';
  }).join('');

  var bulletsHtml = p.bullets.map(function(b) {
    return '<li>' + md(b) + '</li>';
  }).join('');

  var linksHtml = '';
  if (p.links && p.links.length) {
    linksHtml = '<div class="pcard-links">'
      + p.links.map(function(l) {
          return '<a class="pcard-link" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer">'
            + esc(l.label) + ' →</a>';
        }).join('')
      + '</div>';
  }

  var subItemsHtml = '';
  if (p.sub_items && p.sub_items.length) {
    var subRows = p.sub_items.map(function(sub) {
      var paragraphs = sub.paragraphs.map(function(text) {
        return '<p>' + md(text) + '</p>';
      }).join('');
      return '<div class="sub-item" id="subitem-' + esc(sub.id) + '">'
        + '<div class="sub-header" role="button" tabindex="0" aria-expanded="false">'
        + '<span class="sub-title">' + esc(sub.title) + '</span>'
        + '<span class="sub-chevron">' + CHEVRON_RIGHT + '</span>'
        + '</div>'
        + '<div class="sub-body"><div class="sub-body-inner">' + paragraphs + '</div></div>'
        + '</div>';
    }).join('');
    subItemsHtml = '<div class="sub-items">' + subRows + '</div>';
  }

  return '<article class="pcard" id="pcard-' + esc(p.id) + '" style="--card-color:' + esc(p.color) + '">'
    /* header row */
    + '<div class="pcard-header" role="button" tabindex="0" aria-expanded="false">'
    + '<div class="pcard-accent"></div>'
    + '<div class="pcard-icon" style="background:' + esc(p.color) + '">' + icons[p.icon] + '</div>'
    + '<div class="pcard-info">'
    + '<div class="pcard-title">' + esc(p.title) + '</div>'
    + '<div class="pcard-subtitle">' + esc(p.subtitle) + '</div>'
    + '<div class="pcard-tags">' + tagsHtml + '</div>'
    + '</div>'
    + '<div class="pcard-meta">'
    + '<div class="pcard-org">'  + esc(p.org)    + '</div>'
    + '<div class="pcard-period">' + esc(p.period) + '</div>'
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

function renderPortfolioSection(portfolio) {
  return [
    '      <section id="section-portfolio" class="section">',
    '        <div class="portfolio-wrap">',
    '          <div class="portfolio-intro">',
    '            <h2>' + esc(portfolio.intro.title) + '</h2>',
    '            <p class="section-sub">' + md(portfolio.intro.sub) + '</p>',
    '          </div>',
    '          <div id="portfolio-cards" class="portfolio-list">',
    portfolio.projects.map(function(p) { return '            ' + renderCard(p); }).join('\n'),
    '          </div>',
    '        </div>',
    '      </section>',
  ].join('\n');
}

module.exports = { renderPortfolioSection: renderPortfolioSection };
