const mongoose = require('mongoose');

// Distinct from SocialPost (server/models/SocialPost.js), which tracks
// already-published posts for the Analytics page (requires a postUrl and
// publishedAt). This model is the pre-publish side: content ready to copy
// out to each platform (or into a scheduler like Zoho Social) before it
// exists anywhere public.
//
// status lives on each platform, not on the item as a whole - a single
// post going out to 6+ platforms is exactly the case where one platform
// gets missed, so "posted" has to be trackable per platform for the queue
// to actually catch that. postUrl is optional and just for your own
// reference (e.g. paste the live link once posted) - there is no automated
// check that a URL is really live, that adds real complexity (handling
// platforms that block automated requests, WhatsApp Status having no
// persistent link at all) for a check that would be unreliable anyway.
const PlatformContentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  postUrl: { type: String, default: '' },
  status: { type: String, enum: ['queued', 'posted'], default: 'queued' },
});

const PublishQueueItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    scheduledDate: { type: Date, required: true, index: true },
    sourceType: { type: String, enum: ['blogPost', 'contentIdea', 'carousel', 'standalone'], default: 'standalone' },
    sourceId: { type: mongoose.Schema.Types.ObjectId },
    notes: { type: String, default: '' },
    platforms: [PlatformContentSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('PublishQueueItem', PublishQueueItemSchema);
