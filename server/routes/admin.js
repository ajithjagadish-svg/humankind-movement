const express = require('express');
const AdminUser = require('../models/AdminUser');
const BlogPost = require('../models/BlogPost');
const CATEGORIES = require('../config/categories');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

router.get('/login', (req, res) => {
  if (req.session && req.session.adminUserId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const user = await AdminUser.findOne({ email });
  const valid = user && (await user.verifyPassword(password));

  if (!valid) {
    return res.status(401).render('admin/login', { error: 'Incorrect email or password.' });
  }

  user.lastLoginAt = new Date();
  await user.save();

  req.session.adminUserId = user._id.toString();
  res.redirect('/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/admin/login');
  });
});

router.get('/', requireAuth, (req, res) => res.redirect('/admin/dashboard'));

router.get('/dashboard', requireAuth, (req, res) => {
  res.render('admin/dashboard');
});

// --- Blog post management ---

router.get('/posts', requireAuth, async (req, res) => {
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();
  res.render('admin/posts-list', { posts });
});

router.get('/posts/new', requireAuth, (req, res) => {
  res.render('admin/post-editor', { post: null, categories: CATEGORIES, error: null });
});

router.post('/posts/new', requireAuth, async (req, res) => {
  try {
    await createOrUpdatePost(req.body, null);
    res.redirect('/admin/posts');
  } catch (err) {
    res.status(400).render('admin/post-editor', {
      post: req.body,
      categories: CATEGORIES,
      error: err.message,
    });
  }
});

router.get('/posts/:id/edit', requireAuth, async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id).lean();
  if (!post) return next();
  res.render('admin/post-editor', { post, categories: CATEGORIES, error: null });
});

router.post('/posts/:id/edit', requireAuth, async (req, res, next) => {
  const existing = await BlogPost.findById(req.params.id);
  if (!existing) return next();
  try {
    await createOrUpdatePost(req.body, existing);
    res.redirect('/admin/posts');
  } catch (err) {
    res.status(400).render('admin/post-editor', {
      post: { ...req.body, _id: existing._id },
      categories: CATEGORIES,
      error: err.message,
    });
  }
});

router.post('/posts/:id/delete', requireAuth, async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);
  res.redirect('/admin/posts');
});

async function createOrUpdatePost(body, existing) {
  const category = CATEGORIES.find((c) => c.key === body.category);
  if (!category) throw new Error('Please choose a valid category.');
  if (!body.title || !body.title.trim()) throw new Error('Title is required.');
  if (!body.bodyHtml || !body.bodyHtml.trim()) throw new Error('Post body is required.');

  const slug = (body.slug && body.slug.trim()) || slugify(body.title);
  const status = body.status === 'published' ? 'published' : 'draft';

  const data = {
    slug,
    title: body.title.trim(),
    meta: (body.meta || '').trim(),
    keyword: (body.keyword || '').trim(),
    category: category.key,
    categoryLabel: category.label,
    bodyHtml: body.bodyHtml,
    readMins: Number(body.readMins) || 2,
    status,
    notes: body.notes || '',
  };

  if (status === 'published') {
    data.publishedAt = existing && existing.publishedAt ? existing.publishedAt : new Date();
  }

  if (existing) {
    Object.assign(existing, data);
    await existing.save();
  } else {
    const dupe = await BlogPost.findOne({ slug });
    if (dupe) throw new Error(`A post with the slug "${slug}" already exists.`);
    await BlogPost.create(data);
  }
}

module.exports = router;
