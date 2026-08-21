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
    bgStyle: { type: String, enum: ['none', 'orb', 'lines'], default: 'none' },
  },
  { _id: false }
);

const CarouselSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    sourceType: { type: String, enum: ['blogPost', 'contentIdea'], required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    slides: [SlideSchema],
    status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Carousel', CarouselSchema);
