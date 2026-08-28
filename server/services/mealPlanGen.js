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
- Dense, hard-to-digest millet preparations (ragi mudde and similar stiff millet dumplings) belong at lunch, never dinner - they sit heavy and make digestion difficult right before sleep. Use lighter dinner carbs instead (curd rice, a small millet rice, roti, or quinoa).
- Protein is distributed across all meals, not clustered in one.
- Every item includes a swap (Option B) that is macro-similar to Option A, so the client is never locked into one dish.
- Respect the stated dietary preference strictly for BOTH options: "Eat meat" can include meat, fish, eggs, dairy; "Vegetarian, eat eggs" can include eggs and dairy but no meat or fish; "Vegetarian" can include dairy but no meat, fish, or eggs; "Vegan" excludes all animal products including dairy and eggs. Read the dietary preference text for any specific caveat beyond these four categories (e.g. "eat eggs (egg white powder specifically, not whole eggs)") and treat it as a real, ongoing protein source available throughout the WHOLE week, not something used once in one dish and then forgotten - it should show up as an option in swap cells too wherever a protein alternative is being listed (breakfast, lunch, dinner, and snack swaps alike), not just in one Option A dish.
- If the client's dietary preference allows eggs - whole eggs, or a specific caveat like egg white powder - make that a genuine daily breakfast protein anchor, not an occasional dish. Respect the exact form allowed: whole eggs only when the preference says so; egg white powder mixed into water/a shake/curd for a "not whole eggs" caveat.
- A ragi or other millet malt bowl (cooked with milk and a little jaggery) is a legitimate simple/Western-style breakfast carb alongside rolled oats - offer it as a swap option, not just oats every time.
- Option A follows the stated cuisine background if one is given (e.g. South Indian, Punjabi, Gujarati) - use real, specific dishes from that cuisine, not generic "chicken and rice" placeholders. If no cuisine is given, use broadly accessible Indian home-cooking for Option A.
- Include real fermented foods through the week, not just as a garnish: curd/yogurt, buttermilk (chaas), idli/dosa batter, and a fermented vegetable pickle or kanji all count. A high-fermented-food diet measurably increased gut microbiome diversity and lowered inflammatory markers in a 17-week randomized trial, an effect a high-fiber diet alone did not produce (Wastyk et al., Cell 2021). Do not add kombucha as a default recommendation - the evidence for it is weak and mixed: one controlled trial found it raised fasting insulin and insulin resistance with no inflammation benefit (Ecklu-Mensah et al., Sci Rep 2024), and another found only one minor antioxidant marker improved (Bonifácio et al., Br J Nutr 2025). Only include it if the client specifically asks for it, and frame it as neutral, not a health upgrade.
- Option B does NOT have to match that cuisine - it exists so the client has a genuinely different fallback: a simpler, more globally-accessible alternative (oats, dry fruits and nuts, a protein shake, a Western-style option, or another cuisine entirely) is a good Option B, not a failure to stay on-theme.
- When Option B departs from Option A's cuisine or setting, do it for the WHOLE meal, not one item in isolation - EVERY row in that meal (fibre, protein, fat, carb) needs its own Option B in the same alternative style, never just the protein row while fibre/carb keep their home-cooked swap. The client should be able to read down the Option B column for one meal and get one coherent alternative meal, not a patchwork. Example (breakfast, Western-oats-style): Fibre swaps to "diced fruit or berries", Protein to "Greek yogurt or a scoop of whey stirred into the oats", Fat to "chia seeds, flax, or almonds", Carb to "rolled oats".
- Lunch AND dinner both need a REALISTIC away-from-home Option B across every row, not another home-cooked dish - people eat lunch at work, and dinner out, while traveling, or too tired to cook a second version of Option A. For lunch, think office/on-the-go: a build-your-own grain bowl, a rotisserie chicken or pre-made salad from a grocery store, a deli sandwich or wrap, a poke bowl, a Mediterranean bowl (falafel or hummus for vegetarians/vegans, chicken shawarma for others) - then give each row its own piece of that same bowl: Fibre swaps to "a side salad or steamed vegetables", Protein to "grilled chicken, rotisserie chicken, or grilled salmon" (or "tofu, beans, or chickpeas" for vegetarians), Carb to "brown rice, quinoa, or a whole-grain wrap" - all three rows describing components of the SAME order, not three unrelated ideas. For dinner, same principle with a restaurant/travel framing: a grilled protein plate, a grocery rotisserie chicken or pre-cooked salmon, a poke or Mediterranean bowl, or a hotel-safe option for nights on the road - again with Fibre/Protein/Carb rows each carrying their own piece of that same meal. If a location is given, prefer chains and grocery staples genuinely common there over generic descriptions. List 2-3 real alternatives in each swap cell separated by "or", not just one. Breakfast can still use a home-cooked or simple Option B since it is more often eaten at home, but don't assume that for lunch or dinner.
- Snacks need a real grab-and-go Option B too - a protein bar, a pre-made protein shake, a Greek yogurt cup, roasted chickpeas or edamame, a piece of fruit with nuts, or a string/cottage cheese cup with crackers. Give 2-3 of these rather than one. A whey/protein-powder item as Option A is already portable and does not need this treatment - its existing simple swap (e.g. roasted chana or nuts) is fine as-is.
- Give multiple realistic options in a swap cell whenever that is more useful than a single alternative (lunch, dinner, and snacks always, other meals when it adds real choice) - separate them with "or" in the same cell rather than picking just one.
- The day's macro totals should land within roughly 10% of the stated daily targets.
- If a training schedule is given, add a post-training protein feed within about 60 minutes after each session on those days, and label those days in the Day column like "Mon (Training)".
- Add a short coaching Note only where it adds real value (timing a supplement, a batch-cook tip, an iron/coffee interaction) - leave it blank most rows.

