const express = require('express');
const BlogPost = require('../models/BlogPost');
const Subscriber = require('../models/Subscriber');
const CATEGORY_ORDER = require('../config/categories');
const { t } = require('../config/i18n');

const BG_BY_INDEX = ['bg-white', 'bg-warm'];
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

// A real, current cadence beats a guessed one - "1-2 posts a month" would be
// honest for some categories and an overpromise (or an underpromise) for
// others, so this is computed from actual publish history each time rather
// than hardcoded. Deliberately makes no claim at all for a category that's
// gone quiet recently, rather than citing stale lifetime-average pace.
function cadenceLabel(categoryPosts) {
  const now = Date.now();
  const recentCount = categoryPosts.filter((p) => now - new Date(p.publishedAt).getTime() < NINETY_DAYS_MS).length;
  if (recentCount >= 6) return 'about once a week';
  if (recentCount >= 3) return 'every couple of weeks';
  if (recentCount >= 2) return 'every few weeks';
  if (recentCount >= 1) return 'occasionally';
  return null;
}

// Given a post (English or a translation), find every locale it exists in -
// used to build hreflang tags and the "also available in" links. Walks to
// the canonical English post first (translationOf, or itself if already
// English), then finds all its translations plus itself.
async function findLocaleSiblings(post) {
  const englishId = post.locale === 'en' ? post._id : post.translationOf;
  if (!englishId) return [post];
  const [english, translations] = await Promise.all([
    post.locale === 'en' ? Promise.resolve(post) : BlogPost.findById(englishId).lean(),
    BlogPost.find({ translationOf: englishId, status: 'published' }).lean(),
  ]);
  const siblings = english ? [english, ...translations] : translations;
  // De-dupe in case `post` itself is already in there.
  const seen = new Set();
  return siblings.filter((s) => {
    const id = String(s._id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function localePath(locale, path) {
  return locale === 'en' ? path : `/${locale}${path}`;
}

// One router factory mounted three times (see server/app.js: '/blog',
// '/es/blog', '/fr/blog') rather than three separate route files, so the
// query/render logic for "the blog in language X" only exists once. Every
// query below is scoped to `locale` - an /es/blog request only ever sees
// locale:'es' documents, never falling back to English ones, so a category
// with zero Spanish posts yet simply doesn't appear rather than silently
// mixing languages on one page.
function createBlogRouter(locale) {
  const router = express.Router();

  router.get('/', async (req, res) => {
    const posts = await BlogPost.find({ status: 'published', locale }).sort({ publishedAt: -1 }).lean();

    const categories = CATEGORY_ORDER.map((cat, i) => {
      const categoryPosts = posts.filter((p) => p.category === cat.key);
      return {
        key: cat.key,
        label: cat.label,
        bg: BG_BY_INDEX[i % BG_BY_INDEX.length],
        posts: categoryPosts,
        cadenceLabel: cadenceLabel(categoryPosts),
      };
    }).filter((cat) => cat.posts.length > 0);

    res.render('blog/index', { categories, lang: locale, t: t(locale) });
  });

  router.get('/subscribe/confirm/:token', async (req, res) => {
    const subscriber = await Subscriber.findOne({ confirmToken: req.params.token });
    if (!subscriber) return res.render('blog/subscribe-result', { outcome: 'invalid' });

    subscriber.status = 'confirmed';
    subscriber.confirmedAt = new Date();
    await subscriber.save();

    res.render('blog/subscribe-result', { outcome: 'confirmed' });
  });

  router.get('/subscribe/unsubscribe/:token', async (req, res) => {
    const subscriber = await Subscriber.findOne({ unsubscribeToken: req.params.token });
    if (!subscriber) return res.render('blog/subscribe-result', { outcome: 'invalid' });

    subscriber.status = 'unsubscribed';
    await subscriber.save();

    res.render('blog/subscribe-result', { outcome: 'unsubscribed' });
  });

  router.get('/topics/:key', async (req, res, next) => {
    const cat = CATEGORY_ORDER.find((c) => c.key === req.params.key);
    if (!cat) return next();

    const posts = await BlogPost.find({ category: cat.key, status: 'published', locale }).sort({ publishedAt: -1 }).lean();

    res.render('blog/category', { category: cat, posts, cadenceLabel: cadenceLabel(posts), lang: locale, t: t(locale) });
  });

  // Pre-migration posts were served at "/blog/:slug.html" and Google still
  // has several of those indexed - without this, they 404 outright instead
  // of consolidating onto the clean-URL canonical (see GSC Page Indexing:
  // "Not found (404)" and "Duplicate, Google chose different canonical").
  router.get('/:slug.html', (req, res) => {
    res.redirect(301, localePath(locale, '/blog/' + req.params.slug));
  });

  router.get('/:slug', async (req, res, next) => {
    const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published', locale }).lean();
    if (!post) return next();

    const [relatedPosts, categoryPosts, localeSiblings] = await Promise.all([
      BlogPost.find({ category: post.category, status: 'published', locale, slug: { $ne: post.slug } })
        .sort({ publishedAt: -1 })
        .limit(3)
        .lean(),
      BlogPost.find({ category: post.category, status: 'published', locale }, 'publishedAt').lean(),
      findLocaleSiblings(post),
    ]);

    const hreflangs = localeSiblings.map((s) => ({ lang: s.locale, path: localePath(s.locale, '/blog/' + s.slug) }));
    const otherLocales = localeSiblings.filter((s) => s.locale !== locale);

    res.render('blog/post', {
      post,
      relatedPosts,
      subscribeCadenceLabel: cadenceLabel(categoryPosts),
      lang: locale,
      t: t(locale),
      hreflangs,
      otherLocales,
    });
  });

  return router;
}

module.exports = { createBlogRouter };
