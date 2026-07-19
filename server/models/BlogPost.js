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
      pageviews: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 },
    },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

BlogPostSchema.index({ status: 1, publishedAt: -1 });

module.exports = mongoose.model('BlogPost', BlogPostSchema);
