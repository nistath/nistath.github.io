#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const MarkdownIt = require('markdown-it');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');
const CONTENT_DIR = path.join(ROOT, 'content');
const CHECK_MODE = process.argv.includes('--check');

const md = new MarkdownIt({
  html: true,
  linkify: false,
  typographer: false,
});

const ICONS = {
  salient: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    + '<rect x="1" y="2"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="1" y="7"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="1" y="12" width="2" height="2" fill="white" opacity="0.70"/>'
    + '<rect x="10" y="1"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="10" y="5"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="10" y="9"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="10" y="13" width="2" height="2" fill="white" opacity="0.70"/>'
    + '<rect x="21" y="4"  width="2" height="2" fill="white" opacity="0.90"/>'
    + '<rect x="21" y="10" width="2" height="2" fill="white" opacity="0.90"/>'
    + '<line x1="3" y1="3"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="3" y1="3"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="3" y1="8"  x2="10" y2="2"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
    + '<line x1="3" y1="8"  x2="10" y2="6"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="3" y1="8"  x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="3" y1="13" x2="10" y2="10" stroke="white" stroke-width="0.5" opacity="0.25"/>'
    + '<line x1="3" y1="13" x2="10" y2="14" stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="12" y1="2"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="12" y1="6"  x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="12" y1="10" x2="21" y2="5"  stroke="white" stroke-width="0.5" opacity="0.20"/>'
    + '<line x1="12" y1="10" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.35"/>'
    + '<line x1="12" y1="14" x2="21" y2="11" stroke="white" stroke-width="0.5" opacity="0.25"/>'
    + '</svg>',
  car: '<svg viewBox="0 0 24 14" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    + '<rect x="18" y="1" width="6"  height="1" fill="white" opacity="0.90"/>'
    + '<rect x="21" y="2" width="1"  height="3" fill="white" opacity="0.60"/>'
    + '<rect x="8"  y="2" width="6"  height="2" fill="white" opacity="0.95"/>'
    + '<rect x="9"  y="2" width="4"  height="1" fill="black" opacity="0.50"/>'
    + '<rect x="2"  y="4" width="20" height="2" fill="white" opacity="0.95"/>'
    + '<rect x="0"  y="5" width="3"  height="1" fill="white" opacity="0.75"/>'
    + '<rect x="3"  y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
    + '<rect x="15" y="6" width="4"  height="1" fill="white" opacity="0.55"/>'
    + '<rect x="0"  y="7" width="5"  height="1" fill="white" opacity="0.75"/>'
    + '<rect x="3"  y="7" width="4"  height="4" fill="#0d0d0d"/>'
    + '<rect x="15" y="7" width="4"  height="4" fill="#0d0d0d"/>'
    + '<rect x="4"  y="8" width="2"  height="2" fill="#2e2e2e"/>'
    + '<rect x="16" y="8" width="2"  height="2" fill="#2e2e2e"/>'
    + '</svg>',
  bms: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    + '<rect x="1" y="3" width="19" height="10" fill="white" opacity="0.06"/>'
    + '<rect x="1" y="3"  width="19" height="1"  fill="white" opacity="0.85"/>'
    + '<rect x="1" y="12" width="19" height="1"  fill="white" opacity="0.85"/>'
    + '<rect x="1" y="3"  width="1"  height="10" fill="white" opacity="0.85"/>'
    + '<rect x="19" y="3" width="1"  height="10" fill="white" opacity="0.85"/>'
    + '<rect x="20" y="6" width="3"  height="4"  fill="white" opacity="0.80"/>'
    + '<rect x="21" y="5" width="1"  height="6"  fill="white" opacity="0.80"/>'
    + '<rect x="5"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
    + '<rect x="9"  y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
    + '<rect x="13" y="4" width="1"  height="8"  fill="white" opacity="0.40"/>'
    + '<rect x="2"  y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
    + '<rect x="6"  y="5" width="3"  height="7"  fill="white" opacity="0.75"/>'
    + '<rect x="10" y="4" width="3"  height="8"  fill="white" opacity="0.80"/>'
    + '<rect x="14" y="6" width="5"  height="6"  fill="white" opacity="0.60"/>'
    + '</svg>',
  dash: '<svg viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">'
    + '<rect x="1"  y="1"  width="22" height="14" fill="white" opacity="0.05"/>'
    + '<rect x="1"  y="1"  width="22" height="1"  fill="white" opacity="0.80"/>'
    + '<rect x="1"  y="14" width="22" height="1"  fill="white" opacity="0.80"/>'
    + '<rect x="1"  y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
    + '<rect x="22" y="2"  width="1"  height="12" fill="white" opacity="0.80"/>'
    + '<rect x="14" y="2"  width="1"  height="12" fill="white" opacity="0.22"/>'
    + '<rect x="3"  y="11" width="2"  height="3"  fill="white" opacity="0.90"/>'
    + '<rect x="5"  y="9"  width="2"  height="5"  fill="white" opacity="0.90"/>'
    + '<rect x="7"  y="7"  width="2"  height="7"  fill="white" opacity="0.80"/>'
    + '<rect x="9"  y="10" width="2"  height="4"  fill="white" opacity="0.70"/>'
    + '<rect x="11" y="8"  width="2"  height="6"  fill="white" opacity="0.60"/>'
    + '<rect x="16" y="3"  width="5"  height="1"  fill="white" opacity="0.80"/>'
    + '<rect x="16" y="5"  width="3"  height="1"  fill="white" opacity="0.70"/>'
    + '<rect x="16" y="7"  width="5"  height="1"  fill="white" opacity="0.80"/>'
    + '<rect x="16" y="9"  width="4"  height="1"  fill="white" opacity="0.60"/>'
    + '<rect x="16" y="11" width="2"  height="1"  fill="white" opacity="0.40"/>'
    + '<rect x="21" y="5"  width="1"  height="1"  fill="white" opacity="1.00"/>'
    + '<rect x="21" y="7"  width="1"  height="1"  fill="white" opacity="0.55"/>'
    + '</svg>',
};

