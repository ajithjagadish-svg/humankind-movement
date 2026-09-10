require('dotenv').config();
const { connectDB } = require('../config/db');
const ContentIdea = require('../models/ContentIdea');
const Carousel = require('../models/Carousel');

const SLIDES = [
  {
    eyebrow: 'HIP MOBILITY',
    headline: 'Stretching your tight hip harder might be the problem.',
    sub: '',
    bullets: [],
    variant: 'dark',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'HIP MOBILITY',
    headline: "Hip mobility isn't really about flexibility.",
    sub: "It's about how much room your femur has to move inside the socket.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'HIP MOBILITY',
    headline: 'Turn your leg in, the femur glides back. Turn it out, it glides forward.',
    sub: "In a hip with normal room to move, there's space to go either way.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'HIP MOBILITY',
    headline: "But if your femur is already biased toward one end...",
    sub: "you can't stretch your way into more of a direction you're already in.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'HIP MOBILITY',
    headline: "That's why some tight hips get worse with more stretching in the same direction.",
    sub: "You're asking a joint to go somewhere it has no room left to go.",
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'THE RESEARCH',
    headline: 'Doctors found the same thing.',
    sub: '',
    bullets: [
      "Hips already leaning 'outward': turned in about 44°",
      "Hips already leaning 'inward': only turned in about 20°",
      'Real study, 442 hips, 2016',
    ],
    variant: 'default',
    bgStyle: 'lines',
  },
  {
    eyebrow: 'THE FIX',
    headline: 'Sometimes you train the opposite direction.',
    sub: 'External rotation work to free up internal rotation room, or the reverse, depending on which way your hip is biased.',
    bullets: [],
    variant: 'default',
    bgStyle: 'orb',
  },
  {
    eyebrow: 'HIP MOBILITY',
    headline: 'Want the full breakdown?',
    sub: 'The science, the two cases, and what to actually do about it, on the blog.',
    bullets: [],
    variant: 'cta',
    ctaBtn: 'Read the Full Breakdown',
    bgStyle: 'orb',
  },
];

async function main() {
  await connectDB();

  const idea = await ContentIdea.create({
    topic: 'Hip mobility: why tight hips sometimes need the opposite-direction fix',
    rationale:
      'Sourced from a Conor Harris newsletter on femur position within the hip socket (internal/external rotation glide, and the two ways a hip can be rotationally biased). Verified the femoral anteversion/retroversion + ROM relationship against 4 PubMed sources. Companion carousel to the "hip-mobility-femur-position" blog post.',
    format: 'social-content',
    targetService: 'general-coaching',
    status: 'drafting',
  });

  const carousel = await Carousel.create({
    title: 'The Hip Mobility Fix That Means Moving the Opposite Way',
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
