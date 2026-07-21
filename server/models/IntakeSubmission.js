const mongoose = require('mongoose');

// Mirrors the real "Humankind Movement - Client Information" Google Form
// this replaces, field for field (pulled from the live form itself, not
// guessed) - plus one addition not in the original form: a bulk-session
// option for postpartum clients under Session Preference.
const IntakeSubmissionSchema = new mongoose.Schema(
  {
    // Basic Details
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true },
    mobileNumber: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true },
    height: { type: String, required: true },
    bodyWeight: { type: String, required: true },

    // Safety and Emergency Information
    emergencyContact: { type: String, required: true },
    pregnancyOrPostpartumContext: { type: String, default: '' },
    healthHistory: { type: String, required: true },
    currentPainOrDiscomfort: { type: String, required: true },

    // Daily Rhythm and Lifestyle
    sleepHours: { type: String, required: true },
    typicalDay: { type: String, required: true },

    // Movement and Activity
    activityLevel: { type: String, required: true },
    movementPractices: { type: String, default: '' },
    fitnessEquipment: { type: String, required: true },

    // Food and Lifestyle Preferences
    dietaryPreference: { type: String, required: true },
    dietaryPreferenceOther: { type: String, default: '' },
    lifestyleHabits: { type: [String], default: [] },
    lifestyleHabitsOther: { type: String, default: '' },

    // Session Preference
    sessionPreference: { type: String, required: true },

    // Anything Else
    anythingElse: { type: String, default: '' },

    // Session Commitment and Rescheduling
    agreesToReschedulingPolicy: { type: Boolean, required: true },

    status: { type: String, enum: ['new', 'reviewed'], default: 'new', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IntakeSubmission', IntakeSubmissionSchema);
