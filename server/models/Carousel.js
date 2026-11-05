const mongoose = require('mongoose');

const ChatBubbleSchema = new mongoose.Schema(
  {
    from: { type: String, enum: ['client', 'coach', 'divider'], required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const SlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: '' },
    headline: { type: String, default: '' },
    sub: { type: String, default: '' },
    bullets: [{ type: String }],
    chatBubbles: [ChatBubbleSchema],
    variant: { type: String, enum: ['default', 'dark', 'cta'], default: 'default' },
    ctaBtn: { type: String, default: '' },
    // Small print shown at the bottom of the slide, above the footer (e.g. a
    // disclaimer or source line on a closing slide). Optional.
    note: { type: String, default: '' },
    bgStyle: { type: String, enum: ['none', 'orb', 'lines'], default: 'none' },
    // Site-relative path (e.g. "/assets/img/vijay-portrait.jpg"). When set,
    // renders as a circular portrait above the headline - used for team-intro
    // slides. Overrides bullets/chatBubbles layout, not eyebrow/headline/sub.
    photo: { type: String, default: '' },
    // Category designs (server/lib/carouselDesigns): which layout this slide uses and its fields.
    // Unused by the classic design.
    layout: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

const CarouselSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sourceType: { type: String, enum: ['blogPost', 'contentIdea'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    // 'classic' = the original template; anything else is a category design in server/lib/carouselDesigns.
    design: { type: String, default: 'classic' },
    slides: [SlideSchema],
    status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carousel', CarouselSchema);
