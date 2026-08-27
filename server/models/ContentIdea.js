const mongoose = require('mongoose');

const ContentIdeaSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, trim: true },
    rationale: { type: String, required: true }, // why this topic, in plain language
    // 'blog-post' ideas flow into the weekly content-ideas-refresh pipeline
    // (topic -> linkedPost). 'social-content' ideas are Reels/carousels/etc
    // that never become a BlogPost - their actual script lives on a
    // PublishQueueItem (and a Carousel doc, if it's a carousel). Kept on
    // this same model rather than a separate one so a single dashboard can
    // still show "everything we might make content about", just clearly
    // labeled by which pipeline it belongs to.
    format: { type: String, enum: ['blog-post', 'social-content'], default: 'blog-post' },
    targetService: {
      type: String,
      enum: ['corporate-wellness', 'general-coaching', 'postpartum', 'neurodivergent', 'other'],
      default: 'other',
    },
    sourceLinks: [{ type: String }], // real URLs backing this idea - never fabricated
    status: { type: String, enum: ['idea', 'drafting', 'published'], default: 'idea', index: true },
    linkedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContentIdea', ContentIdeaSchema);
