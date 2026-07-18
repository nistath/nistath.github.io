function mapUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(String(query).trim()).replace(/%20/g, '+')}`;
}

function contentHref(value) {
  if (!value || typeof value !== 'object') return '';
  if (value.url) return value.url;
  if (value.map) return mapUrl(value.map);
  return '';
}

function expandMapLinks(value) {
  return String(value).replace(/\]\(map:([^)]+)\)/g, (_match, query) => `](${mapUrl(query)})`);
}

module.exports = { contentHref, expandMapLinks, mapUrl };
