// Plain chat-completions models have no live web access and would just
// answer from stale training data - not a real proxy for what a user asking
// ChatGPT-with-browsing actually sees. Uses the Responses API with the
// built-in web_search tool instead, so the model can actually look up
// current info the same way ChatGPT's web search does.
const { wasMentioned, extractCitedUrls } = require('./shared');

const MODEL = 'gpt-4o'; // must support the web_search tool - check
// https://platform.openai.com/docs/guides/tools-web-search if this ever errors on an unsupported model.

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

  return {
    responseText,
    mentioned: wasMentioned(responseText),
    citedUrls: extractCitedUrls(responseText, citations),
  };
}

module.exports = { openaiConfigured, askOpenAI };
