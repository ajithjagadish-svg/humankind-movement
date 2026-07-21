// Serves the static marketing site. Deliberately an explicit allowlist of
// files/directories rather than a blanket express.static(REPO_ROOT) mount -
// the repo root also contains server/ (source code) and .env (real
// credentials), which must never be reachable over HTTP.
const express = require('express');
const path = require('path');
const BlogPost = require('../models/BlogPost');

const router = express.Router();
const REPO_ROOT = path.join(__dirname, '..', '..');

// dashboard.html and blog.html/blog/*.html are deliberately excluded here -
// they're superseded by /admin and /blog and are no longer served, though
// the files themselves haven't been deleted from the repo yet.
const PAGES = [
  'about.html',
  'philosophy.html',
  'the-method.html',
  'who-we-serve.html',
  'experiences.html',
  'contact.html',
  'coaching.html',
  'neurodivergent-coaching.html',
  'intake.html',
];

router.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'index.html'));
});

PAGES.forEach((file) => {
  router.get('/' + file, (req, res) => {
    res.sendFile(path.join(REPO_ROOT, file));
  });
});

// Every marketing page's nav still links to the old "blog.html" filename -
// redirect it to the real /blog route rather than rewriting 21 HTML files.
router.get('/blog.html', (req, res) => {
  res.redirect(301, '/blog');
});

// The old private client-intake page (Google Form redirect) is replaced by
// intake.html's own Mongo-backed form - redirect any bookmarked/shared links.
router.get('/client-intake.html', (req, res) => {
  res.redirect(301, '/intake.html');
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
  { loc: '/philosophy.html', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.9' },
  { loc: '/about.html', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.9' },
  { loc: '/the-method.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/who-we-serve.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/experiences.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.9' },
  { loc: '/blog', lastmod: '2026-07-16', changefreq: 'weekly', priority: '0.9' },
  { loc: '/contact.html', lastmod: '2026-07-16', changefreq: 'monthly', priority: '0.8' },
  { loc: '/es/', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/philosophy.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/philosophy.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/the-method.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/the-method.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/who-we-serve.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/who-we-serve.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/experiences.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/experiences.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/about.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/about.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/contact.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/contact.html', lastmod: '2026-07-17', changefreq: 'monthly', priority: '0.7' },
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
router.use('/es', express.static(path.join(REPO_ROOT, 'es')));
router.use('/fr', express.static(path.join(REPO_ROOT, 'fr')));

module.exports = router;
