const express = require('express');
const fs = require('fs');
const path = require('path');
const carouselDesigns = require('../lib/carouselDesigns');
const carouselBase = require('../lib/carouselDesigns/base');
const carouselStandards = require('../lib/carouselStandards');
const AdminUser = require('../models/AdminUser');
const BlogPost = require('../models/BlogPost');
const ContentIdea = require('../models/ContentIdea');
const ContactSubmission = require('../models/ContactSubmission');
const IntakeSubmission = require('../models/IntakeSubmission');
const EbookLead = require('../models/EbookLead');
const Carousel = require('../models/Carousel');
const EngagementLead = require('../models/EngagementLead');
const SocialPost = require('../models/SocialPost');
const PublishQueueItem = require('../models/PublishQueueItem');
const ClientProfile = require('../models/ClientProfile');
const Subscriber = require('../models/Subscriber');
const CATEGORIES = require('../config/categories');
const requireAuth = require('../middleware/requireAuth');
const blogStandards = require('../lib/blogStandards');
const { ga4Configured, fetchGA4Stats, fetchGA4ConversionSummary, fetchGA4TimeSeries } = require('../services/ga4');
const { searchConsoleConfigured, fetchSearchConsoleStats } = require('../services/searchConsole');
const { anthropicConfigured, generateCarouselSlides } = require('../services/carouselGen');
const { getPageViewSummary } = require('../services/pageViews');
const nutritionTargets = require('../services/nutritionTargets');
const { generatePlanPdf } = require('../services/planPdf');
const { generateSunlightGuidance } = require('../services/sunlightGuidance');
const { generateMealPlanDraft } = require('../services/mealPlanGen');
const { checkDietaryCompliance } = require('../services/dietaryCompliance');
const { notifySubscribers } = require('../services/blogSubscriptions');
const LlmMention = require('../models/LlmMention');
const LLM_TRACKER_PROMPTS = require('../config/llmTrackerPrompts');

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

// "Today" and "overdue" mean the day Ajith is actually in (IST), not UTC.
function istDayStart(offsetDays = 0) {
  const IST_MS = 5.5 * 3600 * 1000;
  const midnight = Math.floor((Date.now() + IST_MS) / 86400000) * 86400000 - IST_MS;
  return new Date(midnight + offsetDays * 86400000);
}

router.get('/dashboard', requireAuth, async (req, res) => {
  const todayStart = istDayStart(0);
  const tomorrowStart = istDayStart(1);
  const horizon = istDayStart(3); // end of the day after tomorrow
  const staleBefore = istDayStart(-7); // older than a week and still 'unposted' is almost always a tick nobody made, not a missed post
  const analyticsReady = ga4Configured() || searchConsoleConfigured();

  // One parallel batch: every query is independent, so the page costs one round trip, not several in a row.
  const [
    draftCount, ideaCount, publishedCount, newContactCount, newIntakeCount, newLeadCount, openCarouselCount,
    queueItems, staleQueueCount, blogPipeline, underperforming, oldestContact, oldestIntake,
  ] = await Promise.all([
    BlogPost.countDocuments({ status: 'draft' }),
    ContentIdea.countDocuments({ status: 'idea' }),
    BlogPost.countDocuments({ status: 'published' }),
    ContactSubmission.countDocuments({ status: 'new' }),
    IntakeSubmission.countDocuments({ status: 'new' }),
    EngagementLead.countDocuments({ status: 'new' }),
    Carousel.countDocuments({ status: 'draft' }),
    // Publishing queue: a platform still not posted that was due in the last 7 days or is due in the next 3.
    PublishQueueItem.find({ scheduledDate: { $gte: staleBefore, $lt: horizon }, 'platforms.status': 'queued' }).sort({ scheduledDate: 1 }).limit(40).lean(),
    // Older than that: kept out of the overdue alarm (see staleBefore) and shown as one quiet 'tidy the queue' line.
    PublishQueueItem.countDocuments({ scheduledDate: { $lt: staleBefore }, 'platforms.status': 'queued' }),
    // Blog drafts that follow the blog standard, with where each one stands (ready, waiting for Ajith, or what to fix).
    BlogPost.find({ status: 'draft', locale: 'en', $or: [{ standards: 'v1' }, { createdAt: { $gte: blogStandards.STANDARDS_START } }] })
      .sort({ updatedAt: -1 }).limit(10).lean()
      .then((drafts) => blogStandards.draftReadiness(drafts, BlogPost))
      .then((rows) => { const order = { ready: 0, approval: 1, fix: 2 }; return rows.sort((x, y) => order[x.state] - order[y.state]); }),
    // Posts with real impressions but a low click-through rate: the clearest "worth a rewrite" signal from search data.
    analyticsReady
      ? BlogPost.find({ status: 'published', 'analytics.searchImpressions': { $gt: 20 }, 'analytics.searchCtr': { $lt: 0.02 } })
        .sort({ 'analytics.searchImpressions': -1 }).limit(5).lean()
      : Promise.resolve([]),
    // How long the longest-waiting new message has been sitting
    ContactSubmission.findOne({ status: 'new' }).sort({ createdAt: 1 }).select('createdAt').lean(),
    IntakeSubmission.findOne({ status: 'new' }).sort({ createdAt: 1 }).select('createdAt').lean(),
  ]);

  const waiting = (doc) => { const d = doc ? Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 86400000) : 0; return d >= 2 ? ' (oldest waiting ' + d + ' days)' : ''; };

  // Queue: which platforms are still unposted, and is it overdue, today or coming up
  const queue = queueItems.map((item) => {
    const queued = item.platforms.filter((p) => p.status === 'queued').map((p) => p.name);
    const when = item.scheduledDate < todayStart ? 'overdue' : item.scheduledDate < tomorrowStart ? 'today' : 'soon';
    return { _id: item._id, title: item.title, scheduledDate: item.scheduledDate, queued, when };
  });
  const overdue = queue.filter((q) => q.when === 'overdue');
  const dueToday = queue.filter((q) => q.when === 'today');
  const sum = (list) => list.reduce((n, q) => n + q.queued.length, 0);
  const waitingForApproval = blogPipeline.filter((r) => r.state === 'approval').length;
  const readyToPublish = blogPipeline.filter((r) => r.state === 'ready').length;

  // The do-now list: only things that need action, most time-sensitive first.
  const attention = [];
  const add = (n, one, many, href, tone) => { if (n > 0) attention.push({ n, text: n === 1 ? one : many, href, tone: tone || '' }); };
  add(newContactCount, 'new contact message' + waiting(oldestContact), 'new contact messages' + waiting(oldestContact), '/admin/submissions', 'lead');
  add(newIntakeCount, 'new intake form' + waiting(oldestIntake), 'new intake forms' + waiting(oldestIntake), '/admin/submissions', 'lead');
  add(sum(overdue), 'overdue post still not published on its platform', 'overdue posts still not published on their platforms (' + overdue.length + ' queue item' + (overdue.length === 1 ? '' : 's') + ')', '/admin/queue?status=queued', 'late');
  add(sum(dueToday), 'post due today', 'posts due today across platforms', '/admin/queue?status=queued', 'today');
  add(readyToPublish, 'blog post ready to publish', 'blog posts ready to publish', '/admin/posts', 'good');
  add(waitingForApproval, 'blog draft waiting for your approval', 'blog drafts waiting for your approval', '/admin/posts', '');
  add(newLeadCount, 'new engagement lead to comment on', 'new engagement leads to comment on', '/admin/engagement', '');
  add(staleQueueCount, 'older queue item (over a week) still shows an unposted platform: mark it posted or remove it', 'older queue items (over a week) still show unposted platforms: mark them posted or remove them so the overdue list stays meaningful', '/admin/queue?status=queued', 'quiet');

  res.render('admin/dashboard', {
    attention, queue, blogPipeline,
    draftCount, ideaCount, publishedCount, openCarouselCount,
    analyticsReady, underperforming,
  });
});

