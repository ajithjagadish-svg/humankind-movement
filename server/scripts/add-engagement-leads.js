// Inserts a batch of curated LinkedIn/Reddit/Instagram engagement leads. Run after a
// live research pass (see the "Engagement queue" section of server/routes/
// admin.js for the workflow) - edit the LEADS array below with that pass's
// results, then `npm run add-engagement-leads`.
require('dotenv').config();
const { connectDB } = require('../config/db');
const EngagementLead = require('../models/EngagementLead');

const LEADS = [
  // {
  //   platform: 'linkedin', // or 'reddit' or 'instagram'
  //   topic: 'postpartum', // aches-pains-rehab | postpartum | neurodivergent | movement-biomechanics | corporate-wellness
  //   postUrl: 'https://www.linkedin.com/posts/...',
  //   authorName: 'Jane Doe',
  //   authorHeadline: 'Postpartum physiotherapist',
  //   postSnippet: 'Excerpt of the original post for context...',
  //   postedAt: '2d ago',
  //   relevanceReason: 'Why this matches HKM\'s niche.',
  //   draftComment: 'A genuine, non-generic comment draft in HKM\'s voice.',
  //   questions: [{ question: 'Anything you want Ajith to weigh in on specifically?', answer: '' }],
  // },
];

async function main() {
  if (!LEADS.length) {
    console.log('LEADS is empty - fill it in with this pass\'s results before running.');
    process.exit(0);
  }

  await connectDB();
  const inserted = await EngagementLead.insertMany(LEADS);
  inserted.forEach((lead) => {
    console.log(`${lead.platform}/${lead.topic}: ${lead._id.toString()} - ${lead.postUrl}`);
  });
  console.log(`Inserted ${inserted.length} lead(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
