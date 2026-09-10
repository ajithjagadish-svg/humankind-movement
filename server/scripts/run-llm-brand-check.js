// Monthly LLM Brand Tracker check. Asks the fixed prompt list (see
// config/llmTrackerPrompts.js) to every configured provider (Perplexity,
// OpenAI, Gemini - each skipped silently if its API key isn't set), records
// whether Humankind Movement/Ajith Jagadish got mentioned and whether any
// humankindmovement.in URL got cited, and saves one LlmMention row per
// (provider, prompt) so results are comparable month over month.
//
// Usage: node server/scripts/run-llm-brand-check.js
require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const LlmMention = require('../models/LlmMention');
const PROMPTS = require('../config/llmTrackerPrompts');
const { perplexityConfigured, askPerplexity } = require('../services/llmTracker/perplexity');
const { openaiConfigured, askOpenAI } = require('../services/llmTracker/openai');
const { geminiConfigured, askGemini } = require('../services/llmTracker/gemini');

const PROVIDERS = [
  { name: 'perplexity', configured: perplexityConfigured, ask: askPerplexity },
  { name: 'openai', configured: openaiConfigured, ask: askOpenAI },
  { name: 'gemini', configured: geminiConfigured, ask: askGemini },
];

async function main() {
  await connectDB();

  const active = PROVIDERS.filter((p) => p.configured());
  if (!active.length) {
    console.log('No provider API keys configured (PERPLEXITY_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY). Nothing to run.');
    await disconnectDB();
    process.exit(1);
  }
  console.log(`Running against: ${active.map((p) => p.name).join(', ')}\n`);

  const rows = [];
  for (const provider of active) {
    for (const { key, pillar, prompt } of PROMPTS) {
      process.stdout.write(`[${provider.name}] ${key}... `);
      try {
        const { responseText, mentioned, citedUrls, costUsd, costIsEstimate } = await provider.ask(prompt);
        await LlmMention.create({
          provider: provider.name,
          promptKey: key,
          promptText: prompt,
          pillar,
          responseText,
          mentioned,
          citedUrls,
          costUsd: typeof costUsd === 'number' ? costUsd : null,
          costIsEstimate: costIsEstimate !== false,
        });
        const costNote = typeof costUsd === 'number' ? ` [${costIsEstimate ? '~' : ''}$${costUsd.toFixed(4)}]` : '';
        console.log((mentioned ? `MENTIONED${citedUrls.length ? ' (cited: ' + citedUrls.join(', ') + ')' : ''}` : 'not mentioned') + costNote);
        rows.push({ provider: provider.name, key, mentioned, citedUrls, costUsd });
      } catch (err) {
        // Belt-and-suspenders: this save should always succeed now that
        // responseText isn't required, but one bad row still must never take
        // down the rest of the run - a provider outage shouldn't cost the
        // other providers'/prompts' results too.
        try {
          await LlmMention.create({
            provider: provider.name,
            promptKey: key,
            promptText: prompt,
            pillar,
            responseText: '',
            mentioned: false,
            citedUrls: [],
            error: err.message,
          });
        } catch (saveErr) {
          console.log(`  (also failed to save the error row: ${saveErr.message})`);
        }
        console.log(`ERROR: ${err.message}`);
        rows.push({ provider: provider.name, key, mentioned: false, error: err.message });
      }
    }
  }

  const mentionedCount = rows.filter((r) => r.mentioned).length;
  const totalCost = rows.reduce((sum, r) => sum + (typeof r.costUsd === 'number' ? r.costUsd : 0), 0);
  console.log(`\nDone. ${mentionedCount}/${rows.length} checks mentioned Humankind Movement. This run cost ~$${totalCost.toFixed(4)}.`);
  console.log('Remaining account balance isn\'t available via API for any of these three providers - check each provider\'s own billing page for that.');

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