// --- Blog post management ---

router.get('/posts', requireAuth, async (req, res) => {
  const posts = await BlogPost.find().sort({ updatedAt: -1 }).lean();
  // Posts that follow the blog standard show whether they are ready to publish (checked in parallel).
  const tracked = posts.filter((post) => post.status === 'draft' && blogStandards.isStandardsPost(post));
  const readiness = await blogStandards.draftReadiness(tracked, BlogPost);
  readiness.forEach((r) => { r.post.standardsNote = r.state === 'ready' ? 'ready to publish' : r.state === 'approval' ? 'waiting for your approval' : r.count + ' to fix'; });
  res.render('admin/posts-list', { posts });
});

router.get('/posts/new', requireAuth, async (req, res) => {
  // New posts start from the blog template (server/lib/blogStandards.js): the structure the standard needs is already there.
  const post = { bodyHtml: blogStandards.POST_TEMPLATE_HTML, notes: blogStandards.NOTES_TEMPLATE, standards: 'v1', review: {} };
  res.render('admin/post-editor', { post, categories: CATEGORIES, error: null, standards: await blogStandards.standardsContext(post, BlogPost), reviewItems: blogStandards.REVIEW_ITEMS, saved: false });
});

router.post('/posts/new', requireAuth, async (req, res) => {
  try {
    const saved = await createOrUpdatePost(req.body, null, req.body.contentIdeaId || null);
    // Stay on the post so the standards checklist is the first thing seen after saving.
    res.redirect(blogStandards.isStandardsPost(saved) ? `/admin/posts/${saved._id}/edit?saved=1` : '/admin/posts');
  } catch (err) {
    const post = { ...req.body, standards: 'v1', review: reviewFromBody(req.body) };
    res.status(400).render('admin/post-editor', {
      post,
      categories: CATEGORIES,
      error: err.message,
      standards: await blogStandards.standardsContext(post, BlogPost),
      reviewItems: blogStandards.REVIEW_ITEMS,
      saved: false,
    });
  }
});

router.get('/posts/:id/edit', requireAuth, async (req, res, next) => {
  const post = await BlogPost.findById(req.params.id).lean();
  if (!post) return next();
  res.render('admin/post-editor', {
    post,
    categories: CATEGORIES,
    error: req.query.carouselError || null,
    standards: await blogStandards.standardsContext(post, BlogPost),
    reviewItems: blogStandards.REVIEW_ITEMS,
    saved: req.query.saved === '1',
  });
});

router.post('/posts/:id/edit', requireAuth, async (req, res, next) => {
  const existing = await BlogPost.findById(req.params.id);
  if (!existing) return next();
  try {
    const saved = await createOrUpdatePost(req.body, existing);
    res.redirect(blogStandards.isStandardsPost(saved) ? `/admin/posts/${saved._id}/edit?saved=1` : '/admin/posts');
  } catch (err) {
    const post = { ...req.body, _id: existing._id, slug: req.body.slug || existing.slug, createdAt: existing.createdAt, standards: existing.standards, locale: existing.locale, review: reviewFromBody(req.body) };
    res.status(400).render('admin/post-editor', {
      post,
      categories: CATEGORIES,
      error: err.message,
      standards: await blogStandards.standardsContext(post, BlogPost),
      reviewItems: blogStandards.REVIEW_ITEMS,
      saved: false,
    });
  }
});

router.post('/posts/:id/delete', requireAuth, async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);

  // Deleting a draft is how a drafted idea gets rejected. Reset the idea
  // rather than leaving it pointed at a post that no longer exists, so the
  // topic/rationale/sources stay available to redraft later.
  await ContentIdea.findOneAndUpdate(
    { linkedPost: req.params.id },
    { status: 'idea', $unset: { linkedPost: '' } }
  );

  res.redirect('/admin/posts');
});

// Ticks from the editor's "Before it goes live" boxes (checkbox names: review_<key>)
function reviewFromBody(body) {
  const review = {};
  for (const item of blogStandards.REVIEW_ITEMS) review[item.key] = !!body['review_' + item.key];
  return review;
}

