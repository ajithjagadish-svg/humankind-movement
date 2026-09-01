const express = require('express');
const BlogPost = require('../models/BlogPost');
const Subscriber = require('../models/Subscriber');
const CATEGORY_ORDER = require('../config/categories');

const router = express.Router();

const BG_BY_INDEX = ['bg-white', 'bg-warm'];

router.get('/', async (req, res) => {
  const posts = await BlogPost.find({ status: 'published' }).sort({ publishedAt: -1 }).lean();

  const categories = CATEGORY_ORDER.map((cat, i) => ({
    key: cat.key,
    label: cat.label,
    bg: BG_BY_INDEX[i % BG_BY_INDEX.length],
    posts: posts.filter((p) => p.category === cat.key),
  })).filter((cat) => cat.posts.length > 0);

  res.render('blog/index', { categories });
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

// Pre-migration posts were served at "/blog/:slug.html" and Google still has
// several of those indexed - without this, they 404 outright instead of
// consolidating onto the clean-URL canonical (see GSC Page Indexing:
// "Not found (404)" and "Duplicate, Google chose different canonical").
router.get('/:slug.html', (req, res) => {
  res.redirect(301, '/blog/' + req.params.slug);
});

router.get('/:slug', async (req, res, next) => {
  const post = await BlogPost.findOne({ slug: req.params.slug, status: 'published' }).lean();
  if (!post) return next();

  const relatedPosts = await BlogPost.find({
    category: post.category,
    status: 'published',
    slug: { $ne: post.slug },
  })
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean();

  res.render('blog/post', { post, relatedPosts });
});

module.exports = router;
