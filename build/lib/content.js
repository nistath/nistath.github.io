'use strict';

/* Loads and validates everything under content/.

   Validation is intentionally strict and chatty: content is hand-edited
   (often on a phone), so a typo should fail the build with a precise,
   friendly message — never render wrong or disappear silently. Every
   error is reported as  <file> -> <path>: <message>. */

var fs = require('fs');
var path = require('path');
var yaml = require('js-yaml');
var text = require('./text');
var icons = require('../templates/icons');

var BODY_BLOCK_KEYS = ['h3', 'p', 'intro', 'tagline', 'note', 'image', 'feature_image', 'card', 'chips', 'sights', 'venues'];
var SECTION_TYPES = ['guide', 'island', 'divider', 'cards'];
var ASIDE_CONTENT_KEYS = ['items', 'facts', 'days'];

function loadYaml(root, name) {
  var file = path.join(root, 'content', name);
  var src = fs.readFileSync(file, 'utf8');
  try {
    return yaml.load(src);
  } catch (err) {
    var where = err.mark ? ' (line ' + (err.mark.line + 1) + ', column ' + (err.mark.column + 1) + ')' : '';
    throw new Error(
      'content/' + name + ' is not valid YAML' + where + ':\n  ' + err.reason + '\n'
      + 'Hint: lines containing ": " or starting with "[" or "*" must be wrapped in "double quotes".'
    );
  }
}

function Checker(file) {
  this.file = file;
  this.errors = [];
}
Checker.prototype.fail = function(pathStr, msg) {
  this.errors.push('content/' + this.file + ' -> ' + pathStr + ': ' + msg);
};
Checker.prototype.need = function(obj, key, pathStr, type) {
  var v = obj ? obj[key] : undefined;
  if (v === undefined || v === null || v === '') {
    this.fail(pathStr, 'missing required key "' + key + '"');
    return false;
  }
  if (type === 'array' && !Array.isArray(v)) {
    this.fail(pathStr, '"' + key + '" must be a list');
    return false;
  }
  if (type === 'string' && typeof v !== 'string') {
    this.fail(pathStr, '"' + key + '" must be text (got ' + typeof v + ')');
    return false;
  }
  return true;
};
Checker.prototype.prose = function(value, pathStr) {
  if (typeof value === 'string') text.lintProse(value, 'content/' + this.file + ' -> ' + pathStr, this.errors);
};
Checker.prototype.noLinks = function(value, pathStr, why) {
  if (typeof value === 'string' && text.containsLink(value)) {
    this.fail(pathStr, 'must not contain [links](...) — ' + why);
  }
};

/* ── Greece guide ── */

function validateAsideCard(c, card, pathStr) {
  c.need(card, 'style', pathStr, 'string');
  c.need(card, 'title', pathStr, 'string');
  var present = ASIDE_CONTENT_KEYS.filter(function(k) { return card[k] !== undefined; });
  if (present.length !== 1) {
    c.fail(pathStr, 'must have exactly one of: items (bullet list), facts (term/def rows), days (itinerary); found: ' + (present.join(', ') || 'none'));
    return;
  }
  if (card.items) {
    card.items.forEach(function(item, i) { c.prose(item, pathStr + '.items[' + i + ']'); });
  }
  if (card.facts) {
    card.facts.forEach(function(row, i) {
      c.need(row, 'term', pathStr + '.facts[' + i + ']', 'string');
      c.need(row, 'def', pathStr + '.facts[' + i + ']');
      c.prose(row.term, pathStr + '.facts[' + i + '].term');
    });
  }
  if (card.days) {
    card.days.forEach(function(day, i) {
      c.need(day, 'label', pathStr + '.days[' + i + ']', 'string');
      c.need(day, 'items', pathStr + '.days[' + i + ']', 'array');
      (day.items || []).forEach(function(item, j) { c.prose(item, pathStr + '.days[' + i + '].items[' + j + ']'); });
    });
  }
}

function validateSight(c, sight, pathStr) {
  c.need(sight, 'name', pathStr, 'string');
  c.need(sight, 'desc', pathStr, 'string');
  c.prose(sight.desc, pathStr + '.desc');
  var hasTarget = sight.map || sight.url;
  if (sight.tickets && !hasTarget) {
    c.fail(pathStr, '"tickets: true" needs a "map:" (or "url:") for the Map button');
  }
  if (sight.links) {
    if (hasTarget) c.fail(pathStr, 'use either "links:" (grouped row) or "map:"/"url:" (whole-card link), not both');
    sight.links.forEach(function(l, i) {
      c.need(l, 'label', pathStr + '.links[' + i + ']', 'string');
      if (!l.map && !l.url) c.fail(pathStr + '.links[' + i + ']', 'needs "map:" or "url:"');
    });
  }
  /* Whole-card anchors must not contain nested links (invalid HTML). */
  if (hasTarget && !sight.tickets) {
    c.noLinks(sight.desc, pathStr + '.desc', 'this card is already a link; keep secondary mentions as plain text');
    c.noLinks(sight.name, pathStr + '.name', 'this card is already a link');
  }
}