async function createOrUpdatePost(body, existing, contentIdeaId) {
  const category = CATEGORIES.find((c) => c.key === body.category);
  if (!category) throw new Error('Please choose a valid category.');
  if (!body.title || !body.title.trim()) throw new Error('Title is required.');
  if (!body.bodyHtml || !body.bodyHtml.trim()) throw new Error('Post body is required.');

  const slug = (body.slug && body.slug.trim()) || slugify(body.title);
  const status = body.status === 'published' ? 'published' : 'draft';
  const isFreshPublish = status === 'published' && !(existing && existing.publishedAt);

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

  // The blog standard (server/lib/blogStandards.js) applies to every post created from 2026-11-03. A draft can always be
  // saved; going live is blocked until the lint is clean, the review boxes are ticked and a share image exists.
  const followsStandard = existing ? blogStandards.isStandardsPost(existing) : true;
  if (followsStandard) {
    data.standards = 'v1';
    data.review = reviewFromBody(body);
    if (status === 'published') {
      const problems = await blogStandards.publishProblems({ ...data, locale: existing ? existing.locale : 'en' }, BlogPost);
      if (problems.length) throw new Error('Not ready to publish. Fix these first:\n- ' + problems.join('\n- '));
    }
  }

  if (status === 'published') {
    data.publishedAt = existing && existing.publishedAt ? existing.publishedAt : new Date();
  }

  let savedPost;
  if (existing) {
    Object.assign(existing, data);
    savedPost = await existing.save();
  } else {
    const dupe = await BlogPost.findOne({ slug });
    if (dupe) throw new Error(`A post with the slug "${slug}" already exists.`);
    savedPost = await BlogPost.create(data);

    // Link a freshly-created post back to the idea it was drafted from, so
    // "Review draft" on the Content Ideas list opens this real post instead
    // of a blank editor every time (previously nothing ever set this, so a
    // new post created this way was silently orphaned from its idea).
    if (contentIdeaId) {
      await ContentIdea.findByIdAndUpdate(contentIdeaId, { linkedPost: savedPost._id });
    }
  }

  // Keep the Content Ideas dashboard's status label truthful - it should
  // never say "published" while the actual post is still a draft, or vice
  // versa. This is the single place a post's status changes, so sync here
  // rather than relying on a separate manual button that can drift out of sync.
  const linkedIdea = await ContentIdea.findOne({ linkedPost: savedPost._id });
  if (linkedIdea && linkedIdea.status !== status) {
    linkedIdea.status = status === 'published' ? 'published' : 'drafting';
    await linkedIdea.save();
  }

  // Category subscribers only hear about this once, at the moment it first
  // goes live - not on every later edit to an already-published post.
  if (isFreshPublish) {
    notifySubscribers(savedPost).catch((err) => {
      console.error('notifySubscribers failed:', err.message);
    });
  }

  return savedPost;
}

// --- Content ideas ---

const IDEA_STATUSES = ['idea', 'drafting', 'published'];

router.get('/content-ideas', requireAuth, async (req, res) => {
  const filterFormat = ['blog-post', 'social-content'].includes(req.query.format) ? req.query.format : null;
  const query = filterFormat ? { format: filterFormat } : {};
  const ideas = await ContentIdea.find(query).sort({ createdAt: -1 }).lean();
  res.render('admin/content-ideas', { ideas, categories: CATEGORIES, error: req.query.carouselError || null, filterFormat });
});

