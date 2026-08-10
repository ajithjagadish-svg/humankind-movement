const mongoose = require('mongoose');

const ContactSubmissionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    topic: { type: String, required: true },
    location: { type: String, default: '' },
    message: { type: String, required: true },
    locale: { type: String, enum: ['en', 'es', 'fr'], default: 'en' },
    status: { type: String, enum: ['new', 'read', 'archived'], default: 'new', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ContactSubmission', ContactSubmissionSchema);
