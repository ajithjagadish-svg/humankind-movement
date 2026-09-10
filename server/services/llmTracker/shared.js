// Shared helpers used by every provider adapter in this directory.

const BRAND_TERMS = [/humankind movement/i, /humankindmovement\.in/i, /ajith jagadish/i];
const URL_RE = /https?:\/\/(?:www\.)?humankindmovement\.in\/[^\s")\]]*/gi;

function wasMentioned(text) {
  return BRAND_TERMS.some((re) => re.test(text));
}

// Pulls any humankindmovement.in URLs out of both the response body and a
// provider-supplied citations list (Perplexity/Gemini return these
// separately from the message text; OpenAI's web search tool inlines them
// as markdown links, which the URL_RE catches directly in responseText).
function extractCitedUrls(text, extraCitations = []) {
  const found = new Set();
  for (const m of text.matchAll(URL_RE)) found.add(m[0].replace(/[.,]$/, ''));
  for (const c of extraCitations) {
    if (typeof c === 'string' && /humankindmovement\.in/i.test(c)) found.add(c);
  }
  return Array.from(found);
}

module.exports = { wasMentioned, extractCitedUrls };