const CHEVRON_DOWN = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';
const CHEVRON_RIGHT = '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="butt" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>';

function readYaml(filePath) {
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function attr(value) {
  return escapeHtml(value);
}

function cls(values) {
  return values.filter(Boolean).join(' ');
}

function markdownInline(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'object') {
    throw new Error(`Expected Markdown text, received ${JSON.stringify(value)}`);
  }
  return md.renderInline(String(value));
}

function generatedBlock(name, html) {
  return [
    `<!-- content:${name}:start -->`,
    `<!-- Generated from content/${name}. Edit content/ and run npm run content. -->`,
    html,
    `<!-- content:${name}:end -->`,
  ].join('\n');
}

function renderPortfolioCard(project) {
  const icon = ICONS[project.icon];
  if (!icon) throw new Error(`Unknown portfolio icon "${project.icon}" in ${project.id}`);

  const tagsHtml = (project.tags || [])
    .map((tag) => `<span class="ptag">${escapeHtml(tag)}</span>`)
    .join('');

  const bulletsHtml = (project.bullets || [])
    .map((bullet) => `<li>${markdownInline(bullet)}</li>`)
    .join('');

  const linksHtml = (project.links || []).length
    ? '<div class="pcard-links">'
      + project.links.map((link) => `<a class="pcard-link" href="${attr(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} →</a>`).join('')
      + '</div>'
    : '';

  const subItemsHtml = (project.subItems || []).length
    ? '<div class="sub-items">'
      + project.subItems.map((sub) => {
        const paragraphs = (sub.content || [])
          .map((text) => `<p>${markdownInline(text)}</p>`)
          .join('');
        return `<div class="sub-item" id="subitem-${attr(sub.id)}">`
          + '<div class="sub-header" role="button" tabindex="0" aria-expanded="false">'
          + `<span class="sub-title">${escapeHtml(sub.title)}</span>`
          + `<span class="sub-chevron">${CHEVRON_RIGHT}</span>`
          + '</div>'
          + `<div class="sub-body"><div class="sub-body-inner">${paragraphs}</div></div>`
          + '</div>';
      }).join('')
      + '</div>'
    : '';

  return `<article class="pcard" id="pcard-${attr(project.id)}" style="--card-color:${attr(project.color)}">`
    + '<div class="pcard-header" role="button" tabindex="0" aria-expanded="false">'
    + '<div class="pcard-accent"></div>'
    + `<div class="pcard-icon" style="background:${attr(project.color)}">${icon}</div>`
    + '<div class="pcard-info">'
    + `<div class="pcard-title">${escapeHtml(project.title)}</div>`
    + `<div class="pcard-subtitle">${escapeHtml(project.subtitle)}</div>`
    + `<div class="pcard-tags">${tagsHtml}</div>`
    + '</div>'
    + '<div class="pcard-meta">'
    + `<div class="pcard-org">${escapeHtml(project.org)}</div>`
    + `<div class="pcard-period">${escapeHtml(project.period)}</div>`
    + '</div>'
    + `<div class="pcard-chevron">${CHEVRON_DOWN}</div>`
    + '</div>'
    + '<div class="pcard-body"><div class="pcard-body-inner"><div class="pcard-content">'
    + `<ul class="pcard-bullets">${bulletsHtml}</ul>`
    + linksHtml
    + subItemsHtml
    + '</div></div></div>'
    + '</article>';
}

