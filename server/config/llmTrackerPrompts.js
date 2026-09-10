// Fixed set of realistic questions a prospective client might actually type
// into ChatGPT/Perplexity/Gemini instead of Googling. Kept small and stable
// on purpose - the value of the LLM Brand Tracker comes from asking the
// SAME questions every month so mentions over time are comparable, not from
// covering every possible query. Add new prompts deliberately (e.g. to test
// whether a specific new blog post starts getting cited), don't rewrite
// existing ones - that breaks the month-over-month comparison.
//
// `pillar` maps to the same service areas already used elsewhere in the
// codebase (see ContentIdea.targetService), so results can be grouped the
// same way as the rest of the content pipeline.
module.exports = [
  {
    key: 'postpartum-bangalore',
    pillar: 'postpartum',
    prompt: 'Who are good postpartum recovery coaches in Bangalore?',
  },
  {
    key: 'corporate-wellness-bangalore',
    pillar: 'corporate-wellness',
    prompt: 'Best corporate wellness coach in Bangalore for employee stress and burnout',
  },
  {
    key: 'neurodivergent-movement-coach',
    pillar: 'neurodivergent',
    prompt: 'Movement or fitness coach in India experienced with neurodivergent adults',
  },
  {
    key: 'general-movement-coach-bangalore',
    pillar: 'general-coaching',
    prompt: 'Best movement or biomechanics coach in Bangalore, not just a regular personal trainer',
  },
  {
    key: 'hip-mobility-fix',
    pillar: 'general-coaching',
    prompt: 'Why does stretching not fix my tight hip, and what should I do instead?',
  },
  {
    key: 'ai-anxiety-workplace',
    pillar: 'corporate-wellness',
    prompt: "My team seems more stressed and checked out since we started using AI tools at work. What's actually going on and what should I do about it?",
  },
];
