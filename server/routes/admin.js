const express = require('express');
const AdminUser = require('../models/AdminUser');
const BlogPost = require('../models/BlogPost');
const ContentIdea = require('../models/ContentIdea');
const ContactSubmission = require('../models/ContactSubmission');
const IntakeSubmission = require('../models/IntakeSubmission');
const Carousel = require('../models/Carousel');
const CATEGORIES = require('../config/categories');
const requireAuth = require('../middleware/requireAuth');
const { ga4Configured, fetchGA4Stats } = require('../services/ga4');
const { searchConsoleConfigured, fetchSearchConsoleStats } = require('../services/searchConsole');
const { anthropicConfigured, generateCarouselSlides } = require('../services/carouselGen');

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

router.get('/dashboard', requireAuth, async (req, res) => {
  const [draftCount, ideaCount, publishedCount, newContactCount, newIntakeCount] = await Promise.all([
    BlogPost.countDocuments({ status: 'draft' }),
    ContentIdea.countDocuments({ status: 'idea' }),
    BlogPost.countDocuments({ status: 'published' }),
    ContactSubmission.countDocuments({ status: 'new' }),
    IntakeSubmission.countDocuments({ status: 'new' }),
  ]);

  const analyticsReady = ga4Configured() || searchConsoleConfigured();
  let underperforming = [];
  if (analyticsReady) {
    // Posts with real impressions but a low click-through rate - the
    // clearest "worth a rewrite" signal from actual search data.
    underperforming = await BlogPost.find({
      status: 'published',
      'analytics.searchImpressions': { $gt: 20 },
      'analytics.searchCtr': { $lt: 0.02 },
    })
      .sort({ 'analytics.searchImpressions': -1 })
      .limit(5)
      .lean();
  }

  res.render('admin/dashboard', {
    draftCount,
    ideaCount,
    publishedCount,
    newContactCount,
    newIntakeCount,
    analyticsReady,
    underperforming,
  });
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
  res.render('admin/post-editor', { post, categories: CATEGORIES, error: req.query.carouselError || null });
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
    heroImage: (body.heroImage || '').trim(),
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

// --- Content ideas ---

const IDEA_STATUSES = ['idea', 'drafting', 'published'];

router.get('/content-ideas', requireAuth, async (req, res) => {
  const ideas = await ContentIdea.find().sort({ createdAt: -1 }).lean();
  res.render('admin/content-ideas', { ideas, categories: CATEGORIES, error: req.query.carouselError || null });
});

router.post('/content-ideas/new', requireAuth, async (req, res) => {
  const { topic, rationale, targetService, sourceLinks } = req.body;
  if (topic && topic.trim() && rationale && rationale.trim()) {
    await ContentIdea.create({
      topic: topic.trim(),
      rationale: rationale.trim(),
      targetService: targetService || 'other',
      sourceLinks: (sourceLinks || '')
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }
  res.redirect('/admin/content-ideas');
});

router.post('/content-ideas/:id/status', requireAuth, async (req, res) => {
  if (IDEA_STATUSES.includes(req.body.status)) {
    await ContentIdea.findByIdAndUpdate(req.params.id, { status: req.body.status });
  }
  res.redirect('/admin/content-ideas');
});

router.post('/content-ideas/:id/delete', requireAuth, async (req, res) => {
  await ContentIdea.findByIdAndDelete(req.params.id);
  res.redirect('/admin/content-ideas');
});

// Pre-fills a new post from an idea, so writing it up is a shorter step.
// Only postpartum/neurodivergent map cleanly onto a blog category today -
// everything else is left blank rather than guessed.
const IDEA_TO_CATEGORY = { postpartum: 'postpartum', neurodivergent: 'neurodivergent' };

router.get('/content-ideas/:id/draft', requireAuth, async (req, res, next) => {
  const idea = await ContentIdea.findById(req.params.id).lean();
  if (!idea) return next();
  res.render('admin/post-editor', {
    post: {
      title: idea.topic,
      meta: idea.rationale,
      category: IDEA_TO_CATEGORY[idea.targetService] || '',
    },
    categories: CATEGORIES,
    error: null,
  });
});

// --- Analytics ---

router.get('/analytics', requireAuth, async (req, res) => {
  const configured = { ga4: ga4Configured(), searchConsole: searchConsoleConfigured() };
  const posts = await BlogPost.find({ status: 'published' }).sort({ 'analytics.searchImpressions': -1 }).lean();
  res.render('admin/analytics', { posts, configured, refreshError: null, refreshedAt: null });
});

router.post('/analytics/refresh', requireAuth, async (req, res) => {
  const configured = { ga4: ga4Configured(), searchConsole: searchConsoleConfigured() };
  let refreshError = null;

  try {
    const [ga4Stats, scStats] = await Promise.all([
      ga4Configured() ? fetchGA4Stats() : Promise.resolve(null),
      searchConsoleConfigured() ? fetchSearchConsoleStats() : Promise.resolve(null),
    ]);

    const posts = await BlogPost.find({ status: 'published' });
    await Promise.all(
      posts.map((post) => {
        const path = `/blog/${post.slug}`;
        if (ga4Stats && ga4Stats[path]) {
          post.analytics.pageviews = ga4Stats[path].pageviews;
          post.analytics.engagement = ga4Stats[path].engagementSeconds;
        }
        if (scStats && scStats[path]) {
          post.analytics.searchClicks = scStats[path].clicks;
          post.analytics.searchImpressions = scStats[path].impressions;
          post.analytics.searchCtr = scStats[path].ctr;
          post.analytics.searchAvgPosition = scStats[path].position;
        }
        post.analytics.updatedAt = new Date();
        return post.save();
      })
    );
  } catch (err) {
    refreshError = err.message;
  }

  const posts = await BlogPost.find({ status: 'published' }).sort({ 'analytics.searchImpressions': -1 }).lean();
  res.render('admin/analytics', { posts, configured, refreshError, refreshedAt: new Date() });
});

// --- Submissions (contact + intake forms) ---

router.get('/submissions', requireAuth, async (req, res) => {
  const [contacts, intakes] = await Promise.all([
    ContactSubmission.find().sort({ createdAt: -1 }).lean(),
    IntakeSubmission.find().sort({ createdAt: -1 }).lean(),
  ]);
  res.render('admin/submissions', { contacts, intakes });
});

router.get('/submissions/contact/:id', requireAuth, async (req, res, next) => {
  const submission = await ContactSubmission.findById(req.params.id).lean();
  if (!submission) return next();
  res.render('admin/submission-contact', { submission });
});

router.post('/submissions/contact/:id/status', requireAuth, async (req, res) => {
  if (['new', 'read', 'archived'].includes(req.body.status)) {
    await ContactSubmission.findByIdAndUpdate(req.params.id, { status: req.body.status });
  }
  res.redirect('/admin/submissions');
});

router.post('/submissions/contact/:id/delete', requireAuth, async (req, res) => {
  await ContactSubmission.findByIdAndDelete(req.params.id);
  res.redirect('/admin/submissions');
});

router.get('/submissions/intake/:id', requireAuth, async (req, res, next) => {
  const submission = await IntakeSubmission.findById(req.params.id).lean();
  if (!submission) return next();
  if (submission.status === 'new') {
    await IntakeSubmission.findByIdAndUpdate(req.params.id, { status: 'reviewed' });
    submission.status = 'reviewed';
  }
  res.render('admin/submission-intake', { submission });
});

router.post('/submissions/intake/:id/delete', requireAuth, async (req, res) => {
  await IntakeSubmission.findByIdAndDelete(req.params.id);
  res.redirect('/admin/submissions');
});

// --- Carousels (LinkedIn/Instagram carousel copy, generated via Claude) ---

async function resolveCarouselSource(sourceType, sourceId) {
  if (sourceType === 'blogPost') {
    const post = await BlogPost.findById(sourceId).lean();
    if (!post) throw new Error('Blog post not found.');
    return { title: post.title, context: `${post.meta || ''}\n\n${post.bodyHtml}` };
  }
  if (sourceType === 'contentIdea') {
    const idea = await ContentIdea.findById(sourceId).lean();
    if (!idea) throw new Error('Content idea not found.');
    return { title: idea.topic, context: idea.rationale };
  }
  throw new Error('Unknown source type.');
}

function redirectToSource(res, sourceType, sourceId, errorMessage) {
  const query = `?carouselError=${encodeURIComponent(errorMessage)}`;
  if (sourceType === 'blogPost') return res.redirect(`/admin/posts/${sourceId}/edit${query}`);
  return res.redirect(`/admin/content-ideas${query}`);
}

router.get('/carousels', requireAuth, async (req, res) => {
  const carousels = await Carousel.find().sort({ updatedAt: -1 }).lean();
  res.render('admin/carousels-list', { carousels });
});

router.post('/carousels/generate', requireAuth, async (req, res) => {
  const { sourceType, sourceId } = req.body;
  try {
    if (!anthropicConfigured()) throw new Error('ANTHROPIC_API_KEY is not configured yet - add it as a secret env var to enable this.');
    const { title, context } = await resolveCarouselSource(sourceType, sourceId);
    const slides = await generateCarouselSlides({ title, context });
    const carousel = await Carousel.create({ title, sourceType, sourceId, slides });
    res.redirect(`/admin/carousels/${carousel._id}/edit`);
  } catch (err) {
    redirectToSource(res, sourceType, sourceId, err.message);
  }
});

router.get('/carousels/:id/edit', requireAuth, async (req, res, next) => {
  const carousel = await Carousel.findById(req.params.id).lean();
  if (!carousel) return next();
  res.render('admin/carousel-editor', { carousel, error: req.query.error || null });
});

router.post('/carousels/:id/regenerate', requireAuth, async (req, res, next) => {
  const carousel = await Carousel.findById(req.params.id);
  if (!carousel) return next();
  try {
    if (!anthropicConfigured()) throw new Error('ANTHROPIC_API_KEY is not configured yet - add it as a secret env var to enable this.');
    const { title, context } = await resolveCarouselSource(carousel.sourceType, carousel.sourceId);
    carousel.slides = await generateCarouselSlides({ title, context });
    await carousel.save();
  } catch (err) {
    return res.redirect(`/admin/carousels/${carousel._id}/edit?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect(`/admin/carousels/${carousel._id}/edit`);
});

router.post('/carousels/:id/save', requireAuth, async (req, res, next) => {
  const carousel = await Carousel.findById(req.params.id);
  if (!carousel) return next();
  try {
    carousel.slides = JSON.parse(req.body.slidesJson);
    await carousel.save();
  } catch (err) {
    return res.redirect(`/admin/carousels/${carousel._id}/edit?error=${encodeURIComponent('Could not save changes.')}`);
  }
  res.redirect(`/admin/carousels/${carousel._id}/edit`);
});

router.post('/carousels/:id/delete', requireAuth, async (req, res) => {
  await Carousel.findByIdAndDelete(req.params.id);
  res.redirect('/admin/carousels');
});

module.exports = router;
