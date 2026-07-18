const MarkdownIt = require('markdown-it');
const { loadContent } = require('./scripts/content/load-content.cjs');

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
    markdown.renderInline(String(value), { linkClass: linkClass || '' })
  ));

  eleventyConfig.addGlobalData('siteContent', () => loadContent());
  eleventyConfig.addWatchTarget('content');
  eleventyConfig.addWatchTarget('schemas');

  [
    '404.html',
    'CNAME',
    'LICENSE.txt',
    'about',
    'apple-touch-icon.png',
    'browserconfig.xml',
    'css',
    'favicon.ico',
    'favicon.svg',
    'files',
    'fonts',
    'github',
    'greece',
    'humans.txt',
    'icon-512.png',
    'icon.png',
    'img',
    'js',
    'portfolio',
    'resume',
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
