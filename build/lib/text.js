'use strict';

/* Shared text helpers for the build: HTML escaping and the tiny inline
   Markdown dialect used by content/*.yaml prose.

   The dialect is deliberately small and predictable:

     **bold**                        -> <strong>bold</strong>
     *italic*                        -> <em>italic</em>
     [label](https://example.com)    -> external link
     [label](map:Place Name City)    -> Google Maps search link

   Raw HTML in content is NOT supported: everything is escaped first, so
   content authors cannot produce invalid or unsafe markup. New inline
   syntax belongs here, in one place. */

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Expand a `map:` shorthand into the Google Maps search URL used across
   the Greece guide. Spaces become `+` to match the existing links. */
function mapUrl(query) {
  return 'https://www.google.com/maps/search/?api=1&query='
    + encodeURIComponent(query).replace(/%20/g, '+');
}

/* Resolve a link target from content: either a full URL or `map:...`. */
function resolveLinkTarget(target) {
  if (target.startsWith('map:')) return mapUrl(target.slice(4));
  return target;
}

/* Resolve the destination of a content object that carries either a
   `url:` or a `map:` key (venues, sights, chips, grouped links). */
function resolveHref(obj) {
  if (obj.url) return obj.url;
  if (obj.map) return mapUrl(obj.map);
  return null;
}

/* Render inline Markdown to HTML.

   options.linkClass — class added to generated <a> tags (the Greece guide
   uses "gr-inline-link"); omit for unstyled prose links. */
function md(src, options) {
  var linkClass = options && options.linkClass;
  var out = esc(src);

  /* Links first, so bold/italic still apply inside labels.
     The target may contain spaces (map: queries) but not ")".
     The target was escaped along with the rest of the string, so undo
     that before building the URL — esc() is applied exactly once, when
     the href attribute is emitted. */
  out = out.replace(/\[([^\]]*)\]\(([^)]+)\)/g, function(_, label, target) {
    var rawTarget = target
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    var href = resolveLinkTarget(rawTarget);
    return '<a '
      + (linkClass ? 'class="' + linkClass + '" ' : '')
      + 'href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">'
      + label
      + '</a>';
  });

  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return out;
}

/* True if the prose contains a Markdown link. Used by validation to keep
   links out of full-card anchors (nested <a> is invalid HTML). */
function containsLink(src) {
  return /\[[^\]]*\]\([^)]+\)/.test(String(src));
}

/* Detect Markdown that would silently render wrong. */
function lintProse(src, path, errors) {
  var s = String(src);
  var afterLinks = s.replace(/\[[^\]]*\]\([^)]+\)/g, '');
  if (/\]\(/.test(afterLinks)) {
    errors.push(path + ': malformed Markdown link near "](" — check brackets/parentheses');
  }
  var boldMarkers = (s.match(/\*\*/g) || []).length;
  if (boldMarkers % 2 !== 0) {
    errors.push(path + ': unbalanced "**" bold markers');
  }
}

module.exports = { esc: esc, md: md, mapUrl: mapUrl, resolveHref: resolveHref, containsLink: containsLink, lintProse: lintProse };
