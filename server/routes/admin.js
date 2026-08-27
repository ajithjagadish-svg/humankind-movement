const express = require('express');
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
const CATEGORIES = require('../config/categories');
const requireAuth = require('../middleware/requireAuth');
const { ga4Configured, fetchGA4Stats, fetchGA4ConversionSummary, fetchGA4TimeSeries } = require('../services/ga4');
const { searchConsoleConfigured, fetchSearchConsoleStats } = require('../services/searchConsole');
const { anthropicConfigured, generateCarouselSlides } = require('../services/carouselGen');
const { getPageViewSummary } = require('../services/pageViews');
const nutritionTargets = require('../services/nutritionTargets');
const { generatePlanPdf } = require('../services/planPdf');
const { generateSunlightGuidance } = require('../services/sunlightGuidance');
const { generateMealPlanDraft } = require('../services/mealPlanGen');
const { checkDietaryCompliance } = require('../services/dietaryCompliance');

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
    await createOrUpdatePost(req.body, null, req.body.contentIdeaId || null);
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

  // Deleting a draft is how a drafted idea gets rejected. Reset the idea
  // rather than leaving it pointed at a post that no longer exists, so the
  // topic/rationale/sources stay available to redraft later.
  await ContentIdea.findOneAndUpdate(
    { linkedPost: req.params.id },
    { status: 'idea', $unset: { linkedPost: '' } }
  );

  res.redirect('/admin/posts');
});

async function createOrUpdatePost(body, existing, contentIdeaId) {
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

router.get('/analytics', requireAuth, async (req, res) => {
  const configured = { ga4: ga4Configured(), searchConsole: searchConsoleConfigured() };
  const posts = await BlogPost.find({ status: 'published' }).sort({ 'analytics.searchImpressions': -1 }).lean();
  const guideStats = await getGuideStats();
  const { conversions, conversionError } = await getConversionSummary(configured);
  const timeSeries = await getTimeSeries(configured);
  const socialPosts = await SocialPost.find().sort({ publishedAt: -1 }).lean();
  const socialPostsWithContext = getSocialPostsWithContext(socialPosts, timeSeries);
  const accountSummary = getAccountSummary(socialPosts);
  res.render('admin/analytics', { posts, configured, guideStats, conversions, conversionError, timeSeries, socialPostsWithContext, accountSummary, refreshError: null, refreshedAt: null });
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
  res.render('admin/analytics', { posts, configured, guideStats, conversions, conversionError, timeSeries, socialPostsWithContext, accountSummary, refreshError, refreshedAt: new Date() });
});

// --- Submissions (contact + intake forms) ---

router.get('/submissions', requireAuth, async (req, res) => {
  const [contacts, intakes, ebookLeads] = await Promise.all([
    ContactSubmission.find().sort({ createdAt: -1 }).lean(),
    IntakeSubmission.find().sort({ createdAt: -1 }).lean(),
    EbookLead.find().sort({ createdAt: -1 }).lean(),
  ]);
  res.render('admin/submissions', { contacts, intakes, ebookLeads });
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

module.exports = router;