router.post('/content-ideas/new', requireAuth, async (req, res) => {
  const { topic, rationale, targetService, sourceLinks, format } = req.body;
  if (topic && topic.trim() && rationale && rationale.trim()) {
    await ContentIdea.create({
      topic: topic.trim(),
      rationale: rationale.trim(),
      targetService: targetService || 'other',
      format: format === 'social-content' ? 'social-content' : 'blog-post',
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
  const idea = await ContentIdea.findByIdAndDelete(req.params.id);
  // Deleting the idea itself should take its draft with it, otherwise the
  // draft is left sitting in /admin/posts with nothing pointing to it.
  if (idea && idea.linkedPost) {
    await BlogPost.findByIdAndDelete(idea.linkedPost);
  }
  res.redirect('/admin/content-ideas');
});

// Pre-fills a new post from an idea, so writing it up is a shorter step.
// Only postpartum/neurodivergent map cleanly onto a blog category today -
// everything else is left blank rather than guessed.
const IDEA_TO_CATEGORY = { postpartum: 'postpartum', neurodivergent: 'neurodivergent' };

router.get('/content-ideas/:id/draft', requireAuth, async (req, res, next) => {
  const idea = await ContentIdea.findById(req.params.id).lean();
  if (!idea) return next();

  // A full draft already exists for this idea - open the real editor (with
  // the actual title/body/status), not a blank form pretending it's new.
  if (idea.linkedPost) {
    return res.redirect(`/admin/posts/${idea.linkedPost}/edit`);
  }

  res.render('admin/post-editor', {
    post: {
      title: idea.topic,
      meta: idea.rationale,
      category: IDEA_TO_CATEGORY[idea.targetService] || '',
      contentIdeaId: idea._id,
    },
    categories: CATEGORIES,
    error: null,
  });
});

// --- Analytics ---

// The guide gets its own lightweight pageview counter (server/services/pageViews.js)
// rather than depending on GA4, since it has none of its traffic from organic
// search (it's promoted entirely via social) and GA4 isn't configured yet anyway.
async function getGuideStats() {
  const [{ total: totalViews }, totalSignups] = await Promise.all([
    getPageViewSummary('/postpartum-recovery-guide'),
    EbookLead.countDocuments({ resource: 'postpartum-recovery-guide' }),
  ]);
  const conversionRate = totalViews > 0 ? totalSignups / totalViews : null;
  return { totalViews, totalSignups, conversionRate };
}

async function getConversionSummary(configured) {
  if (!configured.ga4) return { conversions: null, conversionError: null };
  try {
    const conversions = await fetchGA4ConversionSummary();
    return { conversions, conversionError: null };
  } catch (err) {
    return { conversions: null, conversionError: err.message };
  }
}

async function getTimeSeries(configured) {
  if (!configured.ga4) return null;
  try {
    return await fetchGA4TimeSeries({ days: 30 });
  } catch (err) {
    return null;
  }
}

// Pairs each tracked social post with the sessions GA4 recorded on its publish
// day and the two days after, plus the 30-day average as a baseline. This is
// deliberately NOT a correlation coefficient - with a handful of posts that
// would just be false precision. It's a same-window comparison so a real
// pattern (or the lack of one) is visible without overstating confidence.
function getSocialPostsWithContext(socialPosts, timeSeries) {
  if (!timeSeries || !timeSeries.length) {
    return socialPosts.map((post) => ({ post, sessionsByDay: null, baseline: null }));
  }
  const byDate = {};
  timeSeries.forEach((row) => { byDate[row.date] = row.sessions; });
  const baseline = timeSeries.reduce((sum, row) => sum + row.sessions, 0) / timeSeries.length;

  return socialPosts.map((post) => {
    const sessionsByDay = [0, 1, 2].map((offset) => {
      const d = new Date(post.publishedAt);
      d.setUTCDate(d.getUTCDate() + offset);
      const iso = d.toISOString().slice(0, 10);
      return { date: iso, sessions: byDate[iso] !== undefined ? byDate[iso] : null };
    });
    const knownDays = sessionsByDay.filter((d) => d.sessions !== null);
    const peakSessions = knownDays.length ? Math.max(...knownDays.map((d) => d.sessions)) : null;
    const lift = peakSessions !== null && baseline > 0 ? peakSessions / baseline : null;
    let liftLabel = 'no data';
    if (lift !== null) {
      if (lift >= 1.3) liftLabel = 'above baseline';
      else if (lift <= 0.7) liftLabel = 'below baseline';
      else liftLabel = 'near baseline';
    }
    return { post, sessionsByDay, baseline, lift, liftLabel };
  });
}

// Groups tracked posts by platform + account (e.g. "linkedin - Ajith personal"
// vs "linkedin - Humankind Movement Page") so reach can be compared account
// to account, not just lumped together as "LinkedIn".
function getAccountSummary(socialPosts) {
  const groups = {};
  socialPosts.forEach((post) => {
    const key = `${post.platform}::${post.account}`;
    if (!groups[key]) {
      groups[key] = { platform: post.platform, account: post.account, posts: 0, impressions: 0, impressionsCount: 0, likes: 0, clicks: 0, clicksCount: 0 };
    }
    const g = groups[key];
    g.posts += 1;
    g.likes += post.metrics.likes || 0;
    if (post.metrics.impressions !== null && post.metrics.impressions !== undefined) {
      g.impressions += post.metrics.impressions;
      g.impressionsCount += 1;
    }
    if (post.metrics.clicks !== null && post.metrics.clicks !== undefined) {
      g.clicks += post.metrics.clicks;
      g.clicksCount += 1;
    }
  });
  return Object.values(groups).map((g) => ({
    ...g,
    avgImpressions: g.impressionsCount ? Math.round(g.impressions / g.impressionsCount) : null,
    avgLikes: g.posts ? +(g.likes / g.posts).toFixed(1) : null,
  }));
}

// Two actionable slices of the same Search Console data as the big table
// below, surfaced separately so they don't get lost in a 50-row list:
// - posts already on page 2 (closest to a page-1 win, no new content needed)
// - posts Google already shows for real searches but nobody clicks (usually
//   a title/meta problem, not a content problem)
function getRankingOpportunities(posts) {
  const closeToPageOne = posts
    .filter((p) => p.analytics.searchImpressions > 0 && p.analytics.searchAvgPosition >= 8 && p.analytics.searchAvgPosition <= 20)
    .sort((a, b) => a.analytics.searchAvgPosition - b.analytics.searchAvgPosition);

  const highImpressionsLowCtr = posts
    .filter((p) => p.analytics.searchImpressions > 20 && p.analytics.searchCtr < 0.02)
    .sort((a, b) => b.analytics.searchImpressions - a.analytics.searchImpressions);

  return { closeToPageOne, highImpressionsLowCtr };
}

router.get('/analytics', requireAuth, async (req, res) => {
  const configured = { ga4: ga4Configured(), searchConsole: searchConsoleConfigured() };
  const posts = await BlogPost.find({ status: 'published' }).sort({ 'analytics.searchImpressions': -1 }).lean();
  const guideStats = await getGuideStats();
  const { conversions, conversionError } = await getConversionSummary(configured);
  const timeSeries = await getTimeSeries(configured);
  const socialPosts = await SocialPost.find().sort({ publishedAt: -1 }).lean();
  const socialPostsWithContext = getSocialPostsWithContext(socialPosts, timeSeries);
  const accountSummary = getAccountSummary(socialPosts);
  const rankingOpportunities = configured.searchConsole ? getRankingOpportunities(posts) : { closeToPageOne: [], highImpressionsLowCtr: [] };
  res.render('admin/analytics', { posts, configured, guideStats, conversions, conversionError, timeSeries, socialPostsWithContext, accountSummary, rankingOpportunities, refreshError: null, refreshedAt: null });
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
  const guideStats = await getGuideStats();
  const { conversions, conversionError } = await getConversionSummary(configured);
  const timeSeries = await getTimeSeries(configured);
  const socialPosts = await SocialPost.find().sort({ publishedAt: -1 }).lean();
  const socialPostsWithContext = getSocialPostsWithContext(socialPosts, timeSeries);
  const accountSummary = getAccountSummary(socialPosts);
  const rankingOpportunities = configured.searchConsole ? getRankingOpportunities(posts) : { closeToPageOne: [], highImpressionsLowCtr: [] };
  res.render('admin/analytics', { posts, configured, guideStats, conversions, conversionError, timeSeries, socialPostsWithContext, accountSummary, rankingOpportunities, refreshError, refreshedAt: new Date() });
});

// --- Submissions (contact + intake forms) ---

router.get('/submissions', requireAuth, async (req, res) => {
  const [contacts, intakes, ebookLeads, subscribers] = await Promise.all([
    ContactSubmission.find().sort({ createdAt: -1 }).lean(),
    IntakeSubmission.find().sort({ createdAt: -1 }).lean(),
    EbookLead.find().sort({ createdAt: -1 }).lean(),
    Subscriber.find().sort({ createdAt: -1 }).lean(),
  ]);
  const categoryLabelByKey = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));
  res.render('admin/submissions', { contacts, intakes, ebookLeads, subscribers, categoryLabelByKey });
});

router.post('/submissions/subscribers/:id/delete', requireAuth, async (req, res) => {
  await Subscriber.findByIdAndDelete(req.params.id);
  res.redirect('/admin/submissions');
});

router.post('/submissions/ebook-leads/:id/status', requireAuth, async (req, res) => {
  if (['new', 'contacted'].includes(req.body.status)) {
    await EbookLead.findByIdAndUpdate(req.params.id, { status: req.body.status });
  }
  res.redirect('/admin/submissions');
});

router.post('/submissions/ebook-leads/:id/delete', requireAuth, async (req, res) => {
  await EbookLead.findByIdAndDelete(req.params.id);
  res.redirect('/admin/submissions');
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

// --- Client profiles (the ongoing "Starting Point" record - see
// server/models/ClientProfile.js and server/services/nutritionTargets.js.
// Distinct from IntakeSubmission, which is a frozen one-time snapshot: this
// is the living record a coach opens repeatedly to log weight and run the
// hand-out-a-plan / check-in-later loop. ---

router.get('/clients', requireAuth, async (req, res) => {
  const clients = await ClientProfile.find().sort({ createdAt: -1 }).lean();
  res.render('admin/clients-list', { clients, nutritionTargets });
});

router.get('/clients/new', requireAuth, async (req, res, next) => {
  let fromIntake = null;
  if (req.query.fromIntake) {
    fromIntake = await IntakeSubmission.findById(req.query.fromIntake).lean();
    if (!fromIntake) return next();
  }
  res.render('admin/client-profile-form', { profile: null, fromIntake, error: null, nutritionTargets });
});

router.post('/clients/new', requireAuth, async (req, res) => {
  try {
    const profile = await buildClientProfileData(req.body);
    const created = await ClientProfile.create(profile);
    res.redirect(`/admin/clients/${created._id}`);
  } catch (err) {
    res.status(400).render('admin/client-profile-form', { profile: req.body, fromIntake: null, error: err.message, nutritionTargets });
  }
});

router.get('/clients/:id', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id).lean();
  if (!profile) return next();

  const startingPoint = nutritionTargets.computeStartingPoint({
    dateOfBirth: profile.dateOfBirth,
    heightCm: profile.heightCm,
    bodyWeightKg: profile.currentWeightKg,
    activityFactor: profile.activityFactor,
    calorieAdjustment: profile.calorieAdjustment,
    proteinPerKg: profile.proteinPerKg,
    fatPerKg: profile.fatPerKg,
  });
  const goalLock = nutritionTargets.lockStatus(profile.goalSetAt);
  const activityLock = nutritionTargets.lockStatus(profile.activityLevelSetAt);
  const dietaryFlags = checkDietaryCompliance(profile.weeklyPlanTable, profile.dietaryPreference);

  res.render('admin/client-profile', { profile, startingPoint, goalLock, activityLock, nutritionTargets, dietaryFlags, error: req.query.error || null });
});

router.get('/clients/:id/edit', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id).lean();
  if (!profile) return next();
  const dietaryFlags = checkDietaryCompliance(profile.weeklyPlanTable, profile.dietaryPreference);
  res.render('admin/client-profile-form', { profile, fromIntake: null, error: req.query.error || null, success: req.query.success || null, dietaryFlags, nutritionTargets });
});

