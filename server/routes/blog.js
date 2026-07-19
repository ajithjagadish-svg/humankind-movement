const express = require('express');
const BlogPost = require('../models/BlogPost');
const CATEGORY_ORDER = require('../config/categories');

const router = express.Router();

const BG_BY_INDEX = ['bg-white', 'bg-warm'];

router.get('/', async (req, res) => {
  const posts = await BlogPost.find({ status: 'published' }).sort({ publishedAt: -1 }).lean();

  const categories = CATEGORY_ORDER.map((cat, i) => ({
    label: cat.label,
    bg: BG_BY_INDEX[i % BG_BY_INDEX.length],
    posts: posts.filter((p) => p.category === cat.key),
  })).filter((cat) => cat.posts.length > 0);

  res.render('blog/index', { categories });
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
