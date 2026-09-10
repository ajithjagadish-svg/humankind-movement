// Perplexity retired the old Sonar /chat/completions endpoint in favor of
// the Agent API (/v1/responses) - see
// https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview.
// "fast" is the cheapest preset (maps to the old plain "sonar" model) and,
// like the old Sonar models, is inherently web-search-grounded - no special
// search-mode flag needed, it always searches.
const { wasMentioned, extractCitedUrls } = require('./shared');

const PRESET = 'fast'; // cheapest/fastest preset - check
// https://docs.perplexity.ai/docs/agent-api/migrate-from-sonar/overview if this ever errors on an unknown preset.

function perplexityConfigured() {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

async function askPerplexity(promptText) {
  const res = await fetch('https://api.perplexity.ai/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ preset: PRESET, input: promptText }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const output = data.output || [];

  const messageItem = output.find((item) => item.type === 'message');
  const responseText = (messageItem?.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('\n');

  const searchResultsItem = output.find((item) => item.type === 'search_results');
  const citations = (searchResultsItem?.results || []).map((r) => r.url).filter(Boolean);

  return {
    responseText,
    mentioned: wasMentioned(responseText),
    citedUrls: extractCitedUrls(responseText, citations),
  };
}

module.exports = { perplexityConfigured, askPerplexity };
