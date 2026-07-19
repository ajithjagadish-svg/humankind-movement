// One-time migration: reads the metadata array embedded in the old
// dashboard.html plus the article body out of each blog/*.html file, and
// inserts them into MongoDB as BlogPost documents. Safe to re-run - it
// upserts by slug rather than duplicating.
//
// Usage: npm run seed-blog-posts   (run from server/, needs MONGODB_URI
// set to point at the real database you want seeded - otherwise it seeds
// a throwaway in-memory instance, which is useless for a real migration).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { connectDB, disconnectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const REPO_ROOT = path.join(__dirname, '..', '..');
const DASHBOARD_PATH = path.join(REPO_ROOT, 'dashboard.html');
const BLOG_DIR = path.join(REPO_ROOT, 'blog');

function extractPostsArray(dashboardHtml) {
  const match = dashboardHtml.match(/const POSTS = (\[[\s\S]*?\]);\s*\nconst CATEGORY_ORDER/);
  if (!match) {
    throw new Error('Could not find "const POSTS = [...]" in dashboard.html - has it changed shape?');
  }
  // Trusted local file, not user input - safe to evaluate as a JS literal.
  // eslint-disable-next-line no-new-func
  return new Function(`return ${match[1]}`)();
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.warn(
      'WARNING: MONGODB_URI is not set - this will seed a throwaway in-memory ' +
        'database, not your real one. Set MONGODB_URI to your Atlas connection ' +
        'string before running this for real.'
    );
  }

  await connectDB();

  const dashboardHtml = fs.readFileSync(DASHBOARD_PATH, 'utf8');
  const posts = extractPostsArray(dashboardHtml);
  console.log(`Found ${posts.length} posts in dashboard.html's POSTS array.`);

  let created = 0;
  let updated = 0;
  const problems = [];

  for (const post of posts) {
    const filePath = path.join(BLOG_DIR, `${post.slug}.html`);
    if (!fs.existsSync(filePath)) {
      problems.push(`${post.slug}: no matching file at blog/${post.slug}.html - skipped.`);
      continue;
    }

    const html = fs.readFileSync(filePath, 'utf8');
    const $ = cheerio.load(html);
    const article = $('article').first();
    if (article.length === 0) {
      problems.push(`${post.slug}: no <article> element found - skipped.`);
      continue;
    }
    const bodyHtml = article.html().trim();

    const doc = {
      slug: post.slug,
      title: post.title,
      meta: post.meta,
      keyword: post.keyword || '',
      category: post.category,
      categoryLabel: post.categoryLabel,
      bodyHtml,
      readMins: post.readMins || 2,
      status: 'published',
      publishedAt: new Date(post.date),
    };

    const existed = await BlogPost.exists({ slug: post.slug });
    await BlogPost.findOneAndUpdate({ slug: post.slug }, { $set: doc }, { upsert: true });
    if (existed) {
      updated++;
    } else {
      created++;
    }
  }

  console.log(`Done. Created: ${created}, updated: ${updated}, skipped: ${problems.length}.`);
  if (problems.length) {
    console.log('\nSkipped posts (needs manual attention):');
    problems.forEach((p) => console.log(`  - ${p}`));
  }

  const total = await BlogPost.countDocuments();
  console.log(`\nTotal BlogPost documents in the database now: ${total}`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
