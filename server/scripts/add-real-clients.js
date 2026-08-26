// One-time seed: creates Client Profiles for the three real clients from
// the "Nutrition Chart" project (desktop, CHAT_TRANSCRIPT.md) - Harish,
// Pratap, Karthik. Real: name, DOB, height, weight, location, dietary
// preference, cuisine background, and Harish's training days (all pulled
// directly from that project's real intake data and workbook). NOT real:
// goal and activityLevel - no confirmed value exists for any of the three,
// so these are set to neutral placeholders (goal: general health,
// activityLevel: some weekly activity) that the coach must correct on each
// profile before relying on the calculated Starting Point.
require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const ClientProfile = require('../models/ClientProfile');
const nutritionTargets = require('../services/nutritionTargets');

const PLACEHOLDER_GOAL = 'General health, not focused on weight';
const PLACEHOLDER_ACTIVITY = 'Some weekly activity';

const CLIENTS = [
  {
    fullName: 'Harish',
    dateOfBirth: '1984-11-12',
    heightCm: 175.3,
    currentWeightKg: 78,
    location: 'Toronto, Canada',
    dietaryPreference: 'Eat meat',
    cuisineBackground: 'South Indian (Tamil / Kannadiga)',
    trainingSchedule: 'Mon, Wed, Fri (exact time not yet confirmed)',
  },
  {
    fullName: 'Pratap',
    dateOfBirth: '1980-10-25',
    heightCm: 182.9,
    currentWeightKg: 77,
    location: 'Detroit, Michigan',
    dietaryPreference: 'Vegetarian',
    cuisineBackground: 'South Indian (Tamil / Kannadiga)',
    trainingSchedule: '',
  },
  {
    fullName: 'Karthik',
    dateOfBirth: '1983-01-30',
    heightCm: 167.6,
    currentWeightKg: 68,
    location: 'California, USA (exact city not yet confirmed - needed for precise sunlight guidance)',
    dietaryPreference: 'Vegetarian',
    cuisineBackground: 'South Indian (Tamil / Kannadiga)',
    trainingSchedule: '',
  },
];

async function main() {
  await connectDB();

  for (const c of CLIENTS) {
    const existing = await ClientProfile.findOne({ fullName: c.fullName });
    if (existing) {
      console.log(`Skipped ${c.fullName} - a profile with this name already exists (${existing._id}).`);
      continue;
    }

    const activityFactor = nutritionTargets.ACTIVITY_FACTOR_DEFAULTS[PLACEHOLDER_ACTIVITY];
    const calorieAdjustment = nutritionTargets.CALORIE_ADJUSTMENT_DEFAULTS[PLACEHOLDER_GOAL];
    const proteinPerKg = nutritionTargets.defaultProteinPerKg(c.dietaryPreference);

    const profile = await ClientProfile.create({
      ...c,
      goal: PLACEHOLDER_GOAL,
      activityLevel: PLACEHOLDER_ACTIVITY,
      activityFactor,
      calorieAdjustment,
      proteinPerKg,
      fatPerKg: 0.9,
      weightLog: [{ date: new Date(), weightKg: c.currentWeightKg, note: 'Starting weight' }],
    });
    console.log(`Created ${c.fullName} - ${profile._id}`);
  }

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