router.post('/clients/:id/edit', requireAuth, async (req, res, next) => {
  const existing = await ClientProfile.findById(req.params.id);
  if (!existing) return next();
  try {
    const data = await buildClientProfileData(req.body, existing);
    Object.assign(existing, data);
    await existing.save();
    res.redirect(`/admin/clients/${existing._id}`);
  } catch (err) {
    res.status(400).render('admin/client-profile-form', { profile: { ...req.body, _id: existing._id }, fromIntake: null, error: err.message, nutritionTargets });
  }
});

async function buildClientProfileData(body, existing) {
  if (!body.fullName || !body.fullName.trim()) throw new Error('Name is required.');
  if (!body.dateOfBirth) throw new Error('Date of birth is required.');
  if (!body.goal) throw new Error('Goal is required.');
  if (!body.activityLevel) throw new Error('Activity level is required.');

  const heightCm = parseFloat(body.heightCm);
  const currentWeightKg = parseFloat(body.currentWeightKg);
  const activityFactor = parseFloat(body.activityFactor);
  const calorieAdjustment = parseFloat(body.calorieAdjustment) || 0;
  const proteinPerKg = parseFloat(body.proteinPerKg);
  const fatPerKg = parseFloat(body.fatPerKg) || 0.9;

  if (!heightCm || heightCm <= 0) throw new Error('Height (cm) must be a positive number.');
  if (!currentWeightKg || currentWeightKg <= 0) throw new Error('Weight (kg) must be a positive number.');
  if (!activityFactor || activityFactor <= 0) throw new Error('Activity factor must be a positive number.');
  if (!proteinPerKg || proteinPerKg <= 0) throw new Error('Protein per kg must be a positive number.');

  const data = {
    fullName: body.fullName.trim(),
    email: (body.email || '').trim(),
    dateOfBirth: body.dateOfBirth,
    heightCm,
    location: (body.location || '').trim(),
    dietaryPreference: (body.dietaryPreference || '').trim(),
    cuisineBackground: (body.cuisineBackground || '').trim(),
    currentWeightKg,
    goal: body.goal,
    activityLevel: body.activityLevel,
    trainingSchedule: (body.trainingSchedule || '').trim(),
    activityFactor,
    calorieAdjustment,
    proteinPerKg,
    fatPerKg,
    currentPlanVersion: (body.currentPlanVersion || '').trim(),
    weeklyPlanTable: (body.weeklyPlanTable || '').trim(),
    sunlightNotes: (body.sunlightNotes || '').trim(),
  };

  if (body.intakeSubmissionId) data.intakeSubmissionId = body.intakeSubmissionId;

  if (!existing) {
    data.goalSetAt = new Date();
    data.activityLevelSetAt = new Date();
    data.weightLog = [{ date: new Date(), weightKg: currentWeightKg, note: 'Starting weight' }];
    if (data.currentPlanVersion) data.currentPlanIssuedAt = new Date();
  } else {
    if (existing.goal !== data.goal) data.goalSetAt = new Date();
    if (existing.activityLevel !== data.activityLevel) data.activityLevelSetAt = new Date();
    if (data.currentPlanVersion && data.currentPlanVersion !== existing.currentPlanVersion) data.currentPlanIssuedAt = new Date();
  }

  return data;
}