function renderPortfolio() {
  const portfolioDir = path.join(CONTENT_DIR, 'portfolio');
  const index = readYaml(path.join(portfolioDir, 'index.yml'));
  return index.projects
    .map((slug) => readYaml(path.join(portfolioDir, `${slug}.yml`)))
    .map(renderPortfolioCard)
    .join('\n');
}

function linkAttrs(href) {
  return `href="${attr(href)}" target="_blank" rel="noopener noreferrer"`;
}

function renderChips(block) {
  const chips = (block.items || []).map((item) => {
    const content = markdownInline(item.text);
    if (item.href) return `<a class="gr-chip" ${linkAttrs(item.href)}>${content}</a>`;
    return `<span class="gr-chip">${content}</span>`;
  }).join('');
  return `<div class="${cls(['gr-chips', block.flush && 'gr-chips--flush'])}">${chips}</div>`;
}

function renderImage(block) {
  const style = [`aspect-ratio:${block.aspect || '16/9'}`];
  if (block.style) style.push(block.style);
  return `<div class="${cls(['gr-img', block.class])}" style="${attr(style.join(';'))}">`
    + `<img src="${attr(block.src)}" alt="${attr(block.alt || '')}" loading="lazy">`
    + '</div>';
}

function renderCityImage(block) {
  return '<div class="gr-city-feature">'
    + `<div class="gr-img gr-city-image" role="img" aria-label="${attr(block.alt)}" style="--gr-city-image:url('${attr(block.src)}')"></div>`
    + '</div>';
}

function renderSightAction(action) {
  const actionClass = action.kind === 'ticket' ? 'gr-sight-action--ticket' : 'gr-sight-action--map';
  return `<a class="gr-sight-action ${actionClass}" ${linkAttrs(action.href)}>`
    + `<span class="gr-sight-action-icon" aria-hidden="true">${markdownInline(action.icon)}</span>${escapeHtml(action.label)}</a>`;
}

function renderSight(item) {
  const name = markdownInline(item.name);
  const desc = `<div class="gr-sight-desc">${markdownInline(item.desc)}</div>`;

  if (item.href) {
    return `<a class="gr-sight" ${linkAttrs(item.href)}>`
      + `<div class="gr-sight-name">${name} <span class="gr-venue-ext">↗</span></div>`
      + desc
      + '</a>';
  }

  if (item.links && item.links.length) {
    const links = item.links.map((link) => `<a class="gr-sight-link" ${linkAttrs(link.href)}>${markdownInline(link.label)} <span class="gr-venue-ext">↗</span></a>`).join('');
    return '<div class="gr-sight gr-sight--grouped">'
      + `<div class="gr-sight-name">${name}</div>`
      + desc
      + `<div class="gr-sight-links">${links}</div>`
      + '</div>';
  }

  if (item.actions && item.actions.length) {
    return '<div class="gr-sight gr-sight--ticketed">'
      + `<div class="gr-sight-name">${name}</div>`
      + desc
      + `<div class="gr-sight-actions">${item.actions.map(renderSightAction).join('')}</div>`
      + '</div>';
  }

  return '<div class="gr-sight">'
    + `<div class="gr-sight-name">${name}</div>`
    + desc
    + '</div>';
}

function renderSightList(block) {
  return `<div class="gr-card gr-card--flush">${(block.items || []).map(renderSight).join('')}</div>`;
}

function renderVenue(item) {
  const lang = item.lang ? ` lang="${attr(item.lang)}"` : '';
  return `<a class="gr-venue" ${linkAttrs(item.href)}>`
    + '<div class="gr-venue-inner">'
    + `<span class="gr-venue-icon">${markdownInline(item.icon)}</span>`
    + '<div>'
    + `<div class="gr-venue-name"${lang}>${markdownInline(item.name)} <span class="gr-venue-ext">↗</span></div>`
    + `<div class="gr-venue-desc">${markdownInline(item.desc)}</div>`
    + '</div>'
    + '</div>'
    + '</a>';
}

