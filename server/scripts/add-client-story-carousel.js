require('dotenv').config();
const { connectDB } = require('../config/db');
const ContentIdea = require('../models/ContentIdea');
const Carousel = require('../models/Carousel');

const SLIDES = [
  {
    eyebrow: 'CLIENT STORY',
    headline: '"I have back pain today. Should we skip our session?"',
    sub: 'That was the message I woke up to this morning.',
    bullets: [],
    variant: 'dark',
    ctaBtn: '',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'CLIENT STORY',
    headline: 'We didn\'t skip it.',
    sub: 'We just changed what we worked on: some simple movement through the foot, nowhere near the back.',
    bullets: [],
    variant: 'default',
    ctaBtn: '',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'CLIENT STORY',
    headline: 'One hour later:',
    sub: '"Thank you very much. My lower back pain is reduced now."',
    bullets: [],
    variant: 'default',
    ctaBtn: '',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'THE ACTUAL LESSON',
    headline: 'It wasn\'t really about the foot exercises.',
    sub: 'It was giving yourself permission to follow your breath and stay aware of how you\'re moving. That\'s what actually changes things.',
    bullets: [],
    variant: 'default',
    ctaBtn: '',
    bgStyle: 'lines',
  },
  {
    eyebrow: 'HUMANKIND MOVEMENT',
    headline: 'Your back pain might not start in your back.',
    sub: '',
    bullets: [],
    variant: 'cta',
    ctaBtn: 'Start the Conversation',
    bgStyle: 'orb',
  },
];

async function main() {
  await connectDB();

  const idea = await ContentIdea.create({
    topic: 'Client story: back pain resolved through foot movement, not back work',
    rationale:
      'Real client exchange (anonymized, no name/photo used) showing a same-session pain-to-relief arc that illustrates the "find the driver, not just the symptom" and breath-first coaching philosophy in the client\'s and coach\'s own words. Source: WhatsApp conversation shared by the user, 2026-08-21.',
    targetService: 'general-coaching',
    status: 'drafting',
  });

  const carousel = await Carousel.create({
    title: 'Client story: back pain resolved through foot movement',
    sourceType: 'contentIdea',
    sourceId: idea._id,
    slides: SLIDES,
    status: 'draft',
  });

  console.log('ContentIdea id:', idea._id.toString());
  console.log('Carousel id:', carousel._id.toString());
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