function validateVenue(c, venue, pathStr) {
  c.need(venue, 'icon', pathStr, 'string');
  c.need(venue, 'name', pathStr, 'string');
  c.need(venue, 'desc', pathStr, 'string');
  if (!venue.map && !venue.url) c.fail(pathStr, 'needs "map:" or "url:"');
  c.noLinks(venue.desc, pathStr + '.desc', 'venue cards are already links; keep secondary mentions as plain text');
  c.noLinks(venue.name, pathStr + '.name', 'venue cards are already links');
}

function blockKey(block) {
  var keys = Object.keys(block);
  return keys.length === 1 ? keys[0] : null;
}

function validateBody(c, body, pathStr) {
  body.forEach(function(block, i) {
    var p = pathStr + '[' + i + ']';
    if (typeof block !== 'object' || block === null) {
      c.fail(p, 'each body entry must be "- key: value" (e.g. "- p: Some text")');
      return;
    }
    var key = blockKey(block);
    if (!key || BODY_BLOCK_KEYS.indexOf(key) === -1) {
      c.fail(p, 'unknown block "' + (key || Object.keys(block).join('+')) + '" — expected one of: ' + BODY_BLOCK_KEYS.join(', '));
      return;
    }
    var value = block[key];
    switch (key) {
      case 'h3': case 'p': case 'intro': case 'tagline': case 'note':
        if (typeof value !== 'string') c.fail(p, '"' + key + '" must be text');
        else c.prose(value, p);
        break;
      case 'image':
      case 'feature_image':
        c.need(value, 'src', p, 'string');
        c.need(value, 'alt', p, 'string');
        break;
      case 'card':
        c.need(value, 'style', p, 'string');
        c.need(value, 'blocks', p, 'array');
        if (Array.isArray(value.blocks)) validateBody(c, value.blocks, p + '.blocks');
        break;
      case 'chips':
        var items = Array.isArray(value) ? value : (value && value.items);
        if (!Array.isArray(items)) { c.fail(p, '"chips" must be a list, or { flush: true, items: [...] }'); break; }
        items.forEach(function(chip, j) {
          if (typeof chip === 'string') return;
          c.need(chip, 'label', p + '[' + j + ']', 'string');
          if (!chip.map && !chip.url) c.fail(p + '[' + j + ']', 'linked chips need "map:" or "url:"');
        });
        break;
      case 'sights':
        value.forEach(function(s, j) { validateSight(c, s, p + '[' + j + ']'); });
        break;
      case 'venues':
        value.forEach(function(v, j) { validateVenue(c, v, p + '[' + j + ']'); });
        break;
    }
  });
}

function validateGreece(doc) {
  var c = new Checker('greece.yaml');
  c.need(doc, 'hero', 'hero');
  c.need(doc.hero, 'eyebrow', 'hero', 'string');
  c.need(doc.hero, 'title', 'hero', 'string');
  c.need(doc, 'banner', 'banner');
  c.need(doc.banner, 'icon', 'banner', 'string');
  c.need(doc.banner, 'text', 'banner', 'string');
  c.prose(doc.banner && doc.banner.text, 'banner.text');
  c.need(doc, 'footer', 'footer');
  if (c.need(doc, 'sections', 'sections', 'array')) {
    doc.sections.forEach(function(section, i) {
      var p = 'sections[' + i + ']';
      var type = section.type;
      if (SECTION_TYPES.indexOf(type) === -1) {
        c.fail(p, 'unknown "type: ' + type + '" — expected one of: ' + SECTION_TYPES.join(', '));
        return;
      }
      if (type !== 'divider') {
        c.need(section, 'id', p, 'string');
        c.need(section, 'nav', p);
        if (section.nav) {
          c.need(section.nav, 'icon', p + '.nav', 'string');
          c.need(section.nav, 'label', p + '.nav', 'string');
        }
      }
      if (type === 'guide') {
        c.need(section, 'title', p, 'string');
        if (c.need(section, 'body', p, 'array')) validateBody(c, section.body, p + '.body');
      } else if (type === 'island') {
        c.need(section, 'name', p, 'string');
        c.need(section, 'tagline', p, 'string');
        c.need(section, 'image', p);
        if (section.image) { c.need(section.image, 'src', p + '.image', 'string'); c.need(section.image, 'alt', p + '.image', 'string'); }
        if (c.need(section, 'body', p, 'array')) validateBody(c, section.body, p + '.body');
      } else if (type === 'divider') {
        c.need(section, 'eyebrow', p, 'string');
        c.need(section, 'title', p, 'string');
        c.need(section, 'sub', p, 'string');
      } else if (type === 'cards') {
        c.need(section, 'title', p, 'string');
        if (c.need(section, 'cards', p, 'array')) {
          section.cards.forEach(function(card, j) {
            var cp = p + '.cards[' + j + ']';
            c.need(card, 'name', cp, 'string');
            c.need(card, 'desc', cp, 'string');
            c.prose(card.desc, cp + '.desc');
            c.need(card, 'image', cp);
            if (card.image) { c.need(card.image, 'src', cp + '.image', 'string'); c.need(card.image, 'alt', cp + '.image', 'string'); }
          });
        }
      }
      (section.aside || []).forEach(function(card, j) {
        validateAsideCard(c, card, p + '.aside[' + j + ']');
      });
    });
  }
  return c.errors;
}

