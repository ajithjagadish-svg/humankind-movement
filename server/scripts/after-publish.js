// Run this locally right after you publish a blog post from /admin/posts.
// It does the steps that cannot happen automatically at publish time:
//   1. renders the post's branded share card (needs local Chrome, so it cannot run in production)
//   2. adds the post to the Google indexing watchlist
//   3. checks the live page and its og:image
//   4. prints the exact git commands to commit and push the new files (it does NOT commit or push)
//
// Usage: node server/scripts/after-publish.js <slug>
//
// The admin Publish button already handles: publishedAt, the linked idea's status,
// subscriber emails, and the IndexNow ping (Bing/Yandex).

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { connectDB, disconnectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const ROOT = path.join(__dirname, '..', '..');
const LIST_PATH = path.join(ROOT, 'server', 'config', 'indexing-watchlist.json');
const BASE = 'https://humankindmovement.in';

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node server/scripts/after-publish.js <slug>');
    process.exit(1);
  }

  await connectDB();
  const post = await BlogPost.findOne({ slug, locale: 'en' }).lean();
  await disconnectDB();
  if (!post) throw new Error(`No English post with slug "${slug}".`);
  if (post.status !== 'published') throw new Error(`"${slug}" is still a draft. Publish it in /admin/posts first, then run this.`);

  // 1. Share card. render-og-images.js only renders published posts that have no card yet.
  const cardPath = path.join(ROOT, 'assets', 'img', 'og', `${slug}.jpg`);
  if (!fs.existsSync(cardPath)) {
    console.log('Rendering share card...');
    execFileSync('node', [path.join(__dirname, 'render-og-images.js')], { cwd: ROOT, stdio: 'inherit' });
  }
  console.log(fs.existsSync(cardPath) ? `Share card: assets/img/og/${slug}.jpg` : 'WARNING: share card was not created.');

  // 2. Indexing watchlist
  const list = JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
  if (!list.some((p) => p.slug === slug)) {
    list.push({ slug, publishedAt: new Date(post.publishedAt || Date.now()).toISOString().slice(0, 10) });
    fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 2) + '\n');
    console.log('Added to server/config/indexing-watchlist.json');
  } else {
    console.log('Already on the indexing watchlist.');
  }

  // 3. Live page check
  try {
    const res = await fetch(`${BASE}/blog/${slug}`);
    const html = await res.text();
    const og = (html.match(/property="og:image" content="([^"]*)"/) || [])[1] || '(none)';
    console.log(`Live page: HTTP ${res.status}, og:image = ${og}`);
    if (!og.includes(`/og/${slug}.jpg`)) console.log('  (og:image will switch to the share card once the commit below is deployed)');
  } catch (err) {
    console.log(`Live page check failed: ${err.message}`);
  }

  // 4. Commit commands
  console.log(`
Next, commit and push so the share card goes live:

  git add assets/img/og/${slug}.jpg server/config/indexing-watchlist.json
  git commit -m "Add share card and indexing watch for ${slug}"
  git push origin main

Later, check Google's indexing with: node server/scripts/check-post-indexing.js
`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
