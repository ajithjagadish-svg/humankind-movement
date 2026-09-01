const mongoose = require('mongoose');

const SubscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, trim: true, lowercase: true, unique: true, index: true },
    categories: { type: [String], default: [] }, // category keys from config/categories.js
    status: { type: String, enum: ['pending', 'confirmed', 'unsubscribed'], default: 'pending', index: true },
    confirmToken: { type: String, required: true },
    unsubscribeToken: { type: String, required: true },
    confirmedAt: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscriber', SubscriberSchema);