Output ONLY the data as tab-separated rows, one row per food item, no header row, no markdown, no commentary. Columns in order: Day, Meal, Time, Eat order, Dish (Option A), Swap (Option B), Protein g, Carb g, Fat g, Fibre g, kcal, Note. Leave Day/Meal/Time blank on rows that continue the same meal as the row above (only the first item of each meal carries those three values) - this is a spreadsheet-paste convention the renderer relies on. Use plain numbers with no units in the macro columns.`;

function buildUserPrompt({ dietaryPreference, cuisineBackground, trainingSchedule, location, startingPoint }) {
  return [
    `Dietary preference: ${dietaryPreference || 'not specified - assume a general non-vegetarian Indian diet'}`,
    `Cuisine background: ${cuisineBackground || 'not specified - use broadly accessible Indian home-cooking'}`,
    `Location: ${location || 'not specified - use generically available Western grocery/fast-casual options for the lunch away-from-home swaps'}`,
    `Training schedule: ${trainingSchedule || 'not specified - no post-training feed needed'}`,
    `Daily targets: ${startingPoint.calorieTarget} kcal, ${startingPoint.proteinTarget} g protein (~${startingPoint.proteinPerMeal} g per meal), ${startingPoint.fatTarget} g fat, ${startingPoint.carbTarget} g carbohydrate, ${startingPoint.fiberTarget} g fibre.`,
    'Write the full 7-day table now (Monday through Sunday).',
  ].join('\n');
}

async function generateMealPlanDraft({ dietaryPreference, cuisineBackground, trainingSchedule, location, startingPoint }) {
  if (!anthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it as a secret env var to enable meal plan drafting.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserPrompt({ dietaryPreference, cuisineBackground, trainingSchedule, location, startingPoint }) }],
  });

  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('').trim();
  if (!text) throw new Error('Claude returned an empty meal plan. Try regenerating.');
  return text;
}

module.exports = { anthropicConfigured, generateMealPlanDraft };
