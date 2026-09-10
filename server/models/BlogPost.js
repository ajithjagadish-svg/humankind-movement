const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, trim: true },
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
  next();
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
