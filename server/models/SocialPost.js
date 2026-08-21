const mongoose = require('mongoose');

const SocialPostSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['instagram', 'linkedin'], required: true, index: true },
    account: { type: String, required: true },
    postUrl: { type: String, required: true },
    publishedAt: { type: Date, required: true, index: true },
    caption: { type: String, required: true },
    hasSiteLink: { type: Boolean, default: false },
    metrics: {
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      impressions: { type: Number, default: null },
      clicks: { type: Number, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SocialPost', SocialPostSchema);
