const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema(
  {
    question: { type: String, required: true },
    answer: { type: String, default: '' },
  },
  { _id: false }
);

const EngagementLeadSchema = new mongoose.Schema(
  {
    platform: { type: String, enum: ['linkedin', 'reddit', 'instagram', 'threads'], required: true, index: true },
    topic: {
      type: String,
      enum: ['aches-pains-rehab', 'postpartum', 'neurodivergent', 'movement-biomechanics', 'corporate-wellness'],
      required: true,
    },
    postUrl: { type: String, required: true },
    authorName: { type: String, default: '' },
    authorHeadline: { type: String, default: '' },
    postSnippet: { type: String, required: true },
    postedAt: { type: String, default: '' },
    relevanceReason: { type: String, required: true },
    draftComment: { type: String, required: true },
    questions: [QuestionSchema],
    theirReply: { type: String, default: '' },
    theirReplyAt: { type: Date, default: null },
    followUpDraft: { type: String, default: '' },
    status: { type: String, enum: ['new', 'commented', 'skipped'], default: 'new', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EngagementLead', EngagementLeadSchema);
