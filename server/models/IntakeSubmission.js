const mongoose = require('mongoose');

// Mirrors the 9 sections of the external Google Form it replaces: general
// details, emergency contact, health history, current pain, activity
// background, sleep, nutrition, lifestyle/stress, goals. Free text almost
// everywhere on purpose - this is read by a human planning a coaching
// relationship, not machine-processed.
const IntakeSubmissionSchema = new mongoose.Schema(
  {
    // General details
    fullName: { type: String, required: true, trim: true },
    age: { type: String, default: '' },
    genderIdentity: { type: String, default: '' },
    occupation: { type: String, default: '' },
    location: { type: String, default: '' },
    email: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },

    // Emergency contact
    emergencyContactName: { type: String, default: '' },
    emergencyContactRelationship: { type: String, default: '' },
    emergencyContactPhone: { type: String, default: '' },

    // Health history
    medicalConditions: { type: String, default: '' },
    surgeriesOrInjuries: { type: String, default: '' },
    medications: { type: String, default: '' },
    allergies: { type: String, default: '' },

    // Current pain / limitations
    currentPainOrDiscomfort: { type: String, default: '' },
    painAreas: { type: String, default: '' },

    // Activity background
    exerciseHistory: { type: String, default: '' },
    currentActivityLevel: { type: String, default: '' },
    priorInjuriesAffectingMovement: { type: String, default: '' },

    // Sleep
    averageSleepHours: { type: String, default: '' },
    sleepQuality: { type: String, default: '' },
    sleepIssues: { type: String, default: '' },

    // Nutrition
    dietType: { type: String, default: '' },
    eatingPatterns: { type: String, default: '' },
    nutritionConcerns: { type: String, default: '' },

    // Lifestyle and stress
    occupationStressLevel: { type: String, default: '' },
    dailyScreenTime: { type: String, default: '' },
    lifestyleNotes: { type: String, default: '' },

    // Goals
    primaryGoals: { type: String, required: true },
    timeline: { type: String, default: '' },
    additionalNotes: { type: String, default: '' },

    status: { type: String, enum: ['new', 'reviewed'], default: 'new', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IntakeSubmission', IntakeSubmissionSchema);
