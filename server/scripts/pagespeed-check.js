// Runs the same Lighthouse engine that powers PageSpeed Insights, but
// locally against Chrome on this machine instead of Google's shared,
// rate-limited PSI web app. Same scoring methodology (mobile emulation,
// slow 4G throttling by default), seconds instead of minutes, no waiting,
// no flaky UI automation.
//
// Usage:
//   node server/scripts/pagespeed-check.js <url> [url2] [url3] ...
//   node server/scripts/pagespeed-check.js --core             (all 8 core pages, production)
//   node server/scripts/pagespeed-check.js --blog              (every published blog post - can be slow, see below)
//   node server/scripts/pagespeed-check.js --blog --recent=5   (5 most recently published posts only)
//   node server/scripts/pagespeed-check.js --core --blog       (both, in one run)
//   node server/scripts/pagespeed-check.js --core --local      (all core pages, localhost:8080)
//   node server/scripts/pagespeed-check.js <url> --desktop     (desktop instead of mobile)
//
// --blog queries MongoDB for published post slugs, so it needs the same
// .env (MONGODB_URI) the server uses. At ~10s/page, --blog with no --recent
// limit checks every published post, which can take several minutes on a
// large blog - use --recent=N for a quick check after publishing something.
//
// Exit code is non-zero if any page fails the thresholds below, so this
// can also gate a "ready to ship" check without reading the output.
//
// "Browser errors were logged to the console" has shown up intermittently
// on different pages across different runs (never twice on the same page in
// a row) - it is a real, non-deterministic third-party script blip (GTM /
// Clarity having a bad moment), not a per-page code issue. Deliberately NOT
// added to KNOWN_ENV_AUDITS below, since unlike the other two it is not
// guaranteed to be environmental - a genuine regression could look
// identical. Only worth investigating if it reproduces on the same URL
// across two or more separate runs.

const lighthouse = require('lighthouse').default;
const chromeLauncher = require('chrome-launcher');

const CORE_PAGES = ['about', 'philosophy', 'the-method', 'who-we-serve', 'services', 'services/one-to-one-coaching', 'services/postpartum-support', 'services/neurodivergent-coaching', 'services/workshops', 'services/corporate-wellbeing', 'contact', 'intake', 'postpartum-recovery-guide'];

const THRESHOLDS = { performance: 80, accessibility: 95, 'best-practices': 95, seo: 95 };
const MAX_CLS = 0.1;

// These two audits fail on every page here regardless of our code: they come
// from Google Fonts/GTM/Clarity (third-party scripts we don't control) and
// from running a newer local Chrome than the one PSI's servers pin. Real,
// but not something a code change can fix - excluded from the pass/fail gate
// so the gate only flags things actually worth acting on. Still shown below
// each page's result for transparency, never silently hidden.
const KNOWN_ENV_AUDITS = new Set(['third-party-cookies', 'inspector-issues']);

async function getBlogUrls(base, limit) {
  require('dotenv').config();
  const { connectDB, disconnectDB } = require('../config/db');
  const BlogPost = require('../models/BlogPost');

  await connectDB();
  let query = BlogPost.find({ status: 'published' }).sort({ publishedAt: -1 }).select('slug');
  if (limit) query = query.limit(limit);
  const posts = await query.lean();
  await disconnectDB();

  return posts.map((p) => `${base}/blog/${p.slug}`);
}

async function parseArgs(argv) {
  const desktop = argv.includes('--desktop');
  const local = argv.includes('--local');
  const useCore = argv.includes('--core');
  const useBlog = argv.includes('--blog');
  const recentArg = argv.find((a) => a.startsWith('--recent='));
  const recentLimit = recentArg ? Number(recentArg.split('=')[1]) : null;
  const rawUrls = argv.filter((a) => !a.startsWith('--'));

  const base = local ? 'http://localhost:8080' : 'https://humankindmovement.in';

  let urls = [...rawUrls];
  if (useCore) urls.push(...CORE_PAGES.map((slug) => `${base}/${slug}`));
  if (useBlog) urls.push(...(await getBlogUrls(base, recentLimit)));

  if (!urls.length) {
    console.error(
      'Usage: node server/scripts/pagespeed-check.js <url> [url2] ... [--desktop] [--local] [--core] [--blog] [--recent=N]'
    );
    process.exit(1);
  }
  return { urls, formFactor: desktop ? 'desktop' : 'mobile' };
}

