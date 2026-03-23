const SPA_ROUTES = new Set([
  '/about',
  '/github',
  '/resume',
  '/portfolio',
  '/greece',
]);

module.exports = {
  server: {
    baseDir: '.',
    middleware: [
      function routeFallback(req, res, next) {
        var requestUrl = req.url || '/';
        var queryIndex = requestUrl.indexOf('?');
        var pathname = queryIndex >= 0 ? requestUrl.slice(0, queryIndex) : requestUrl;
        var search = queryIndex >= 0 ? requestUrl.slice(queryIndex) : '';
        var normalizedPath = pathname.replace(/\/+$/, '') || '/';

        if (pathname !== normalizedPath && SPA_ROUTES.has(normalizedPath)) {
          res.writeHead(302, { Location: normalizedPath + search });
          res.end();
          return;
        }

        if (SPA_ROUTES.has(normalizedPath)) {
          req.url = '/index.html';
        }

        next();
      },
    ],
  },
  files: [
    '*.html',
    'css/**/*.css',
    'js/**/*.js',
    'img/**/*',
    'fonts/**/*',
    'files/**/*',
  ],
  port: 8080,
  open: false,
  notify: false,
  ghostMode: false,
  ui: false,
};
