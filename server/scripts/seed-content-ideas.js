// Seeds the Content Ideas collection with the initial research findings
// from the 2026-07-21 platform/content strategy research session. Every
// idea below is tied to a real source URL found via web search - none of
// this is fabricated. Safe to re-run; skips ideas that already exist
// (matched by topic).

require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const ContentIdea = require('../models/ContentIdea');

const IDEAS = [
  {
    topic: "Corporate wellness shouldn't be a yoga-day photo-op, it should run like a strategy",
    rationale:
      "Real, current LinkedIn/industry discussion shows HR audiences are explicitly tired of one-off wellness events (fruit bowls, yoga day) and want ongoing programs framed as strategy. This directly matches your corporate wellness offering and gives you a contrarian, credible angle for LinkedIn.",
    targetService: 'corporate-wellness',
    sourceLinks: [
      'https://betheoutlier.com/how-to-market-corporate-wellness-and-prepare-your-program-for-success/',
      'https://www.linkedin.com/posts/manah-wellness_inside-the-india-workplace-wellbeing-report-activity-7375861426910973952-pCMz',
    ],
  },
  {
    topic: 'Neurodivergence as variation, not deficiency - the affirming, regulation-first approach',
    rationale:
      "2026 trend research shows a real shift toward viewing ADHD/neurodivergence as a variation in how people process the world, not an obstacle to fix - with family coaching, sensory diets, and regulation-first routines as the practical response. This is close to language already on your site and can be written up directly as a post.",
    targetService: 'neurodivergent',
    sourceLinks: ['https://www.diygenius.com/adhd-and-neurodiversity-trends/'],
  },
  {
    topic: 'Postpartum recovery is pelvic floor AND mental health together, not "bounce back"',
    rationale:
      "Research on postpartum fitness trends shows the real client search pattern pairs pelvic floor/core recovery with postpartum mental health and community support - not the old 'get your body back' framing. Worth an explicit post naming and rejecting the old framing, which a lot of competitor content still uses.",
    targetService: 'postpartum',
    sourceLinks: ['https://mutusystem.com/en-us/mutu-news/10-years-of-postpartum-fitness-trends/'],
  },
];

async function main() {
  await connectDB();

  let created = 0;
  let skipped = 0;
  for (const idea of IDEAS) {
    const exists = await ContentIdea.findOne({ topic: idea.topic });
    if (exists) {
      skipped++;
      continue;
    }
    await ContentIdea.create(idea);
    created++;
  }

  console.log(`Content ideas seeded. Created: ${created}, already existed: ${skipped}.`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
