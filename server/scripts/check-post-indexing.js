// Checks Google's recorded indexing status (via the Search Console URL
// Inspection API) for the blog posts listed in
// server/config/indexing-watchlist.json. Use it to see whether a newly
// published post has been crawled and indexed yet. Needs
// GOOGLE_SERVICE_ACCOUNT_KEY and SEARCH_CONSOLE_SITE_URL in the local .env,
// so run it locally.
//
//   node server/scripts/check-post-indexing.js                  # check every post on the watchlist
//   node server/scripts/check-post-indexing.js --add <slug>     # add a post to the watchlist (English post, /blog/<slug>)
//   node server/scripts/check-post-indexing.js --remove <slug>  # stop watching a post (e.g. once it is indexed)

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { urlInspectionConfigured, inspectUrl } = require('../services/urlInspection');

const BASE = 'https://humankindmovement.in';
const LIST_PATH = path.join(__dirname, '..', 'config', 'indexing-watchlist.json');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readList = () => JSON.parse(fs.readFileSync(LIST_PATH, 'utf8'));
const writeList = (list) => fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 2) + '\n');

async function main() {
  const args = process.argv.slice(2);
  const addIdx = args.indexOf('--add');
  const removeIdx = args.indexOf('--remove');

  if (addIdx !== -1) {
    const slug = args[addIdx + 1];
    if (!slug) throw new Error('--add needs a slug');
    const list = readList();
    if (!list.some((p) => p.slug === slug)) {
      list.push({ slug, publishedAt: new Date().toISOString().slice(0, 10) });
      writeList(list);
    }
    console.log(`Watching ${list.length} post(s).`);
    return;
  }
  if (removeIdx !== -1) {
    const slug = args[removeIdx + 1];
    if (!slug) throw new Error('--remove needs a slug');
    const list = readList().filter((p) => p.slug !== slug);
    writeList(list);
    console.log(`Watching ${list.length} post(s).`);
    return;
  }

  if (!urlInspectionConfigured()) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY / SEARCH_CONSOLE_SITE_URL not configured. Aborting.');
    process.exit(1);
  }

  const list = readList();
  console.log(`Checking ${list.length} watched post(s)...\n`);
  let indexed = 0;

  for (const { slug, publishedAt } of list) {
    const url = `${BASE}/blog/${slug}`;
    try {
      const s = await inspectUrl(url);
      const isIndexed = s.verdict === 'PASS' || /indexed/i.test(s.coverageState || '') && !/not indexed/i.test(s.coverageState || '');
      if (isIndexed) indexed++;
      console.log(`${isIndexed ? '[INDEXED]' : '[pending]'} /blog/${slug} (published ${publishedAt})`);
      console.log(`    coverageState: ${s.coverageState} | verdict: ${s.verdict} | pageFetchState: ${s.pageFetchState}`);
      console.log(`    lastCrawlTime: ${s.lastCrawlTime || 'never crawled'} | googleCanonical: ${s.googleCanonical || '-'}`);
    } catch (err) {
      console.log(`[error] /blog/${slug}: ${err.message}`);
    }
    await sleep(1000);
  }

  console.log(`\nSummary: ${indexed}/${list.length} indexed. Use --remove <slug> once a post is indexed.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
