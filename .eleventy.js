const MarkdownIt = require('markdown-it');
const {
  responsiveImageSrcset,
  responsiveImageUrl,
} = require('./scripts/content/images.cjs');
const { loadContent } = require('./scripts/content/load-content.cjs');
const { contentHref, expandMapLinks } = require('./scripts/content/links.cjs');
const { siteRoutes, SITE_ORIGIN } = require('./scripts/content/routes.cjs');

const markdown = new MarkdownIt({
  html: false,
  linkify: false,
  typographer: false,
});

const defaultLinkOpen = markdown.renderer.rules.link_open
  || ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = function linkOpen(tokens, index, options, environment, renderer) {
  tokens[index].attrSet('target', '_blank');
  tokens[index].attrSet('rel', 'noopener noreferrer');
  if (environment && environment.linkClass) {
    tokens[index].attrJoin('class', environment.linkClass);
  }
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

module.exports = function configureEleventy(eleventyConfig) {
  eleventyConfig.setNunjucksEnvironmentOptions({
    autoescape: true,
    dev: true,
    throwOnUndefined: true,
  });

  eleventyConfig.addFilter('markdownInline', (value, linkClass) => (
    markdown.renderInline(expandMapLinks(value), { linkClass: linkClass || '' })
  ));
  eleventyConfig.addFilter('contentHref', contentHref);
  eleventyConfig.addFilter('responsiveImageSrcset', responsiveImageSrcset);
  eleventyConfig.addFilter('responsiveImageUrl', responsiveImageUrl);
  eleventyConfig.addFilter('json', (value) => JSON.stringify(value).replace(/</g, '\\u003c'));
  eleventyConfig.addFilter('knownRoutes', (routes) => (
    routes.reduce((known, route) => Object.assign(known, { [route.path]: true }), { '/': true })
  ));

  /* One content load per build feeds the shell, the generated route stubs,
     the 404 fallback, and the route table handed to js/main.js. */
  eleventyConfig.addGlobalData('siteContent', () => {
    const content = loadContent();
    return { ...content, routes: siteRoutes(content) };
  });
  eleventyConfig.addGlobalData('siteOrigin', SITE_ORIGIN);
  eleventyConfig.addWatchTarget('content');
  eleventyConfig.addWatchTarget('schemas');

  /* Route stubs and 404.html are generated from the route registry; only
     genuinely static assets are copied. */
  [
    'CNAME',
    'LICENSE.txt',
    'apple-touch-icon.png',
    'browserconfig.xml',
    'css',
    'favicon.ico',
    'favicon.svg',
    'files',
    'fonts',
    'humans.txt',
    'icon-512.png',
    'icon.png',
    'img',
    'js',
    'robots.txt',
    'site.webmanifest',
    'tile-wide.png',
    'tile.png',
  ].forEach((asset) => eleventyConfig.addPassthroughCopy(asset));

  return {
    dir: {
      input: 'src',
      includes: '_includes',
      data: '_data',
      output: '_site',
    },
    htmlTemplateEngine: 'njk',
    markdownTemplateEngine: 'njk',
  };
};
