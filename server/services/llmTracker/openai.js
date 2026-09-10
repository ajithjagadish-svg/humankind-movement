// Plain chat-completions models have no live web access and would just
// answer from stale training data - not a real proxy for what a user asking
// ChatGPT-with-browsing actually sees. Uses the Responses API with the
// built-in web_search tool instead, so the model can actually look up
// current info the same way ChatGPT's web search does.
const { wasMentioned, extractCitedUrls } = require('./shared');

const MODEL = 'gpt-4o'; // must support the web_search tool - check
// https://platform.openai.com/docs/guides/tools-web-search if this ever errors on an unsupported model.

// OpenAI's Responses API doesn't return a cost field (unlike Perplexity),
// only token counts - so this is computed from published rates, checked
// live against developers.openai.com/api/docs/pricing on 2026-09-10.
// Re-check that page if MODEL or these rates ever change.
const RATE_INPUT_PER_TOKEN = 2.5 / 1_000_000;
const RATE_OUTPUT_PER_TOKEN = 10 / 1_000_000;
const RATE_WEB_SEARCH_PER_CALL = 10 / 1000;

function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function askOpenAI(promptText) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      tools: [{ type: 'web_search' }],
      input: promptText,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();

  // Responses API returns an array of output items (reasoning, tool calls,
  // the final message, ...) - the assistant's text lives in the
  // "message" item's content array as one or more "output_text" parts.
  const messageItem = (data.output || []).find((item) => item.type === 'message');
  const responseText = (messageItem?.content || [])
    .filter((c) => c.type === 'output_text')
    .map((c) => c.text)
    .join('\n');

  // Inline citation annotations (url_citation) on the output_text parts.
  const citations = (messageItem?.content || [])
    .flatMap((c) => c.annotations || [])
    .filter((a) => a.type === 'url_citation')
    .map((a) => a.url);

  const inputTokens = data.usage?.input_tokens || 0;
  const outputTokens = data.usage?.output_tokens || 0;
  const usedWebSearch = (data.output || []).some((item) => item.type === 'web_search_call');
  const costUsd =
    inputTokens * RATE_INPUT_PER_TOKEN + outputTokens * RATE_OUTPUT_PER_TOKEN + (usedWebSearch ? RATE_WEB_SEARCH_PER_CALL : 0);

  return {
    responseText,
    mentioned: wasMentioned(responseText),
    citedUrls: extractCitedUrls(responseText, citations),
    costUsd,
    costIsEstimate: true,
  };
}

module.exports = { openaiConfigured, askOpenAI };
