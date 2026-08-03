// Checks Google's recorded indexing status for the pre-migration blog
// ".html" URLs affected by the missing /blog/:slug.html redirect (fixed in
// commit 57d0108, 2026-07-28). Run this periodically after the fix to see
// whether Google has recrawled and resolved each one - no browser or
// Search Console login needed, just the existing service account.
//
// Usage: node scripts/check-blog-redirect-indexing.js

require('dotenv').config();
const { urlInspectionConfigured, inspectUrl } = require('../services/urlInspection');

const BASE = 'https://humankindmovement.in';

const AFFECTED_URLS = [
  // Was: Not found (404)
  { slug: 'training-around-an-injury', wasCategory: 'Not found (404)' },
  { slug: 'health-before-success', wasCategory: 'Not found (404)' },
  { slug: 'is-your-fitness-routine-avoidance', wasCategory: 'Not found (404)' },
  { slug: 'teaching-this-approach-to-another-coach', wasCategory: 'Not found (404)' },
  { slug: 'what-ive-learned-from-my-own-avoidance', wasCategory: 'Not found (404)' },
  // Was: Duplicate, Google chose different canonical than user
  { slug: 'did-that-feel-like-you', wasCategory: 'Duplicate canonical' },
  { slug: 'why-instructions-dont-always-work', wasCategory: 'Duplicate canonical' },
  // Was: Discovered - currently not indexed
  { slug: 'heavier-lift-stronger-person', wasCategory: 'Discovered, not indexed' },
  { slug: 'hunger-habit-or-feeling', wasCategory: 'Discovered, not indexed' },
  { slug: 'mobility-vs-flexibility', wasCategory: 'Discovered, not indexed' },
  { slug: 'nervous-system-deadline-vs-tiger', wasCategory: 'Discovered, not indexed' },
  { slug: 'postpartum-recovery-is-not-bouncing-back', wasCategory: 'Discovered, not indexed' },
  { slug: 'recovery-is-a-skill', wasCategory: 'Discovered, not indexed' },
  { slug: 'what-a-resistance-band-taught-me', wasCategory: 'Discovered, not indexed' },
  { slug: 'what-i-look-for-before-programming', wasCategory: 'Discovered, not indexed' },
];

const FIX_DEPLOYED_AT = new Date('2026-07-28T00:00:00Z');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!urlInspectionConfigured()) {
    console.error('GOOGLE_SERVICE_ACCOUNT_KEY / SEARCH_CONSOLE_SITE_URL not configured. Aborting.');
    process.exit(1);
  }

  console.log(`Checking ${AFFECTED_URLS.length} URLs against the .html redirect fix (deployed ${FIX_DEPLOYED_AT.toISOString()})...\n`);

  const results = [];

  for (const { slug, wasCategory } of AFFECTED_URLS) {
    const url = `${BASE}/blog/${slug}.html`;
    try {
      const status = await inspectUrl(url);
      const lastCrawl = status.lastCrawlTime ? new Date(status.lastCrawlTime) : null;
      const recrawledSinceFix = lastCrawl ? lastCrawl > FIX_DEPLOYED_AT : false;

      results.push({
        slug,
        wasCategory,
        coverageState: status.coverageState,
        pageFetchState: status.pageFetchState,
        verdict: status.verdict,
        lastCrawlTime: status.lastCrawlTime || 'never crawled',
        recrawledSinceFix,
      });
    } catch (err) {
      results.push({ slug, wasCategory, error: err.message });
    }

    // Be polite to the API - small gap between calls.
    await sleep(1000);
  }

  const recrawled = results.filter((r) => r.recrawledSinceFix);
  const stale = results.filter((r) => !r.recrawledSinceFix && !r.error);
  const errored = results.filter((r) => r.error);

  console.log('--- Recrawled since fix deployed ---');
  if (recrawled.length === 0) console.log('  (none yet)');
  recrawled.forEach((r) => {
    console.log(`  /blog/${r.slug}.html [was: ${r.wasCategory}]`);
    console.log(`    coverageState: ${r.coverageState} | pageFetchState: ${r.pageFetchState} | verdict: ${r.verdict}`);
    console.log(`    lastCrawlTime: ${r.lastCrawlTime}`);
  });

  console.log('\n--- Still showing pre-fix crawl data (stale, not yet rechecked by Google) ---');
  if (stale.length === 0) console.log('  (none - everything has been recrawled)');
  stale.forEach((r) => {
    console.log(`  /blog/${r.slug}.html [was: ${r.wasCategory}] - last crawled: ${r.lastCrawlTime}`);
  });

  if (errored.length > 0) {
    console.log('\n--- Errors ---');
    errored.forEach((r) => console.log(`  /blog/${r.slug}.html: ${r.error}`));
  }

  console.log(`\nSummary: ${recrawled.length}/${AFFECTED_URLS.length} recrawled since the fix, ${stale.length} still pending, ${errored.length} errored.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