function renderVenueList(block) {
  return `<div class="gr-venue-list">${(block.items || []).map(renderVenue).join('')}</div>`;
}

function renderOtherCards(block) {
  return '<div class="gr-other-list">'
    + (block.items || []).map((item) => '<div class="gr-other-card">'
      + `<div class="gr-img" style="aspect-ratio:${attr(item.image.aspect || '16/7')}">`
      + `<img src="${attr(item.image.src)}" alt="${attr(item.image.alt)}" loading="lazy">`
      + '</div>'
      + '<div class="gr-other-card-body">'
      + `<h3 class="gr-other-name">${markdownInline(item.name)}</h3>`
      + `<p class="gr-other-desc">${markdownInline(item.desc)}</p>`
      + '</div>'
      + '</div>').join('')
    + '</div>';
}

function renderBlock(block) {
  switch (block.type) {
    case 'cityImage':
      return renderCityImage(block);
    case 'image':
      return renderImage(block);
    case 'card':
      return `<div class="${cls(['gr-card', block.class])}">${(block.blocks || []).map(renderBlock).join('')}</div>`;
    case 'h3':
      return `<h3 class="gr-h3">${markdownInline(block.text)}</h3>`;
    case 'p':
      return `<p class="${cls(['gr-p', block.class])}">${markdownInline(block.text)}</p>`;
    case 'tagline':
      return `<p class="gr-tagline">${markdownInline(block.text)}</p>`;
    case 'chips':
      return renderChips(block);
    case 'sights':
      return renderSightList(block);
    case 'venues':
      return renderVenueList(block);
    case 'note':
      return `<div class="gr-note"><p>${markdownInline(block.text)}</p></div>`;
    case 'otherCards':
      return renderOtherCards(block);
    default:
      throw new Error(`Unknown Greece block type "${block.type}"`);
  }
}

function renderTip(tip) {
  let body = '';
  if (tip.items) {
    body = `<ul class="gr-tip-list">${tip.items.map((item) => `<li>${markdownInline(item)}</li>`).join('')}</ul>`;
  } else if (tip.facts) {
    body = '<dl class="gr-fact-list">'
      + tip.facts.map((fact) => `<div><dt>${markdownInline(fact.term)}</dt><dd>${markdownInline(fact.desc)}</dd></div>`).join('')
      + '</dl>';
  } else if (tip.dayPlan) {
    body = '<div class="gr-day-plan">'
      + tip.dayPlan.map((day) => '<div>'
        + `<span class="gr-day-label">${markdownInline(day.label)}</span>`
        + `<ul class="gr-tip-list">${day.items.map((item) => `<li>${markdownInline(item)}</li>`).join('')}</ul>`
        + '</div>').join('')
      + '</div>';
  } else {
    throw new Error(`Tip "${tip.title}" has no renderable content`);
  }

  return `<div class="${cls(['gr-tip', tip.style && `gr-tip--${tip.style}`])}">`
    + `<div class="gr-tip-title">${markdownInline(tip.title)}</div>`
    + body
    + '</div>';
}

function renderAside(tips) {
  return `<aside class="gr-aside">${(tips || []).map(renderTip).join('')}</aside>`;
}

function renderGrid(data) {
  return '<div class="gr-grid">'
    + `<div class="gr-body">${(data.body || []).map(renderBlock).join('')}</div>`
    + renderAside(data.aside)
    + '</div>';
}

function renderGreeceSection(data) {
  const content = data.aside && data.aside.length
    ? renderGrid(data)
    : (data.body || []).map(renderBlock).join('');
  return `<section id="gr-${attr(data.id)}" class="gr-section">`
    + `<h2 class="gr-h2">${markdownInline(data.title)}</h2>`
    + content
    + '</section>';
}

function renderGreeceIsland(data) {
  return `<div id="gr-${attr(data.id)}" class="gr-island">`
    + `<div class="gr-img gr-island-img-wrap" style="aspect-ratio:${attr(data.image.aspect || '16/9')}">`
    + `<img src="${attr(data.image.src)}" alt="${attr(data.image.alt)}" loading="lazy">`
    + '</div>'
    + '<div class="gr-island-card"><div class="gr-island-card-inner">'
    + `<h2 class="gr-island-name">${markdownInline(data.title)}</h2>`
    + `<p class="gr-island-tagline">${markdownInline(data.tagline)}</p>`
    + `<div class="gr-island-body">${renderGrid(data)}</div>`
    + '</div></div>'
    + '</div>';
}

