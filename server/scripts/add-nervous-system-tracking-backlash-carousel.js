// Companion carousel to add-nervous-system-tracking-backlash-blog-post.js.
// Slide 3 needs a real photo of Ajith (at a restaurant, working, or any
// candid shot he takes) - the `photo` field is left empty and MUST be filled
// in with a real site-relative image path before this can be rendered or
// scheduled. Do not substitute a stock photo.
require('dotenv').config();
const { connectDB } = require('../config/db');
const ContentIdea = require('../models/ContentIdea');
const Carousel = require('../models/Carousel');

const SLIDES = [
  {
    eyebrow: 'NERVOUS SYSTEM',
    headline: 'Your longevity routine might be making you less well.',
    sub: '',
    bullets: [],
    variant: 'dark',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'NERVOUS SYSTEM',
    headline: 'Sleep trackers are now causing insomnia.',
    sub: 'Clinicians have a name for it: orthosomnia, real anxiety over getting the "right" sleep score.',
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'NERVOUS SYSTEM',
    headline: 'I see this constantly in coaching.',
    sub: "People can tell me their resting heart rate. They can't tell me where they're holding tension.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
    photo: '', // REQUIRED before publishing: real photo of Ajith (restaurant / working / candid)
  },
  {
    eyebrow: 'THE RESEARCH',
    headline: 'A 150-page industry report just admitted it.',
    sub: '',
    bullets: [
      "Global Wellness Summit's 2026 forecast, built with hundreds of experts",
      "Names the 'Over-Optimization Backlash' as a top trend",
      'Names nervous system regulation the next frontier',
    ],
    variant: 'default',
    bgStyle: 'lines',
  },
  {
    eyebrow: 'THE RESEARCH',
    headline: 'Not crisis. Just permanent background readiness.',
    sub: 'Constant digital stimulation and blurred boundaries keep the nervous system stuck in low-grade fight or flight.',
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'NERVOUS SYSTEM',
    headline: 'That state has a real cost.',
    sub: '',
    bullets: ['Poor sleep', 'Inflammation', 'Cognitive fog', 'Weakened immunity'],
    variant: 'default',
    bgStyle: 'lines',
  },
  {
    eyebrow: 'NERVOUS SYSTEM',
    headline: "The body doesn't repair while it's bracing.",
    sub: "Regulation isn't a wellness extra. It's the floor everything else gets built on.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'TRY THIS NOW',
    headline: 'Notice your breath right now.',
    sub: "High and in your chest, or low in your belly? That's your nervous system's real answer, no tracker needed. Save this before your next stressful moment.",
    bullets: [],
    variant: 'cta',
    ctaBtn: 'Save This',
    bgStyle: 'orb',
  },
];

async function main() {
  await connectDB();

  const idea = await ContentIdea.create({
    topic: 'Nervous system regulation as the 2026 wellness backlash trend, health-tracking anxiety (orthosomnia)',
    rationale:
      'Sourced from a LinkedIn post by sophrologist Dominique Antiglio referencing the Global Wellness Summit 2026 trends report. All claims (orthosomnia, the report\'s specific trends/language, allostatic-load physiology) independently re-verified via PubMed and the report\'s own site, 2026-09-11. Companion carousel to the blog post of the same topic.',
    format: 'social-content',
    targetService: 'general-coaching',
    status: 'drafting',
  });

  const carousel = await Carousel.create({
    title: 'Your Longevity Routine Might Be Making You Less Well',
    sourceType: 'contentIdea',
    sourceId: idea._id,
    slides: SLIDES,
    status: 'draft',
  });

  console.log('ContentIdea id:', idea._id.toString());
  console.log('Carousel id:', carousel._id.toString());
  console.log('REMINDER: slide 3 needs a real photo before this can be rendered or scheduled.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
