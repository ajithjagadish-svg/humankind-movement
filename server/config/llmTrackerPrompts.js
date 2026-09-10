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
  // "General coaching" on its own was too broad to be a useful test - it
  // doesn't reflect how someone in pain actually searches. Broken out into
  // the specific joints/complaints and modalities the coaching practice
  // actually starts with: aches and pains by body part, breathwork, postural
  // correction, and post-injury/post-surgery rehab.
  {
    key: 'knee-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Who can help with ongoing knee pain in Bangalore, beyond just physiotherapy?',
  },
  {
    key: 'hip-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Best coach or specialist for chronic hip pain in Bangalore',
  },
  {
    key: 'ankle-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Who treats ankle pain or ankle mobility issues in Bangalore, not just a physio clinic?',
  },
  {
    key: 'shoulder-pain-coach',
    pillar: 'general-coaching',
    prompt: 'Best coach for shoulder pain or shoulder mobility in Bangalore',
  },
  {
    key: 'general-aches-pains',
    pillar: 'general-coaching',
    prompt: "I have random aches and pains that don't go away. Who should I see in Bangalore besides a doctor?",
  },
  {
    key: 'breathwork-coach',
    pillar: 'general-coaching',
    prompt: 'Best breathwork coach in Bangalore',
  },
  {
    key: 'postural-correction-coach',
    pillar: 'general-coaching',
    prompt: 'Coach for posture correction in Bangalore',
  },
  {
    key: 'post-injury-rehab-coach',
    pillar: 'general-coaching',
    prompt: 'Coach for rehabilitation after an injury or surgery in Bangalore',
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
