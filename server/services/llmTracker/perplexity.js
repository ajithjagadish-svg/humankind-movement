// Perplexity is inherently web-search-grounded (that's the whole product),
// so a plain chat-completion call already reflects what a real user asking
// Perplexity would see - no special "search mode" flag needed.
const { wasMentioned, extractCitedUrls } = require('./shared');

const MODEL = 'sonar'; // Perplexity's standard search-grounded model as of writing - check
// https://docs.perplexity.ai/guides/model-cards if this ever 400s with an unknown-model error.

function perplexityConfigured() {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

async function askPerplexity(promptText) {
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: promptText }],
    }),
  });

  if (!res.ok) {
    throw new Error(`Perplexity API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const responseText = data.choices?.[0]?.message?.content || '';
  const citations = data.citations || [];

  return {
    responseText,
    mentioned: wasMentioned(responseText),
    citedUrls: extractCitedUrls(responseText, citations),
  };
}

module.exports = { perplexityConfigured, askPerplexity };