function renderIslandsIntro(intro) {
  return '<div class="gr-islands-intro">'
    + `<div class="gr-islands-eyebrow">${markdownInline(intro.eyebrow)}</div>`
    + `<h2 class="gr-islands-title">${markdownInline(intro.title)}</h2>`
    + `<p class="gr-islands-sub">${markdownInline(intro.sub)}</p>`
    + '</div>';
}

function renderGreece() {
  const greeceDir = path.join(CONTENT_DIR, 'greece');
  const index = readYaml(path.join(greeceDir, 'index.yml'));
  const nav = index.nav.map((item, i) => `<button class="gr-nav-btn${i === 0 ? ' active' : ''}" data-gr="${attr(item.id)}"><span class="gr-nav-icon">${markdownInline(item.icon)}</span><span class="gr-nav-label">${markdownInline(item.label)}</span></button>`).join('');

  const parts = index.order.map((entry) => {
    if (entry === 'islands-intro') return renderIslandsIntro(index.islandsIntro);
    const data = readYaml(path.join(greeceDir, `${entry}.yml`));
    return data.kind === 'island' ? renderGreeceIsland(data) : renderGreeceSection(data);
  });

  return '<div class="greece-wrap">'
    + '<header class="gr-hero">'
    + `<div class="gr-hero-eyebrow">${markdownInline(index.hero.eyebrow)}</div>`
    + `<h1>${markdownInline(index.hero.title)} <em>${markdownInline(index.hero.emphasis)}</em></h1>`
    + '<div class="gr-hero-curve"></div>'
    + '</header>'
    + `<nav class="gr-nav" id="gr-nav" aria-label="Guide sections">${nav}</nav>`
    + '<main class="gr-main">'
    + '<aside class="gr-tickets-banner" role="note" aria-label="Official ticket source">'
    + `<span class="gr-tickets-banner-icon" aria-hidden="true">${markdownInline(index.ticketsBanner.icon)}</span>`
    + `<div class="gr-tickets-banner-body">${markdownInline(index.ticketsBanner.body)}</div>`
    + '</aside>'
    + parts.join('')
    + '<div class="gr-footer">'
    + `<div class="gr-footer-greek">${markdownInline(index.footer.greek)}</div>`
    + `<p class="gr-footer-sub">${markdownInline(index.footer.sub)}</p>`
    + '</div>'
    + '</main>'
    + '</div>';
}

function replaceNamedBlock(html, name, rendered) {
  const block = generatedBlock(name, rendered);
  const markerRegex = new RegExp(`<!-- content:${name}:start -->[\\s\\S]*?<!-- content:${name}:end -->`);
  if (markerRegex.test(html)) return html.replace(markerRegex, block);

  if (name === 'portfolio') {
    return html.replace(
      /(<div id="portfolio-cards" class="portfolio-list">\n)([\s\S]*?)(\n          <\/div>)/,
      `$1${indent(block, 12)}$3`
    );
  }

  if (name === 'greece') {
    return html.replace(
      /(      <section id="section-greece" class="section">\n)([\s\S]*?)(\n      <\/section>\n\n    <\/main>)/,
      `$1${indent(block, 8)}$3`
    );
  }

  throw new Error(`No replacement strategy for ${name}`);
}

function indent(text, spaces) {
  const prefix = ' '.repeat(spaces);
  return text.split('\n').map((line) => `${prefix}${line}`).join('\n');
}

function buildIndex() {
  const current = fs.readFileSync(INDEX_HTML, 'utf8');
  let next = current;
  next = replaceNamedBlock(next, 'portfolio', renderPortfolio());
  next = replaceNamedBlock(next, 'greece', renderGreece());
  return next;
}

const next = buildIndex();
const current = fs.readFileSync(INDEX_HTML, 'utf8');

if (CHECK_MODE) {
  if (next !== current) {
    console.error('Generated content is out of date. Run npm run content.');
    process.exit(1);
  }
  console.log('Generated content is up to date.');
} else {
  fs.writeFileSync(INDEX_HTML, next);
  console.log('Generated portfolio and Greece content.');
}
