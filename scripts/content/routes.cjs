/* Every top-level route on the site, in navigation order.
 *
 * This is the single registry the build reads. It feeds the shell navigation,
 * the list of paths the shell is rendered at, the route table injected into
 * js/main.js, and the generated-site checks. Adding or removing a route is
 * one edit here plus its section markup.
 *
 * `requires` names a content key that must be present for the route to exist
 * at all. The portfolio uses it: when content/portfolio/ is empty the loader
 * returns null, and this registry then drops the route from every artifact
 * above, so /portfolio genuinely does not exist rather than rendering empty.
 *
 * Fields:
 *   title       browser-tab title, and the <title> of the route's own page
 *   social      Open Graph / Twitter card title and image
 *   theme       browser chrome color while the route's page loads
 *   surface     mobile page background behind the active section
 */
const SITE_ROUTES = [
  {
    id: 'about',
    path: '/about',
    label: 'About',
    title: 'Nick Stathas',
    social: { title: 'Nick Stathas', image: '/img/og/og-default.png' },
    theme: '#2b4557',
    surface: '#0d1117',
  },
  {
    id: 'github',
    path: '/github',
    label: 'GitHub',
    title: 'GitHub — Nick Stathas',
    social: { title: 'Nick Stathas — GitHub', image: '/img/og/og-default.png' },
    theme: '#2b4557',
    surface: '#0d1117',
  },
  {
    id: 'resume',
    path: '/resume',
    label: 'Resume',
    title: 'Resume — Nick Stathas',
    social: { title: 'Nick Stathas — Resume', image: '/img/og/og-default.png' },
    theme: '#2b4557',
    surface: '#0d1117',
  },
  {
    id: 'portfolio',
    path: '/portfolio',
    label: 'Portfolio',
    title: 'Portfolio — Nick Stathas',
    social: { title: 'Nick Stathas — Portfolio', image: '/img/og/og-default.png' },
    theme: '#2b4557',
    surface: '#0d1117',
    requires: 'portfolio',
  },
  {
    id: 'greece',
    path: '/greece',
    label: 'Greece',
    title: 'Guide to Greece — Nick Stathas',
    social: { title: "Nick's Guide to Athens & Beyond", image: '/img/og/og-greece.png' },
    theme: '#003c96',
    surface: '#f5f0e8',
  },
];

const SITE_ORIGIN = 'https://nistath.com';

function siteRoutes(content) {
  return SITE_ROUTES.filter((route) => !route.requires || Boolean(content[route.requires]));
}

/* Where the shell is written. GitHub Pages has no rewrites, so a clean path
 * such as /greece only loads directly if a real file sits there: the build
 * renders the complete shell once per route, plus once at the root for the
 * first one, each copy carrying that route's own title and social card.
 * Nothing redirects and nothing is carried in a query string. */
function shellPages(routes) {
  if (!routes.length) return [];
  return [{ path: '/', permalink: 'index.html', route: routes[0] }].concat(
    routes.map((route) => ({ path: route.path, permalink: `${route.path.slice(1)}/index.html`, route }))
  );
}

module.exports = { siteRoutes, shellPages, SITE_ORIGIN };
