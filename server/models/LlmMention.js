const mongoose = require('mongoose');

// One row per (provider, prompt, check run). Kept intentionally simple for
// v1: we record whether Humankind Movement/Ajith Jagadish was mentioned and
// whether a specific HKM URL was cited, plus the full raw response text so
// Ajith can read the actual context himself. Deliberately NOT running an
// automated sentiment classifier in v1 (would mean a second LLM call per
// row just to guess at tone) - the raw text plus a human read is more
// trustworthy than a heuristic score for a monthly check this small.
const LlmMentionSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['perplexity', 'openai', 'gemini'], required: true, index: true },
    promptKey: { type: String, required: true, index: true }, // stable id, see config/llmTrackerPrompts.js
    promptText: { type: String, required: true },
    pillar: { type: String, required: true }, // which service area this prompt targets
    // Not required: an error row (API call failed - see `error`) legitimately
    // has no response text, and that row still needs to save successfully so
    // one provider's outage doesn't interrupt the rest of the check run.
    responseText: { type: String, default: '' },
    mentioned: { type: Boolean, required: true, index: true },
    citedUrls: [{ type: String }], // any humankindmovement.in URLs found in the response/citations
    error: { type: String, default: '' }, // set if the API call itself failed - responseText will be empty
    // Cost of this one call in USD. Perplexity returns real, exact cost in
    // its response - costIsEstimate is false for those. OpenAI doesn't
    // return cost, only token counts, so its cost here is computed from
    // published per-token/per-call rates (see services/llmTracker/openai.js)
    // and costIsEstimate is true. Gemini likewise (when it succeeds).
    // None of the three providers expose a "remaining account balance" via
    // any documented API - that can only be checked on each provider's own
    // billing dashboard, so this model deliberately doesn't try to track it.
    costUsd: { type: Number, default: null },
    costIsEstimate: { type: Boolean, default: true },
    checkedAt: { type: Date, required: true, default: Date.now, index: true },
  },
  { timestamps: true }
);

LlmMentionSchema.index({ promptKey: 1, provider: 1, checkedAt: -1 });

module.exports = mongoose.model('LlmMention', LlmMentionSchema);
