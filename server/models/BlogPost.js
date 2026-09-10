const mongoose = require('mongoose');
const { submitUrls } = require('../services/indexNow');
const { urlInspectionConfigured, inspectUrl } = require('../services/urlInspection');

const BlogPostSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true },
    // 'en' is the default and the only locale for every post before
    // 2026-09-10. A translation is its own document (own slug, own
    // analytics) rather than a field on the English post - translationOf
    // links it back to the canonical English post so hreflang and "also
    // available in" links can find each other. Query BlogPost.find({
    // translationOf: englishPost._id }) to get all translations of a post.
    locale: { type: String, enum: ['en', 'es', 'fr'], default: 'en', required: true, index: true },
    translationOf: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', default: null },
    title: { type: String, required: true },
    meta: { type: String, required: true }, // meta description / card blurb
    keyword: { type: String, default: '' }, // SEO focus keyword
    category: { type: String, required: true, index: true }, // e.g. "philosophy"
    categoryLabel: { type: String, required: true }, // e.g. "Philosophy"
    bodyHtml: { type: String, required: true },
    heroImage: { type: String, default: '' },
    readMins: { type: Number, default: 2 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    publishedAt: { type: Date },
    analytics: {
      // GA4 - traffic and engagement
      pageviews: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
      // Search Console - actual search performance ("SEO viewpoint")
      searchClicks: { type: Number, default: 0 },
      searchImpressions: { type: Number, default: 0 },
      searchCtr: { type: Number, default: 0 }, // 0-1
      searchAvgPosition: { type: Number, default: 0 },
      updatedAt: { type: Date },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

BlogPostSchema.index({ status: 1, publishedAt: -1 });

// Enforces the site's SEO standard (see hkm-blog-seo-aeo-geo-standard memory:
// title 45-70 raw chars, meta 120-150 chars) whenever title/meta are actually
// being set or changed - e.g. on BlogPost.create() or an admin edit. Does NOT
// run on saves that leave title/meta untouched (isModified() is false), which
// matters because the analytics-refresh job in admin.js calls post.save() on
// every published post just to update pageviews/searchClicks - a hard
// schema-level minlength/maxlength would have re-validated the whole document
// on every one of those saves and broken the refresh for the ~37 existing
// posts (out of 77) that predate this rule and fall outside the range.
BlogPostSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    const len = (this.title || '').length;
    if (len < 45 || len > 70) {
      return next(new Error(`title is ${len} characters - outside the site's 45-70 char SEO standard (hkm-blog-seo-aeo-geo-standard)`));
    }
  }
  if (this.isModified('meta')) {
    const len = (this.meta || '').length;
    if (len < 120 || len > 150) {
      return next(new Error(`meta is ${len} characters - outside the site's 120-150 char SEO standard (hkm-blog-seo-aeo-geo-standard)`));
    }
  }
  // Stashed here (rather than recomputed in post('save')) because isModified()
  // reflects paths changed in *this* save call - by the time post('save')
  // fires the document is already persisted, but $locals survives the
  // round-trip since it's a plain in-memory property, not a schema path.
  this.$locals.justPublished = this.isModified('status') && this.status === 'published';
  next();
});

// Fire-and-forget on the moment a post actually goes live (new post created
// already published, or an existing draft flipped to published) - never on
// an unrelated save (e.g. the analytics-refresh job touching pageviews).
// Real, working effect: IndexNow tells Bing/Yandex to crawl it now (see
// services/indexNow.js for why Google's equivalent isn't used). The
// urlInspection call is read-only visibility, not a request to index -
// logged so a slow/never-indexed post is at least noticeable, not silent.
BlogPostSchema.post('save', function (doc) {
  if (!doc.$locals.justPublished) return;

  const url = doc.locale === 'en' ? `/blog/${doc.slug}` : `/${doc.locale}/blog/${doc.slug}`;
  submitUrls([url])
    .then((result) => console.log(`[indexNow] submitted ${url}:`, result.ok ? 'ok' : result))
    .catch((err) => console.log(`[indexNow] submit failed for ${url}:`, err.message));

  if (urlInspectionConfigured()) {
    inspectUrl(`https://humankindmovement.in${url}`)
      .then((status) => console.log(`[urlInspection] ${url}:`, status && status.coverageState))
      .catch((err) => console.log(`[urlInspection] ${url} check failed:`, err.message));
  }
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
