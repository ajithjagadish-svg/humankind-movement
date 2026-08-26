// Drafts a weekly meal table via the Anthropic API, adapted to the client's
// diet and cuisine background - same pattern as carouselGen.js (already in
// this codebase). Output is plain tab-separated text in the exact column
// order server/services/mealPlanTable.js parses (Day, Meal, Time, Eat
// order, Dish, Swap, Protein g, Carb g, Fat g, Fibre g, kcal, Note), so the
// result drops straight into ClientProfile.weeklyPlanTable and renders in
// the Plan PDF exactly like a hand-pasted spreadsheet range would.
//
// This is a draft, not verified nutrition data - per-dish macros are the
// LLM's estimate, not lab-measured. A coach must review and correct it
// before it reaches a client, the same way every other AI-generated
// content on this site (carousels, blog drafts) gets reviewed before
// publishing.
const Anthropic = require('@anthropic-ai/sdk');

function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const SYSTEM_PROMPT = `You write weekly meal plans for Humankind Movement, a movement and health coaching practice. You are given a client's dietary preference, cuisine background, and daily macro targets, and must produce a 7-day meal table.

House rules, non-negotiable:
- Every meal is sequenced in this order: 1 - Fibre first (vegetables/salad), 2 - Protein (main protein source), 3 - Fat (oil/nuts/coconut/ghee, often already in the protein dish - can be omitted as a separate line if it's part of the protein dish), 4 - Carb last (rice/roti/millet/bread). Mark each item's position with exactly this label format: "1 - Fibre first", "2 - Protein", "3 - Fat", "4 - Carb last".
- 4-5 eating occasions per day (breakfast, lunch, an afternoon snack or post-training feed, dinner).
- Carbohydrate is front-loaded: breakfast and lunch carry the largest carb portions, dinner the smallest.
- Protein is distributed across all meals, not clustered in one.
- Every item includes a swap (Option B) that is macro-similar to Option A, so the client is never locked into one dish.
- Respect the stated dietary preference strictly for BOTH options: "Eat meat" can include meat, fish, eggs, dairy; "Vegetarian, eat eggs" can include eggs and dairy but no meat or fish; "Vegetarian" can include dairy but no meat, fish, or eggs; "Vegan" excludes all animal products including dairy and eggs.
- Option A follows the stated cuisine background if one is given (e.g. South Indian, Punjabi, Gujarati) - use real, specific dishes from that cuisine, not generic "chicken and rice" placeholders. If no cuisine is given, use broadly accessible Indian home-cooking for Option A.
- Option B does NOT have to match that cuisine - it exists precisely so the client has a genuinely different fallback: a simpler, more globally-accessible alternative (oats, dry fruits and nuts, a protein shake, a Western-style option, or another cuisine entirely) is a good Option B, not a failure to stay on-theme. Only the macros need to line up with Option A, not the culinary style.
- The day's macro totals should land within roughly 10% of the stated daily targets.
- Add a short coaching Note only where it adds real value (timing a supplement, a batch-cook tip, an iron/coffee interaction) - leave it blank most rows.

Output ONLY the data as tab-separated rows, one row per food item, no header row, no markdown, no commentary. Columns in order: Day, Meal, Time, Eat order, Dish (Option A), Swap (Option B), Protein g, Carb g, Fat g, Fibre g, kcal, Note. Leave Day/Meal/Time blank on rows that continue the same meal as the row above (only the first item of each meal carries those three values) - this is a spreadsheet-paste convention the renderer relies on. Use plain numbers with no units in the macro columns.`;

function buildUserPrompt({ dietaryPreference, cuisineBackground, startingPoint }) {
  return [
    `Dietary preference: ${dietaryPreference || 'not specified - assume a general non-vegetarian Indian diet'}`,
    `Cuisine background: ${cuisineBackground || 'not specified - use broadly accessible Indian home-cooking'}`,
    `Daily targets: ${startingPoint.calorieTarget} kcal, ${startingPoint.proteinTarget} g protein (~${startingPoint.proteinPerMeal} g per meal), ${startingPoint.fatTarget} g fat, ${startingPoint.carbTarget} g carbohydrate, ${startingPoint.fiberTarget} g fibre.`,
    'Write the full 7-day table now (Monday through Sunday).',
  ].join('\n');
}

async function generateMealPlanDraft({ dietaryPreference, cuisineBackground, startingPoint }) {
  if (!anthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it as a secret env var to enable meal plan drafting.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt({ dietaryPreference, cuisineBackground, startingPoint }) }],
  });

  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('').trim();
  if (!text) throw new Error('Claude returned an empty meal plan. Try regenerating.');
  return text;
}

module.exports = { anthropicConfigured, generateMealPlanDraft };
