// Automated check that a client's weeklyPlanTable actually matches their
// stated dietaryPreference - runs on every save (see admin.js) so a mismatch
// surfaces immediately instead of depending on a human catching it by eye.
// Catches two distinct mistakes: (1) a real violation - meat/fish/egg/dairy
// showing up in a plan for someone who can't eat it, and (2) a redundant
// qualifier - "vegetarian" or "no fish sauce" tacked onto a dish for someone
// with no such restriction (the exact mistake this file exists to prevent).
const { parseMealPlanTable } = require('./mealPlanTable');

const MEAT_TERMS = ['chicken', 'mutton', 'lamb', 'beef', 'pork', 'turkey', 'goat', 'kozhi', 'chettinad'];
const FISH_TERMS = ['fish', 'fish sauce', 'prawn', 'shrimp', 'salmon', 'tuna', 'sardine', 'pomfret', 'seer', 'vanjaram', 'meen', 'crab', 'lobster', 'anchovy'];
const EGG_TERMS = ['egg', 'eggs'];
const DAIRY_TERMS = ['curd', 'yogurt', 'yoghurt', 'paneer', 'ghee', 'butter', 'milk', 'cheese', 'whey', 'dahi', 'mosaru'];
const REDUNDANT_QUALIFIER_TERMS = ['vegetarian', 'vegan', 'plant-based', 'meatless', 'no fish sauce'];

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Matches `term` as a whole word, but ignores an occurrence directly
// preceded by "no " (e.g. "no fish sauce" does not count as containing fish).
function findPositiveMatches(text, terms) {
  if (!text) return [];
  const found = [];
  for (const term of terms) {
    const re = new RegExp(`(no\\s+)?\\b${escapeRegex(term)}\\b`, 'gi');
    let match;
    let sawPositive = false;
    while ((match = re.exec(text)) !== null) {
      if (!match[1]) sawPositive = true;
    }
    if (sawPositive) found.push(term);
  }
  return found;
}

function classifyDiet(dietaryPreference) {
  const pref = (dietaryPreference || '').toLowerCase();
  const isVegan = pref.includes('vegan');
  const isVegetarian = !isVegan && pref.includes('vegetarian');
  const eggCaveat = /eat eggs|egg white/i.test(pref);
  const restricted = isVegan || isVegetarian;
  return {
    allowsMeat: !restricted,
    allowsFish: !restricted,
    allowsEggs: !isVegan && (!isVegetarian || eggCaveat),
    allowsDairy: !isVegan,
    isUnrestricted: !restricted && !isVegan,
  };
}

// Returns an array of { day, meal, dish, issue } - never throws, and returns
// [] for anything it can't confidently parse, since this is a safety net,
// not a hard gate on saving.
function checkDietaryCompliance(weeklyPlanTable, dietaryPreference) {
  if (!weeklyPlanTable || !weeklyPlanTable.trim()) return [];

  let rows;
  try {
    rows = parseMealPlanTable(weeklyPlanTable);
  } catch {
    return [];
  }

  const diet = classifyDiet(dietaryPreference);
  const flags = [];

  for (const row of rows) {
    const text = `${row.dish || ''} ${row.swap || ''} ${row.note || ''}`;

    if (!diet.allowsMeat) {
      const hits = findPositiveMatches(text, MEAT_TERMS);
      if (hits.length) flags.push({ day: row.day, meal: row.meal, dish: row.dish, issue: `contains meat (${hits.join(', ')}) but dietary preference is "${dietaryPreference}"` });
    }
    if (!diet.allowsFish) {
      const hits = findPositiveMatches(text, FISH_TERMS);
      if (hits.length) flags.push({ day: row.day, meal: row.meal, dish: row.dish, issue: `contains fish/seafood (${hits.join(', ')}) but dietary preference is "${dietaryPreference}"` });
    }
    if (!diet.allowsEggs) {
      const hits = findPositiveMatches(text, EGG_TERMS);
      if (hits.length) flags.push({ day: row.day, meal: row.meal, dish: row.dish, issue: `contains egg (${hits.join(', ')}) but dietary preference is "${dietaryPreference}"` });
    }
    if (!diet.allowsDairy) {
      const hits = findPositiveMatches(text, DAIRY_TERMS);
      if (hits.length) flags.push({ day: row.day, meal: row.meal, dish: row.dish, issue: `contains dairy (${hits.join(', ')}) but dietary preference is "${dietaryPreference}"` });
    }
    if (diet.isUnrestricted) {
      const hits = findPositiveMatches(text, REDUNDANT_QUALIFIER_TERMS);
      if (hits.length) flags.push({ day: row.day, meal: row.meal, dish: row.dish, issue: `carries a redundant qualifier (${hits.join(', ')}) - dietary preference "${dietaryPreference}" has no restriction that needs it` });
    }
  }

  return flags;
}

module.exports = { checkDietaryCompliance };
