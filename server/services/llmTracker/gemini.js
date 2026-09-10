// Plain Gemini calls have no live web access either - uses the
// "google_search" grounding tool so the model can actually search, the
// closest available proxy for what Google's own AI Overviews/AI Mode might
// surface (Google doesn't offer AI Overviews itself as a public API).
const { wasMentioned, extractCitedUrls } = require('./shared');

const MODEL = 'gemini-3.6-flash'; // must support googleSearch grounding - check
// https://ai.google.dev/gemini-api/docs/grounding if this ever errors on an unsupported model.
// History: gemini-2.0-flash (original guess) -> gemini-2.5-flash (also
// already retired for new API keys) -> gemini-3.6-flash, confirmed live by
// actually calling the API on 2026-09-10. This family moves fast - if this
// 404s again, the error message itself names the current replacement model.

// Rates checked live against ai.google.dev/gemini-api/docs/pricing on
// 2026-09-10 (promotional pricing through end of 2026 - recheck after
// 2027-01-01). Search grounding itself isn't priced in here: Gemini 3.x
// gets 5,000 free grounded requests/month shared across the family, and
// this tracker's ~13/month is nowhere near that, so the realistic marginal
// cost of grounding is $0 - only token cost is estimated.
const RATE_INPUT_PER_TOKEN = 0.75 / 1_000_000;
const RATE_OUTPUT_PER_TOKEN = 3.75 / 1_000_000;

function geminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

async function askGemini(promptText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      tools: [{ google_search: {} }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const responseText = (candidate?.content?.parts || []).map((p) => p.text || '').join('\n');

  // Grounded responses include groundingChunks with the actual source URLs.
  const citations = (candidate?.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web?.uri)
    .filter(Boolean);

  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;
  const costUsd = inputTokens * RATE_INPUT_PER_TOKEN + outputTokens * RATE_OUTPUT_PER_TOKEN;

  return {
    responseText,
    mentioned: wasMentioned(responseText),
    citedUrls: extractCitedUrls(responseText, citations),
    costUsd,
    costIsEstimate: true,
  };
}

module.exports = { geminiConfigured, askGemini };