router.post('/clients/:id/weight', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id);
  if (!profile) return next();
  const weightKg = parseFloat(req.body.weightKg);
  if (!weightKg || weightKg <= 0) {
    return res.redirect(`/admin/clients/${profile._id}?error=${encodeURIComponent('Enter a valid weight in kg.')}`);
  }
  profile.weightLog.push({ date: new Date(), weightKg, note: (req.body.note || '').trim() });
  profile.currentWeightKg = weightKg;
  await profile.save();
  res.redirect(`/admin/clients/${profile._id}`);
});

// The hand-out-a-plan / follow-it / report-back loop: coach logs what the
// client reported at check-in and what happens next. "reassess-goal" does
// not itself change goal/activityLevel - the coach still edits those via
// the form above, which is what actually resets the 12-week lock timer.
router.post('/clients/:id/checkin', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id);
  if (!profile) return next();
  if (!['continue', 'adjust-plan', 'reassess-goal'].includes(req.body.decision)) {
    return res.redirect(`/admin/clients/${profile._id}?error=${encodeURIComponent('Choose a check-in decision.')}`);
  }
  const weightKg = parseFloat(req.body.weightKg);
  profile.checkIns.push({
    date: new Date(),
    weightKg: weightKg || undefined,
    decision: req.body.decision,
    note: (req.body.note || '').trim(),
  });
  if (weightKg) {
    profile.weightLog.push({ date: new Date(), weightKg, note: 'Logged at check-in' });
    profile.currentWeightKg = weightKg;
  }
  await profile.save();
  res.redirect(`/admin/clients/${profile._id}`);
});

// Looks up the client's location via OpenStreetMap and writes a rule-based
// sunlight/vitamin-D guidance paragraph straight into sunlightNotes -
// deterministic, not an LLM guess (see sunlightGuidance.js). Overwrites
// whatever was there before, since the whole point is "look this up for
// me" - the coach can still hand-edit the result afterward on the edit form.
router.post('/clients/:id/lookup-sunlight', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id);
  if (!profile) return next();
  if (!profile.location) {
    return res.redirect(`/admin/clients/${profile._id}/edit?error=${encodeURIComponent('Add a location first, then look up sunlight guidance.')}`);
  }
  try {
    profile.sunlightNotes = await generateSunlightGuidance(profile.location);
    await profile.save();
  } catch (err) {
    return res.redirect(`/admin/clients/${profile._id}/edit?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect(`/admin/clients/${profile._id}/edit?success=${encodeURIComponent('Sunlight guidance updated below.')}`);
});

// Drafts a weekly meal table via Claude, adapted to dietaryPreference and
// cuisineBackground (see mealPlanGen.js) - a starting point for the coach
// to review and correct, not verified nutrition data. Overwrites the
// existing weeklyPlanTable, same reasoning as the sunlight lookup above.
router.post('/clients/:id/generate-mealplan', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id);
  if (!profile) return next();
  try {
    const startingPoint = nutritionTargets.computeStartingPoint({
      dateOfBirth: profile.dateOfBirth,
      heightCm: profile.heightCm,
      bodyWeightKg: profile.currentWeightKg,
      activityFactor: profile.activityFactor,
      calorieAdjustment: profile.calorieAdjustment,
      proteinPerKg: profile.proteinPerKg,
      fatPerKg: profile.fatPerKg,
    });
    profile.weeklyPlanTable = await generateMealPlanDraft({
      dietaryPreference: profile.dietaryPreference,
      cuisineBackground: profile.cuisineBackground,
      trainingSchedule: profile.trainingSchedule,
      location: profile.location,
      startingPoint,
    });
    await profile.save();
  } catch (err) {
    return res.redirect(`/admin/clients/${profile._id}/edit?error=${encodeURIComponent(err.message)}`);
  }
  res.redirect(`/admin/clients/${profile._id}/edit?success=${encodeURIComponent('AI draft generated - review it in the Weekly meal table box below.')}`);
});

router.get('/clients/:id/pdf', requireAuth, async (req, res, next) => {
  const profile = await ClientProfile.findById(req.params.id).lean();
  if (!profile) return next();

  const startingPoint = nutritionTargets.computeStartingPoint({
    dateOfBirth: profile.dateOfBirth,
    heightCm: profile.heightCm,
    bodyWeightKg: profile.currentWeightKg,
    activityFactor: profile.activityFactor,
    calorieAdjustment: profile.calorieAdjustment,
    proteinPerKg: profile.proteinPerKg,
    fatPerKg: profile.fatPerKg,
  });
  const goalLock = nutritionTargets.lockStatus(profile.goalSetAt);

  const filename = `${profile.fullName.replace(/[^a-z0-9]+/gi, '-')}-nutrition-plan.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  generatePlanPdf({ profile, startingPoint, goalLock }, res);
});

