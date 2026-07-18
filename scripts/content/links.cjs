const GOOGLE_MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';
const MAP_MARKDOWN_LINK = /(?<!!)(\[[^\]]+\])\(map:([^()]*)\)/g;

function isValidMapQuery(value) {
  return typeof value === 'string'
    && value.length > 0
    && value.length <= 200
    && value === value.trim()
    && !/^(?:https?|map):/i.test(value)
    && !/[\u0000-\u001f\u007f]/.test(value);
}

function mapMarkdownError(value) {
  const text = String(value);
  if (/!\[[^\]]*\]\(map:/i.test(text)) return 'map: shorthand is only for links, not images';

  let invalidQuery = false;
  const withoutValidMapLinks = text.replace(MAP_MARKDOWN_LINK, (_match, _label, query) => {
    if (!isValidMapQuery(query)) invalidQuery = true;
    return '';
  });

  if (invalidQuery) return 'invalid map: Markdown destination';
  if (/\]\(map:/i.test(withoutValidMapLinks)) return 'malformed map: Markdown link';
  return null;
}

function mapUrl(query) {
  return GOOGLE_MAPS_SEARCH + encodeURIComponent(String(query)).replace(/%20/g, '+');
}

function resolveContentHref(value) {
  if (!value || typeof value !== 'object') return '';
  if (value.map) return mapUrl(value.map);
  return value.url || '';
}

function expandMapMarkdown(value) {
  return String(value).replace(MAP_MARKDOWN_LINK, (_match, label, query) => (
    `${label}(${mapUrl(query)})`
  ));
}

module.exports = {
  expandMapMarkdown,
  isValidMapQuery,
  mapMarkdownError,
  mapUrl,
  resolveContentHref,
};
