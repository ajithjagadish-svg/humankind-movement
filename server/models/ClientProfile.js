const mongoose = require('mongoose');

// The living counterpart to IntakeSubmission (server/models/IntakeSubmission.js),
// which is a frozen one-time snapshot. This is the ongoing record: current
// weight, goal/activity level (each locked for 12 weeks once set - see
// nutritionTargets.js LOCK_WEEKS and the reassessment-window research in
// CHAT_TRANSCRIPT.md on the desktop "Nutrition Chart" project), and the
// "Starting Point" targets computed from it. Coach-mediated by design: the
// client reports weight/adherence over WhatsApp or in person, the coach
// logs it here - there is no client-facing login yet (see CHAT_TRANSCRIPT.md
// for why that's on hold).
//
// checkIns is the hand-out-a-plan / follow-it / report-back loop: coach
// gives the client a plan (planVersion is just a short label/note, the
// weeklyPlanNotes/sunlightNotes fields below hold the actual content that
// goes into the generated PDF), the client follows it for a stretch (weeks,
// not fixed), then a check-in records what happened and whether to
// continue as-is, adjust the plan while keeping the same targets, or - only
// once the 12-week lock has elapsed - reassess the goal/activity itself.
const CheckInSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    weightKg: { type: Number },
    decision: { type: String, enum: ['continue', 'adjust-plan', 'reassess-goal'], required: true },
    note: { type: String, default: '' },
  },
  { _id: true }
);

const WeightLogEntrySchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    weightKg: { type: Number, required: true },
    note: { type: String, default: '' },
  },
  { _id: true }
);

const ClientProfileSchema = new mongoose.Schema(
  {
    intakeSubmissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'IntakeSubmission' },

    fullName: { type: String, required: true, trim: true },
    email: { type: String, default: '' },
    dateOfBirth: { type: String, required: true },
    heightCm: { type: Number, required: true },
    location: { type: String, default: '' },
    dietaryPreference: { type: String, default: '' },

    currentWeightKg: { type: Number, required: true },
    weightLog: { type: [WeightLogEntrySchema], default: [] },

    goal: { type: String, required: true },
    goalSetAt: { type: Date, default: Date.now },
    activityLevel: { type: String, required: true },
    activityFactor: { type: Number, required: true },
    activityLevelSetAt: { type: Date, default: Date.now },
    calorieAdjustment: { type: Number, default: 0 },
    proteinPerKg: { type: Number, required: true },
    fatPerKg: { type: Number, default: 0.9 },

    currentPlanVersion: { type: String, default: '' },
    currentPlanIssuedAt: { type: Date },
    weeklyPlanNotes: { type: String, default: '' },
    sunlightNotes: { type: String, default: '' },
    checkIns: { type: [CheckInSchema], default: [] },

    status: { type: String, enum: ['active', 'paused', 'completed'], default: 'active', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ClientProfile', ClientProfileSchema);
