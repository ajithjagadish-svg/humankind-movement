// Serves the static marketing site. Deliberately an explicit allowlist of
// files/directories rather than a blanket express.static(REPO_ROOT) mount -
// the repo root also contains server/ (source code) and .env (real
// credentials), which must never be reachable over HTTP.
const express = require('express');
const path = require('path');

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
  'client-intake.html',
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

router.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'robots.txt'));
});

router.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(REPO_ROOT, 'sitemap.xml'));
});

router.use('/assets', express.static(path.join(REPO_ROOT, 'assets')));
router.use('/es', express.static(path.join(REPO_ROOT, 'es')));
router.use('/fr', express.static(path.join(REPO_ROOT, 'fr')));

module.exports = router;
