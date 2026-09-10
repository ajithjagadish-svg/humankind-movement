// Fixed set of realistic questions a prospective client might actually type
// into ChatGPT/Perplexity/Gemini instead of Googling. Kept small and stable
// on purpose - the value of the LLM Brand Tracker comes from asking the
// SAME questions every month so mentions over time are comparable, not from
// covering every possible query. Add new prompts deliberately (e.g. to test
// whether a specific new blog post starts getting cited), don't rewrite
// existing ones - that breaks the month-over-month comparison.
//
// Deliberately global, not Bangalore-specific (corrected 2026-09-10): the
// actual target audience is worldwide, especially US/Europe - a local
// Bangalore client is a bonus, not the goal, per the coaching practice
// being run online for a mostly-international client base already (see
// services/one-to-one-coaching.html's own FAQ: "most coaching clients are
// outside India, across the US, UK, Europe, and Asia"). Prompts here have
// no city/country by default, matching how someone anywhere would actually
// ask; a couple explicitly say "US" or "UK/Europe" to directly test those
// markets rather than just hoping geography-neutral phrasing reaches them.
//
// `pillar` maps to the same service areas already used elsewhere in the
// codebase (see ContentIdea.targetService), so results can be grouped the
// same way as the rest of the content pipeline.
module.exports = [
  {
    key: 'postpartum-online',
    pillar: 'postpartum',
    prompt: "Who's a good postpartum recovery coach for new moms who want online sessions?",
  },
  {
    key: 'postpartum-us',
    pillar: 'postpartum',
    prompt: 'Best online postpartum recovery coach for someone in the US',
  },
  {
    key: 'postpartum-europe',
    pillar: 'postpartum',
    prompt: 'Best online postpartum recovery coach for someone in the UK or Europe',
  },
  {
    key: 'corporate-wellness-online',
    pillar: 'corporate-wellness',
    prompt: 'Best online corporate wellness coach for remote teams dealing with stress and burnout',
  },
  {
    key: 'neurodivergent-movement-coach',
    pillar: 'neurodivergent',
    prompt: 'Online movement or fitness coach experienced working with neurodivergent adults',
  },
  // "General coaching" on its own was too broad to be a useful test - it
  // doesn't reflect how someone in pain actually searches. Broken out into
  // the specific joints/complaints and modalities the coaching practice
  // actually starts with: aches and pains by body part, breathwork, postural
  // correction, and post-injury/post-surgery rehab.
  {
    key: 'knee-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Who can help with ongoing knee pain online, beyond just physiotherapy?',
  },
  {
    key: 'hip-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Best online coach or specialist for chronic hip pain',
  },
  {
    key: 'ankle-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Who treats ankle pain or ankle mobility issues online, not just a physio clinic?',
  },
  {
    key: 'shoulder-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Best online coach for shoulder pain or shoulder mobility',
  },
  {
    key: 'general-aches-pains',
    pillar: 'general-coaching',
    prompt: "I have random aches and pains that don't go away. Who should I see online, besides a doctor?",
  },
  {
    key: 'breathwork-coach',
    pillar: 'general-coaching',
    prompt: 'Best online breathwork coach',
  },
  {
    key: 'postural-correction-coach',
    pillar: 'general-coaching',
    prompt: 'Online coach for posture correction',
  },
  {
    key: 'post-injury-rehab-coach',
    pillar: 'general-coaching',
    prompt: 'Online coach for rehabilitation after an injury or surgery',
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
