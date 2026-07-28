/* Every top-level route on the site, in navigation order.
 *
 * This is the single registry the build reads. It feeds the shell navigation,
 * the generated redirect stubs, the 404 fallback list, the route table
 * injected into js/main.js, and the generated-site checks. Adding or removing
 * a route is one edit here plus its section markup.
 *
 * `requires` names a content key that must be present for the route to exist
 * at all. The portfolio uses it: when content/portfolio/ is empty the loader
 * returns null, and this registry then drops the route from every artifact
 * above, so /portfolio genuinely does not exist rather than rendering empty.
 *
 * Fields:
 *   title       browser-tab title (document.title, and the stub's <title>
 *               is `social.title` because that is what a share card shows)
 *   social      Open Graph / Twitter card title and image
 *   theme       browser chrome color for the route's redirect stub
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

module.exports = { siteRoutes, SITE_ORIGIN };
