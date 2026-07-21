const mongoose = require('mongoose');

const ContentIdeaSchema = new mongoose.Schema(
  {
    topic: { type: String, required: true, trim: true },
    rationale: { type: String, required: true }, // why this topic, in plain language
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
