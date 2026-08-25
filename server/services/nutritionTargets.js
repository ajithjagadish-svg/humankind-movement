// The "Starting Point" calculation - see server/models/ClientProfile.js for
// the model this feeds, and the "Nutrition Chart" project on the desktop
// (CHAT_TRANSCRIPT.md) for the original research this is built from.
// Pure functions only, no I/O - same math as the Targets Calculator tab in
// the workbook, moved into reusable code instead of locked in a spreadsheet.

function computeAge(dateOfBirth) {
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

// Accepts "5'9\"", "5 ft 9 in", "175", "175cm" - anything more exotic falls
// through to null and the coach enters cm directly on the profile form.
function parseHeightToCm(input) {
  if (input === null || input === undefined) return null;
  const str = String(input).trim();

  const feetInches = str.match(/(\d+)\s*(?:'|ft)\s*(\d+)?\s*(?:"|in)?/i);
  if (feetInches) {
    const feet = parseInt(feetInches[1], 10);
    const inches = feetInches[2] ? parseInt(feetInches[2], 10) : 0;
    return Math.round((feet * 12 + inches) * 2.54 * 10) / 10;
  }

  const cm = str.match(/([\d.]+)\s*cm?/i);
  if (cm) return parseFloat(cm[1]);

  const plain = parseFloat(str);
  if (!isNaN(plain)) return plain;

  return null;
}

function parseWeightToKg(input) {
  if (input === null || input === undefined) return null;
  const num = parseFloat(String(input).replace(/[^\d.]/g, ''));
  return isNaN(num) ? null : num;
}

// Defaults only - a starting suggestion the coach reviews and can override,
// never applied silently without being visible on the profile form.
const ACTIVITY_FACTOR_DEFAULTS = {
  'Not currently active': 1.2,
  'Light daily movement': 1.375,
  'Some weekly activity': 1.375,
  'Regular exercise, sport, or movement practice': 1.55,
  'Highly active or training consistently': 1.725,
};

const CALORIE_ADJUSTMENT_DEFAULTS = {
  'Weight loss': -300,
  'Weight maintenance': 0,
  'Weight or muscle gain': 300,
  'General health, not focused on weight': 0,
  Other: 0,
};

// The two vegetarians in the original project sit at the top of the protein
// range because plant protein has lower digestibility and lower leucine
// density (ISSN 2017) - default reflects that, coach can still override.
function defaultProteinPerKg(dietaryPreference) {
  if (dietaryPreference === 'Vegetarian' || dietaryPreference === 'Vegetarian, eat eggs' || dietaryPreference === 'Vegan') {
    return 2.0;
  }
  return 1.8;
}

function computeStartingPoint({ dateOfBirth, heightCm, bodyWeightKg, activityFactor, calorieAdjustment, proteinPerKg, fatPerKg }) {
  const age = computeAge(dateOfBirth);
  const bmr = 10 * bodyWeightKg + 6.25 * heightCm - 5 * age + 5;
  const tdee = bmr * activityFactor;
  const calorieTarget = tdee + calorieAdjustment;
  const proteinTarget = bodyWeightKg * proteinPerKg;
  const proteinPerMeal = bodyWeightKg * 0.4;
  const fatTarget = bodyWeightKg * fatPerKg;
  const fiberTarget = Math.max(38, (14 * calorieTarget) / 1000);
  const carbTarget = (calorieTarget - proteinTarget * 4 - fatTarget * 9) / 4;

  return {
    age,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    calorieTarget: Math.round(calorieTarget),
    proteinTarget: Math.round(proteinTarget),
    proteinPerMeal: Math.round(proteinPerMeal),
    fatTarget: Math.round(fatTarget),
    fiberTarget: Math.round(fiberTarget),
    carbTarget: Math.round(carbTarget),
  };
}

const LOCK_WEEKS = 12;

function lockStatus(setAt) {
  if (!setAt) return { locked: false, daysRemaining: 0, unlocksAt: null };
  const unlocksAt = new Date(setAt);
  unlocksAt.setDate(unlocksAt.getDate() + LOCK_WEEKS * 7);
  const now = new Date();
  const daysRemaining = Math.ceil((unlocksAt - now) / (1000 * 60 * 60 * 24));
  return { locked: daysRemaining > 0, daysRemaining: Math.max(0, daysRemaining), unlocksAt };
}

module.exports = {
  computeAge,
  parseHeightToCm,
  parseWeightToKg,
  ACTIVITY_FACTOR_DEFAULTS,
  CALORIE_ADJUSTMENT_DEFAULTS,
  defaultProteinPerKg,
  computeStartingPoint,
  lockStatus,
  LOCK_WEEKS,
};
