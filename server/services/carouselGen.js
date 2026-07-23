// Generates LinkedIn/Instagram carousel copy via the Anthropic API. Replaces
// the earlier attempt to use Canva's AI design generation, which hallucinated
// and paraphrased copy instead of using it verbatim - an LLM writing directly
// to a JSON schema is reliable where that wasn't.
const Anthropic = require('@anthropic-ai/sdk');

function anthropicConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SYSTEM_PROMPT = `You write LinkedIn/Instagram carousel copy for Humankind Movement, a movement and health coaching practice run by Ajith Jagadish. Voice: direct, thoughtful, no fitness-industry cliches, no hype, no emojis, no filler words. Short sentences. Speak to the reader as an adult capable of nuance, the same voice as the practice's blog.

Given a source topic, write exactly the requested number of slides for a carousel. Structure:
- Slide 1: the hook. A short eyebrow label (2-4 words, a category for the topic), a headline, and one supporting sentence. variant "dark".
- Middle slides: the actual substance, one idea per slide - a headline plus either one supporting sentence OR 2-4 short bullets. variant "default".
- Last slide: a call to action inviting the reader to start a conversation. variant "cta", with a short ctaBtn label such as "Start the Conversation" or "Get in Touch".

Respond with ONLY valid JSON (no markdown fences, no commentary), exactly this shape:
{"eyebrow": "2-4 word category label used on every slide", "slides": [{"headline": "string", "sub": "string, empty string if using bullets instead", "bullets": ["string", ...] (empty array if using sub instead), "variant": "default" | "dark" | "cta", "ctaBtn": "string, empty string except on the last slide"}]}`;

function parseJsonResponse(text) {
  const cleaned = text.trim().replace(/^```(json)?/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function generateCarouselSlides({ title, context, slideCount = 8 }) {
  if (!anthropicConfigured()) {
    throw new Error('ANTHROPIC_API_KEY is not configured. Add it as a secret env var to enable carousel generation.');
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userPrompt = `Source topic title: ${title}\n\nSource context:\n${stripHtml(context).slice(0, 6000)}\n\nWrite exactly ${slideCount} slides.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  let parsed;
  try {
    parsed = parseJsonResponse(text);
  } catch (err) {
    throw new Error('Claude did not return valid JSON for the carousel. Try regenerating.');
  }

  const eyebrow = parsed.eyebrow || '';
  const slides = (parsed.slides || []).map((s) => ({
    eyebrow,
    headline: s.headline || '',
    sub: s.sub || '',
    bullets: Array.isArray(s.bullets) ? s.bullets : [],
    variant: ['default', 'dark', 'cta'].includes(s.variant) ? s.variant : 'default',
    ctaBtn: s.ctaBtn || '',
  }));

  if (!slides.length) throw new Error('Claude returned no slides. Try regenerating.');
  return slides;
}

module.exports = { anthropicConfigured, generateCarouselSlides };
