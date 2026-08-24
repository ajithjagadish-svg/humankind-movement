const mongoose = require('mongoose');

// Distinct from SocialPost (server/models/SocialPost.js), which tracks
// already-published posts for the Analytics page (requires a postUrl and
// publishedAt). This model is the pre-publish side: content ready to copy
// out to each platform (or into a scheduler like Zoho Social) before it
// exists anywhere public.
const PlatformContentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    content: { type: String, required: true },
  },
  { _id: false }
);

const PublishQueueItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    scheduledDate: { type: Date, required: true, index: true },
    sourceType: { type: String, enum: ['blogPost', 'contentIdea', 'carousel', 'standalone'], default: 'standalone' },
    sourceId: { type: mongoose.Schema.Types.ObjectId },
    notes: { type: String, default: '' },
    platforms: [PlatformContentSchema],
    status: { type: String, enum: ['queued', 'posted'], default: 'queued', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublishQueueItem', PublishQueueItemSchema);