/* ── Portfolio ── */

function validatePortfolio(doc) {
  var c = new Checker('portfolio.yaml');
  c.need(doc, 'intro', 'intro');
  c.need(doc.intro, 'title', 'intro', 'string');
  c.need(doc.intro, 'sub', 'intro', 'string');
  if (c.need(doc, 'projects', 'projects', 'array')) {
    doc.projects.forEach(function(project, i) {
      var p = 'projects[' + i + ']';
      ['id', 'color', 'icon', 'title', 'subtitle', 'org', 'period'].forEach(function(k) {
        c.need(project, k, p, 'string');
      });
      c.need(project, 'tags', p, 'array');
      if (c.need(project, 'bullets', p, 'array')) {
        project.bullets.forEach(function(b, j) { c.prose(b, p + '.bullets[' + j + ']'); });
      }
      if (project.icon && !icons[project.icon]) {
        c.fail(p, 'unknown icon "' + project.icon + '" — available: ' + Object.keys(icons).join(', ') + ' (new icons are added in build/templates/icons.js)');
      }
      if (project.color && !/^#[0-9a-fA-F]{3,8}$/.test(project.color)) {
        c.fail(p, '"color" must be a quoted hex color like "#7c3aed"');
      }
      (project.links || []).forEach(function(l, j) {
        c.need(l, 'label', p + '.links[' + j + ']', 'string');
        c.need(l, 'url', p + '.links[' + j + ']', 'string');
      });
      (project.sub_items || []).forEach(function(sub, j) {
        var sp = p + '.sub_items[' + j + ']';
        c.need(sub, 'id', sp, 'string');
        c.need(sub, 'title', sp, 'string');
        c.need(sub, 'paragraphs', sp, 'array');
      });
    });
  }
  return c.errors;
}

/* ── About + site ── */

function validateAbout(doc) {
  var c = new Checker('about.yaml');
  c.need(doc, 'heading', 'heading', 'string');
  if (c.need(doc, 'paragraphs', 'paragraphs', 'array')) {
    doc.paragraphs.forEach(function(p, i) { c.prose(p, 'paragraphs[' + i + ']'); });
  }
  c.need(doc, 'farewell', 'farewell', 'string');
  return c.errors;
}

function validateSite(doc) {
  var c = new Checker('site.yaml');
  c.need(doc, 'github', 'github');
  if (doc.github) {
    c.need(doc.github, 'title', 'github', 'string');
    c.need(doc.github, 'sub', 'github', 'string');
    c.need(doc.github, 'pinned_repos', 'github', 'array');
  }
  c.need(doc, 'resume', 'resume');
  if (doc.resume) c.need(doc.resume, 'pdf_url', 'resume', 'string');
  return c.errors;
}

function loadContent(root) {
  var content = {
    about: loadYaml(root, 'about.yaml'),
    site: loadYaml(root, 'site.yaml'),
    portfolio: loadYaml(root, 'portfolio.yaml'),
    greece: loadYaml(root, 'greece.yaml'),
  };
  var errors = []
    .concat(validateAbout(content.about))
    .concat(validateSite(content.site))
    .concat(validatePortfolio(content.portfolio))
    .concat(validateGreece(content.greece));
  if (errors.length) {
    throw new Error('Content validation failed:\n  - ' + errors.join('\n  - '));
  }
  return content;
}

module.exports = { loadContent: loadContent };
