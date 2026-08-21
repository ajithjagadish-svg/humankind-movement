// Inserts a batch of curated social post performance data (Instagram/LinkedIn),
// pulled by asking Claude to check each platform's insights pages live - there's
// no API access, so this is a manual pull, not a live feed. See the "Social
// posts & website traffic" section of /admin/analytics for how this is used -
// edit the POSTS array below with a fresh pull's results, then
// `npm run add-social-posts`.
require('dotenv').config();
const { connectDB } = require('../config/db');
const SocialPost = require('../models/SocialPost');

const POSTS = [
  // {
  //   platform: 'instagram', // or 'linkedin'
  //   account: 'Humankind Movement', // or 'Ajith personal' / 'Humankind Movement Page'
  //   postUrl: 'https://www.instagram.com/p/...',
  //   publishedAt: new Date('2026-08-18'),
  //   caption: 'Short caption snippet for display',
  //   hasSiteLink: true,
  //   metrics: { likes: 0, comments: 0, shares: 0, impressions: null, clicks: null },
  // },
];

async function main() {
  if (!POSTS.length) {
    console.log('POSTS is empty - fill it in with this pass\'s results before running.');
    process.exit(0);
  }

  await connectDB();
  const inserted = await SocialPost.insertMany(POSTS);
  inserted.forEach((post) => {
    console.log(`${post.platform}: ${post._id.toString()} - ${post.publishedAt.toISOString().slice(0, 10)} - ${post.postUrl}`);
  });
  console.log(`Inserted ${inserted.length} post(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
