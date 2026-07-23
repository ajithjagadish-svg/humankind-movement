const mongoose = require('mongoose');

const SlideSchema = new mongoose.Schema(
  {
    eyebrow: { type: String, default: '' },
    headline: { type: String, required: true },
    sub: { type: String, default: '' },
    bullets: [{ type: String }],
    variant: { type: String, enum: ['default', 'dark', 'cta'], default: 'default' },
    ctaBtn: { type: String, default: '' },
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
