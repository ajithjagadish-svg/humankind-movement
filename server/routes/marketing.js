// Serves the static marketing site. Deliberately an explicit allowlist of
// files/directories rather than a blanket express.static(REPO_ROOT) mount -
// the repo root also contains server/ (source code) and .env (real
// credentials), which must never be reachable over HTTP.
const express = require('express');
const path = require('path');
const BlogPost = require('../models/BlogPost');
const { trackPageView } = require('../services/pageViews');

// Strict routing matters here: LANGS.forEach below registers both "/es"
// (redirect to "/es/") and "/es/" (serve index) - without strict mode
// Express treats trailing slash as optional, so "/es" would also match
// "/es/" and the redirect route (registered first) would loop forever.
const router = express.Router({ strict: true });
const REPO_ROOT = path.join(__dirname, '..', '..');

// dashboard.html and blog.html/blog/*.html are deliberately excluded here -
// they're superseded by /admin and /blog and are no longer served, though
// the files themselves haven't been deleted from the repo yet.
//
// Every page below is served at a clean URL (no .html) with the old
// "/slug.html" path 301-redirected to it - keeps bookmarks/indexed links
// working without carrying the extension forward. The Journal (/blog,
// /blog/:slug) is deliberately excluded from this scheme - it's already
// Mongo-backed with its own clean routes.
const CORE_PAGES = ['about', 'philosophy', 'the-method', 'who-we-serve', 'experiences', 'contact', 'intake', 'postpartum-recovery-guide'];
const TRANSLATED_PAGES = ['about', 'philosophy', 'the-method', 'who-we-serve', 'experiences', 'contact'];
const LANGS = ['es', 'fr'];

router.get('/', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'index.html'));
});
router.get('/index.html', (req, res) => {
  res.redirect(301, '/');
});

CORE_PAGES.forEach((slug) => {
  router.get('/' + slug, (req, res) => {
    if (slug === 'postpartum-recovery-guide') trackPageView('/postpartum-recovery-guide', req);
    res.sendFile(path.join(REPO_ROOT, slug + '.html'));
  });
  router.get('/' + slug + '.html', (req, res) => {
    res.redirect(301, '/' + slug);
  });
});

LANGS.forEach((lang) => {
  router.get('/' + lang, (req, res) => {
    res.redirect(301, '/' + lang + '/');
  });
  router.get('/' + lang + '/', (req, res) => {
    res.sendFile(path.join(REPO_ROOT, lang, 'index.html'));
  });
  router.get('/' + lang + '/index.html', (req, res) => {
    res.redirect(301, '/' + lang + '/');
  });

  TRANSLATED_PAGES.forEach((slug) => {
    router.get(`/${lang}/${slug}`, (req, res) => {
      res.sendFile(path.join(REPO_ROOT, lang, slug + '.html'));
    });
    router.get(`/${lang}/${slug}.html`, (req, res) => {
      res.redirect(301, `/${lang}/${slug}`);
    });
  });
});

// Every marketing page's nav still links to the old "blog.html" filename -
// redirect it to the real /blog route rather than rewriting every page.
router.get('/blog.html', (req, res) => {
  res.redirect(301, '/blog');
});

// Legacy inbound-link redirect stubs (old external links/bookmarks may still
// point here). Now plain server-side 301s instead of client-side meta-refresh
// pages, pointing at the clean /experiences URL.
router.get('/coaching.html', (req, res) => {
  res.redirect(301, '/experiences');
});
router.get('/neurodivergent-coaching.html', (req, res) => {
  res.redirect(301, '/experiences#neurodivergent-movement-coaching');
});

// The old private client-intake page (Google Form redirect) is replaced by
// intake's own Mongo-backed form - redirect any bookmarked/shared links.
router.get('/client-intake.html', (req, res) => {
  res.redirect(301, '/intake');
});

router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'robots.txt'));
});

// Static core pages - update lastmod by hand when a page's content changes.
// Published blog posts are appended dynamically below, so they never go
// stale as new posts are published (the old approach was a static file that
// had to be hand-edited per post and had drifted to list 50 dead URLs).
const SITEMAP_STATIC_PAGES = [
  { loc: '/', lastmod: '2026-07-16', changefreq: 'weekly', priority: '1.0' },
  { loc: '/philosophy', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.9' },
  { loc: '/about', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.9' },
  { loc: '/the-method', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/who-we-serve', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/experiences', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/blog', lastmod: '2026-07-16', changefreq: 'weekly', priority: '0.9' },
  { loc: '/contact', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.8' },
  { loc: '/postpartum-recovery-guide', lastmod: '2026-07-23', changefreq: 'monthly', priority: '0.8' },
  { loc: '/es/', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/philosophy', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/philosophy', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/the-method', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/the-method', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/who-we-serve', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/who-we-serve', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/experiences', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/experiences', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/about', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/about', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/contact', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/contact', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
];

function sitemapUrlTag({ loc, lastmod, changefreq, priority }) {
  return `  <url>\n    <loc>https://humankindmovement.in${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

router.get('/sitemap.xml', async (req, res) => {
  const posts = await BlogPost.find({ status: 'published' }).select('slug updatedAt').lean();

  const postTags = posts.map((post) =>
    sitemapUrlTag({
      loc: `/blog/${post.slug}`,
      lastmod: post.updatedAt.toISOString().slice(0, 10),
      changefreq: 'monthly',
      priority: '0.6',
    })
  );

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...SITEMAP_STATIC_PAGES.map(sitemapUrlTag), ...postTags].join('\n') +
    '\n</urlset>\n';

  res.type('application/xml').send(xml);
});

router.use('/assets', express.static(path.join(REPO_ROOT, 'assets')));

module.exports = router;
