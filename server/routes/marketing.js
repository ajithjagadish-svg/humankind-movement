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
// 'experiences' is deliberately absent from both CORE_PAGES and
// TRANSLATED_PAGES - every locale now has its content split into
// services/*.html, and '/experiences' (plus the es/fr equivalents) is
// handled explicitly below as a redirect to the new /services hub, not a
// served file.
const CORE_PAGES = ['about', 'philosophy', 'the-method', 'who-we-serve', 'contact', 'intake', 'postpartum-recovery-guide'];
const TRANSLATED_PAGES = ['about', 'philosophy', 'the-method', 'who-we-serve', 'contact'];
const LANGS = ['es', 'fr'];

// The five offerings that used to be anchor sections on /experiences, each
// now a standalone page under services/ per locale for SEO (dedicated
// title/meta/content per offering beats one shared page).
const SERVICE_PAGES = [
  'one-to-one-coaching',
  'postpartum-support',
  'neurodivergent-coaching',
  'workshops',
  'corporate-wellbeing',
];

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

// Content that used to live at /experiences now lives at /services -
// overrides the generic CORE_PAGES handler above for the English route only.
router.get('/experiences', (req, res) => {
  res.redirect(301, '/services');
});
router.get('/experiences.html', (req, res) => {
  res.redirect(301, '/services');
});

router.get('/services', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'services', 'index.html'));
});
router.get('/services.html', (req, res) => {
  res.redirect(301, '/services');
});
SERVICE_PAGES.forEach((slug) => {
  router.get('/services/' + slug, (req, res) => {
    res.sendFile(path.join(REPO_ROOT, 'services', slug + '.html'));
  });
  router.get('/services/' + slug + '.html', (req, res) => {
    res.redirect(301, '/services/' + slug);
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

  // Content that used to live at /{lang}/experiences now lives at
  // /{lang}/services - mirrors the English redirect above.
  router.get(`/${lang}/experiences`, (req, res) => {
    res.redirect(301, `/${lang}/services`);
  });
  router.get(`/${lang}/experiences.html`, (req, res) => {
    res.redirect(301, `/${lang}/services`);
  });

  router.get(`/${lang}/services`, (req, res) => {
    res.sendFile(path.join(REPO_ROOT, lang, 'services', 'index.html'));
  });
  router.get(`/${lang}/services.html`, (req, res) => {
    res.redirect(301, `/${lang}/services`);
  });
  SERVICE_PAGES.forEach((slug) => {
    router.get(`/${lang}/services/${slug}`, (req, res) => {
      res.sendFile(path.join(REPO_ROOT, lang, 'services', slug + '.html'));
    });
    router.get(`/${lang}/services/${slug}.html`, (req, res) => {
      res.redirect(301, `/${lang}/services/${slug}`);
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
  res.redirect(301, '/services');
});
router.get('/neurodivergent-coaching.html', (req, res) => {
  res.redirect(301, '/services/neurodivergent-coaching');
});

// The old private client-intake page (Google Form redirect) is replaced by
// intake's own Mongo-backed form - redirect any bookmarked/shared links.
router.get('/client-intake.html', (req, res) => {
  res.redirect(301, '/intake');
});

router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'robots.txt'));
});

// Static core pages - lastmod must be updated by hand whenever a page's
// content changes (verified 2026-08-18: these had drifted to a month stale,
// including on /contact right after its FAQ was rewritten - there is no
// automated signal here, so treat "did I touch a static page today" as a
// prompt to also bump its line below).
const SITEMAP_STATIC_PAGES = [
  { loc: '/', lastmod: '2026-08-18', changefreq: 'weekly', priority: '1.0' },
  { loc: '/philosophy', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.9' },
  { loc: '/about', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.9' },
  { loc: '/the-method', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.9' },
  { loc: '/who-we-serve', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.9' },
  { loc: '/services', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.9' },
  { loc: '/services/one-to-one-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.85' },
  { loc: '/services/postpartum-support', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.85' },
  { loc: '/services/neurodivergent-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.85' },
  { loc: '/services/workshops', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.85' },
  { loc: '/services/corporate-wellbeing', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.85' },
  { loc: '/contact', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.8' },
  { loc: '/postpartum-recovery-guide', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.8' },
  { loc: '/es/', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/philosophy', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/philosophy', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/the-method', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/the-method', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/who-we-serve', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/who-we-serve', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/services', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/services', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/services/one-to-one-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/fr/services/one-to-one-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/es/services/postpartum-support', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/fr/services/postpartum-support', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/es/services/neurodivergent-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/fr/services/neurodivergent-coaching', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/es/services/workshops', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/fr/services/workshops', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/es/services/corporate-wellbeing', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/fr/services/corporate-wellbeing', lastmod: '2026-08-20', changefreq: 'monthly', priority: '0.65' },
  { loc: '/es/about', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/about', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/es/contact', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
  { loc: '/fr/contact', lastmod: '2026-08-18', changefreq: 'monthly', priority: '0.7' },
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

  // /blog itself changes whenever any post does - derive its lastmod from
  // the most recently updated post instead of hand-maintaining it alongside
  // the other static pages, so it never goes stale.
  const blogListingLastmod = posts.length
    ? posts.reduce((max, p) => (p.updatedAt > max ? p.updatedAt : max), posts[0].updatedAt).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  const blogListingTag = sitemapUrlTag({
    loc: '/blog',
    lastmod: blogListingLastmod,
    changefreq: 'weekly',
    priority: '0.9',
  });

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    [...SITEMAP_STATIC_PAGES.map(sitemapUrlTag), blogListingTag, ...postTags].join('\n') +
    '\n</urlset>\n';

  res.type('application/xml').send(xml);
});

router.use('/assets', express.static(path.join(REPO_ROOT, 'assets')));

module.exports = router;