router.post('/clients/:id/delete', requireAuth, async (req, res) => {
  await ClientProfile.findByIdAndDelete(req.params.id);
  res.redirect('/admin/clients');
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
  carousels.forEach((c) => { c.check = carouselStandards.summary(c); });
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
  res.render('admin/carousel-editor', { carousel, error: req.query.error || null, designInfo: carouselDesigns.describeDesigns() });
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

// Category designs: private photos/fonts, live preview HTML, and PNG export (needs a local Chrome, so it
// works on a laptop; on the server it answers with a friendly error and the CLI renderer is used instead).
router.get('/carousel-photos/:name', requireAuth, (req, res, next) => {
  const f = carouselBase.photoFileName(path.basename(req.params.name).replace(/\.[^.]+$/, ''));
  if (!f) return next();
  res.sendFile(path.join(carouselBase.PHOTO_DIR, f));
});

router.get('/carousel-fonts/:name', requireAuth, (req, res, next) => {
  const f = path.join(carouselBase.FONT_DIR, path.basename(req.params.name));
  if (!fs.existsSync(f)) return next();
  res.sendFile(f);
});

router.get('/carousel-designs.json', requireAuth, (req, res) => {
  res.json(carouselDesigns.describeDesigns());
});

router.post('/carousels/preview', requireAuth, (req, res) => {
  try {
    const { carousel, index } = req.body;
    if (!carouselDesigns.isLibraryDesign(carousel && carousel.design)) return res.status(400).send('Not a category design.');
    res.type('html').send(carouselDesigns.renderSlidePage(carousel, Number(index) || 0, 'preview'));
  } catch (err) {
    res.status(400).send('Preview error: ' + err.message);
  }
});

// Carousel standard (server/lib/carouselStandards.js): errors break a hard rule, warnings are things a
// reader will probably stumble on, flow says which slides join to the one before them.
// The older design-specific checks still run; the ones the standard now covers are dropped to avoid doubles.
function carouselChecks(carousel) {
  const std = carouselStandards.lintCarousel(carousel);
  let legacy = [];
  try { legacy = carouselDesigns.validateCarousel(carousel); } catch (e) { /* classic slides have no design validator */ }
  legacy = legacy.filter((w) => !/^More than 6 slides|^An em dash|is crowded \(/.test(w));
  return { errors: std.errors, warnings: std.warnings.concat(legacy), flow: std.flow, stats: std.stats };
}
router.post('/carousels/validate', requireAuth, (req, res) => {
  const r = carouselChecks(req.body.carousel || {});
  res.json({ errors: r.errors, warnings: r.warnings, flow: r.flow, stats: r.stats });
});

router.post('/carousels/render-png', requireAuth, async (req, res) => {
  try {
    const { carousel, index } = req.body;
    if (!carouselDesigns.isLibraryDesign(carousel && carousel.design)) return res.status(400).send('Not a category design.');
    let puppeteer;
    try { puppeteer = require('puppeteer-core'); } catch (e) { return res.status(501).send('PNG export needs puppeteer-core, which is not installed here. Use: node server/scripts/render-one-carousel.js'); }
    const chrome = ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', process.env.CHROME_PATH].filter(Boolean).find((p) => fs.existsSync(p));
    if (!chrome) return res.status(501).send('PNG export needs Chrome, which is not available on this server. Run it from your laptop: node server/scripts/render-one-carousel.js');
    const html = carouselDesigns.renderSlidePage(carousel, Number(index) || 0, 'file');
    const browser = await puppeteer.launch({ executablePath: chrome, headless: 'new', args: ['--allow-file-access-from-files'] });
    try {
      const pg = await browser.newPage();
      await pg.setViewport({ width: 540, height: 675, deviceScaleFactor: 2 });
      await pg.setContent(html, { waitUntil: 'networkidle0' });
      await pg.evaluate(() => document.fonts.ready);
      const el = await pg.$('.s');
      const png = await el.screenshot({ type: 'png' });
      res.type('png').send(png);
    } finally { await browser.close(); }
  } catch (err) {
    res.status(500).send('Could not render: ' + err.message);
  }
});

router.post('/carousels/:id/save', requireAuth, async (req, res, next) => {
  const carousel = await Carousel.findById(req.params.id);
  if (!carousel) return next();
  try {
    let slides = JSON.parse(req.body.slidesJson);
    const design = req.body.design || carousel.design || 'classic';
    if (design !== 'classic' && !carouselDesigns.isLibraryDesign(design)) throw new Error('Unknown design.');
    if (design !== (carousel.design || 'classic')) slides = carouselDesigns.convertSlides(slides, carousel.design || 'classic', design);
    carousel.design = design;
    carousel.slides = slides;
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

// --- Engagement queue (LinkedIn/Reddit/Instagram/Threads leads, curated by Claude in a live
// browsing session - see server/scripts/add-engagement-leads.js. There is no
// "refresh" here, unlike Analytics: the server has no way to drive a browser
// itself, so this list only grows when a research pass is explicitly run and
// its results inserted via that script.) ---

router.get('/engagement', requireAuth, async (req, res) => {
  const filter = {};
  if (req.query.platform) filter.platform = req.query.platform;
  if (req.query.topic) filter.topic = req.query.topic;
  if (req.query.status) filter.status = req.query.status;

  const leads = await EngagementLead.find(filter).lean();
  leads.sort((a, b) => {
    if (a.status === 'new' && b.status !== 'new') return -1;
    if (a.status !== 'new' && b.status === 'new') return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  res.render('admin/engagement', {
    leads,
    filterPlatform: req.query.platform || '',
    filterTopic: req.query.topic || '',
    filterStatus: req.query.status || '',
  });
});

router.post('/engagement/:id/answer', requireAuth, async (req, res, next) => {
  const lead = await EngagementLead.findById(req.params.id);
  if (!lead) return next();

  lead.questions.forEach((q, i) => {
    const answer = req.body[`answer_${i}`];
    if (typeof answer === 'string') q.answer = answer;
  });
  await lead.save();
  res.redirect('/admin/engagement');
});

router.post('/engagement/:id/reply', requireAuth, async (req, res, next) => {
  const lead = await EngagementLead.findById(req.params.id);
  if (!lead) return next();

  const wasEmpty = !lead.theirReply;
  lead.theirReply = req.body.theirReply || '';
  if (wasEmpty && lead.theirReply) lead.theirReplyAt = new Date();
  if (!lead.theirReply) lead.theirReplyAt = null;
  if (typeof req.body.followUpDraft === 'string') lead.followUpDraft = req.body.followUpDraft;
  await lead.save();
  res.redirect('/admin/engagement');
});

router.post('/engagement/:id/status', requireAuth, async (req, res, next) => {
  const { status } = req.body;
  if (!['new', 'commented', 'skipped'].includes(status)) return next();
  await EngagementLead.findByIdAndUpdate(req.params.id, { status });
  res.redirect('/admin/engagement');
});

router.post('/engagement/:id/delete', requireAuth, async (req, res) => {
  await EngagementLead.findByIdAndDelete(req.params.id);
  res.redirect('/admin/engagement');
});

// --- Publish queue (pre-publish content, ready to copy per platform - see
// server/models/PublishQueueItem.js for how this differs from SocialPost,
// which tracks posts after they go live). Status lives per-platform, not
// per-item, since the whole point is catching a single missed platform out
// of 6+ - so filtering by platform + status is how the list answers "what's
// still not posted on X" directly, mirroring the /admin/engagement filter
// pattern above. ---

router.get('/queue', requireAuth, async (req, res) => {
  const items = await PublishQueueItem.find().sort({ scheduledDate: 1 }).lean();
  const platformNames = [...new Set(items.flatMap((i) => i.platforms.map((p) => p.name)))].sort();

  const filterPlatform = req.query.platform || '';
  const filterStatus = req.query.status || '';

  let rows = null;
  if (filterPlatform || filterStatus) {
    rows = [];
    items.forEach((item) => {
      item.platforms.forEach((p) => {
        if (filterPlatform && p.name !== filterPlatform) return;
        if (filterStatus && p.status !== filterStatus) return;
        rows.push({ item, platform: p });
      });
    });
  }

  res.render('admin/queue-list', { items, rows, platformNames, filterPlatform, filterStatus });
});

router.get('/queue/new', requireAuth, (req, res) => {
  res.render('admin/queue-item', { item: null, error: null });
});

router.post('/queue/new', requireAuth, async (req, res) => {
  try {
    await createOrUpdateQueueItem(req.body, null);
    res.redirect('/admin/queue');
  } catch (err) {
    res.status(400).render('admin/queue-item', { item: req.body, error: err.message });
  }
});

router.get('/queue/:id', requireAuth, async (req, res, next) => {
  const item = await PublishQueueItem.findById(req.params.id).lean();
  if (!item) return next();
  res.render('admin/queue-item', { item, error: req.query.error || null });
});

router.post('/queue/:id/edit', requireAuth, async (req, res, next) => {
  const existing = await PublishQueueItem.findById(req.params.id);
  if (!existing) return next();
  try {
    await createOrUpdateQueueItem(req.body, existing);
    res.redirect('/admin/queue');
  } catch (err) {
    res.status(400).render('admin/queue-item', { item: { ...req.body, _id: existing._id }, error: err.message });
  }
});

async function createOrUpdateQueueItem(body, existing) {
  if (!body.title || !body.title.trim()) throw new Error('Title is required.');
  if (!body.scheduledDate) throw new Error('Scheduled date is required.');

  let platforms = [];
  try {
    platforms = JSON.parse(body.platformsJson || '[]');
  } catch (err) {
    throw new Error('Could not read platform content.');
  }
  platforms = platforms
    .filter((p) => p.name && p.name.trim() && p.content && p.content.trim())
    .map((p) => ({
      name: p.name.trim(),
      content: p.content,
      postUrl: (p.postUrl || '').trim(),
      status: p.status === 'posted' ? 'posted' : 'queued',
    }));
  if (!platforms.length) throw new Error('Add at least one platform with content.');

  const data = {
    title: body.title.trim(),
    scheduledDate: new Date(body.scheduledDate),
    notes: (body.notes || '').trim(),
    platforms,
  };

  if (existing) {
    Object.assign(existing, data);
    await existing.save();
  } else {
    await PublishQueueItem.create(data);
  }
}

// Quick one-click toggle for a single platform's status, used from the
// filtered list view so marking something posted doesn't require opening
// the full item editor.
router.post('/queue/:id/platform/:platformId/status', requireAuth, async (req, res, next) => {
  const item = await PublishQueueItem.findById(req.params.id);
  if (!item) return next();
  const platform = item.platforms.id(req.params.platformId);
  if (!platform) return next();
  platform.status = req.body.status === 'posted' ? 'posted' : 'queued';
  await item.save();
  res.redirect(req.get('Referrer') || '/admin/queue');
});

router.post('/queue/:id/delete', requireAuth, async (req, res) => {
  await PublishQueueItem.findByIdAndDelete(req.params.id);
  res.redirect('/admin/queue');
});

// --- LLM Brand Tracker ---
// Shows, per prompt, the most recent check from each provider and a simple
// mentioned/not-mentioned history so a trend is visible without a chart
// library. Populated by `npm run check-llm-brand` (server/scripts/
// run-llm-brand-check.js) - there's no "run now" button here on purpose,
// same reasoning as the engagement queue: nothing server-side can drive a
// browser or hold live API keys for a scheduled job on this host, so this
// stays a manually- or externally-triggered check, not a live dashboard.
router.get('/llm-brand', requireAuth, async (req, res) => {
  const mentions = await LlmMention.find().sort({ checkedAt: -1 }).limit(500).lean();

  const byPrompt = LLM_TRACKER_PROMPTS.map(({ key, pillar, prompt }) => {
    const rows = mentions.filter((m) => m.promptKey === key);
    const latestByProvider = {};
    for (const row of rows) {
      if (!latestByProvider[row.provider] || row.checkedAt > latestByProvider[row.provider].checkedAt) {
        latestByProvider[row.provider] = row;
      }
    }
    return {
      key,
      pillar,
      prompt,
      providers: ['perplexity', 'openai', 'gemini'].map((name) => latestByProvider[name] || null),
      history: rows.slice(0, 12), // most recent checks across all providers, for the trend column
    };
  });

  const lastCheckedAt = mentions.length ? mentions[0].checkedAt : null;
  const totalChecks = mentions.length;
  const mentionedCount = mentions.filter((m) => m.mentioned).length;

  // All-time spend by provider, not capped at the 500-row `mentions` limit
  // above (that limit is just for the per-prompt view; spend should reflect
  // every check ever run). None of the three providers expose a "remaining
  // balance" via any documented API (checked 2026-09-10 - see
  // services/llmTracker/*.js), so this only tracks money already spent, not
  // what's left; billingUrl links to where that actually gets checked.
  const spendAgg = await LlmMention.aggregate([
    { $match: { costUsd: { $ne: null } } },
    { $group: { _id: '$provider', total: { $sum: '$costUsd' }, isEstimate: { $max: { $cond: ['$costIsEstimate', 1, 0] } }, calls: { $sum: 1 } } },
  ]);
  const PROVIDER_BILLING = {
    perplexity: 'https://www.perplexity.ai/account/api/billing',
    openai: 'https://platform.openai.com/settings/organization/billing/overview',
    gemini: 'https://aistudio.google.com/usage',
  };
  const spendByProvider = ['perplexity', 'openai', 'gemini'].map((name) => {
    const agg = spendAgg.find((a) => a._id === name);
    return {
      name,
      total: agg ? agg.total : 0,
      isEstimate: agg ? Boolean(agg.isEstimate) : false,
      calls: agg ? agg.calls : 0,
      billingUrl: PROVIDER_BILLING[name],
    };
  });
  const totalSpend = spendByProvider.reduce((sum, p) => sum + p.total, 0);

  res.render('admin/llm-brand', {
    active: 'llm-brand',
    byPrompt,
    lastCheckedAt,
    totalChecks,
    mentionedCount,
    hasAnyData: mentions.length > 0,
    spendByProvider,
    totalSpend,
  });
});

module.exports = router;
