const mongoose = require('mongoose');

const EbookLeadSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    email: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    resource: { type: String, required: true, default: 'postpartum-recovery-guide' },
    status: { type: String, enum: ['new', 'contacted'], default: 'new', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('EbookLead', EbookLeadSchema);