async function runOne(url, chrome, formFactor) {
  const options = {
    logLevel: 'silent',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    formFactor,
    screenEmulation: formFactor === 'desktop'
      ? { disabled: true }
      : { mobile: true, width: 412, height: 823, deviceScaleFactor: 2.625 },
    throttling: formFactor === 'desktop'
      ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
      : undefined, // mobile default already applies slow-4G-equivalent throttling
  };

  const runnerResult = await lighthouse(url, options);
  const lhr = runnerResult.lhr;

  const scores = {};
  for (const key of Object.keys(THRESHOLDS)) {
    scores[key] = Math.round((lhr.categories[key]?.score ?? 0) * 100);
  }
  const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? 0;
  const lcp = lhr.audits['largest-contentful-paint']?.displayValue ?? 'n/a';

  const allFailing = Object.values(lhr.audits).filter(
    (a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === 'binary'
  );
  const failingAudits = allFailing.filter((a) => !KNOWN_ENV_AUDITS.has(a.id)).map((a) => a.title);
  const knownEnvFailures = allFailing.filter((a) => KNOWN_ENV_AUDITS.has(a.id)).map((a) => a.title);

  // Lighthouse's numeric category score is a weighted average, not a simple
  // pass/fail ratio, so reverse-engineering an "adjusted score" from the two
  // known env-only audits is not reliable. Instead: gate each category on
  // whether it has any *actionable* (non-env) failing audit at all, alongside
  // its raw score. A category only trips the gate if a real, fixable audit
  // failed in it - the two known env audits never block by themselves.
  const actionableFailureByCategory = {};
  for (const key of Object.keys(THRESHOLDS)) {
    const auditIds = new Set((lhr.categories[key]?.auditRefs || []).map((ref) => ref.id));
    actionableFailureByCategory[key] = allFailing.some(
      (a) => auditIds.has(a.id) && !KNOWN_ENV_AUDITS.has(a.id)
    );
  }

  return { url, scores, actionableFailureByCategory, cls, lcp, failingAudits, knownEnvFailures };
}

async function main() {
  const { urls, formFactor } = await parseArgs(process.argv.slice(2));
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] });

  let anyFailed = false;
  const results = [];

  try {
    for (const url of urls) {
      process.stdout.write(`Checking ${url} ...`);
      try {
        const result = await runOne(url, chrome, formFactor);
        results.push(result);
        console.log(' done');
      } catch (err) {
        console.log(' FAILED TO LOAD: ' + err.message);
        anyFailed = true;
      }
    }
  } finally {
    await chrome.kill();
  }

  console.log('');
  console.log(`Results (${formFactor}):`);
  console.log('');

  for (const r of results) {
    console.log(r.url);
    const parts = Object.entries(r.scores).map(([key, val]) => {
      // Gate on score-below-threshold AND at least one real (non-env) failing
      // audit in that category - a low score caused only by the known env
      // audits should not fail the check.
      const under = val < THRESHOLDS[key] && r.actionableFailureByCategory[key];
      if (under) anyFailed = true;
      return `${key}=${val}${under ? ' (BELOW ' + THRESHOLDS[key] + ')' : ''}`;
    });
    const clsUnder = r.cls > MAX_CLS;
    if (clsUnder) anyFailed = true;
    parts.push(`CLS=${r.cls.toFixed(3)}${clsUnder ? ' (ABOVE ' + MAX_CLS + ')' : ''}`);
    parts.push(`LCP=${r.lcp}`);
    console.log('  ' + parts.join(' | '));
    if (r.failingAudits.length) {
      console.log('  Failing audits: ' + r.failingAudits.join('; '));
    }
    if (r.knownEnvFailures.length) {
      console.log('  Known env-only (not a code issue, not gated): ' + r.knownEnvFailures.join('; '));
    }
    console.log('');
  }

  if (anyFailed) {
    console.log('One or more pages are below threshold. See above.');
    process.exit(1);
  } else {
    console.log('All pages pass.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
