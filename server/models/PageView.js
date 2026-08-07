const mongoose = require('mongoose');

// One doc per (path, day) - incremented per visit, not one row per hit, so
// the collection stays small no matter how much traffic a page gets.
const PageViewSchema = new mongoose.Schema(
  {
    path: { type: String, required: true, trim: true },
    date: { type: String, required: true }, // YYYY-MM-DD (UTC)
    count: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PageViewSchema.index({ path: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('PageView', PageViewSchema);
