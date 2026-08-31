// Scans every BlogPost.bodyHtml for internal links and verifies each one
// actually resolves on the live site. Catches the class of bug where a post
// links to a page that doesn't exist - a hallucinated path like
// "../coaching.html", a retired "/experiences#anchor" section, or any other
// dead internal reference - whether it slipped in at draft time or a later
// site restructure (e.g. /experiences -> /services) broke a link that used
// to be valid.
//
// Only checks internal links (same-origin or relative). External links,
// mailto:, tel:, and in-page "#" anchors are skipped.
//
// Usage:
//   node server/scripts/check-blog-internal-links.js               # all posts
//   node server/scripts/check-blog-internal-links.js --status=published

require('dotenv').config();
const { connectDB, disconnectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const BASE = 'https://humankindmovement.in';
const HREF_RE = /href="([^"]+)"/g;

function isInternal(href) {
  if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (/^https?:\/\//i.test(href)) return href.startsWith(BASE);
  return true;
}

// The site serves clean URLs at BASE + absolute path (see
// server/routes/marketing.js). bodyHtml is authored directly for that
// origin, so a relative path (starting with "../" or a bare filename) is
// itself a defect - it implies the link was copied from the old static
// blog/*.html files rather than written for the live template.
function resolve(href) {
  if (href.startsWith(BASE)) return { url: href };
  if (href.startsWith('/')) return { url: BASE + href };
  return { relative: true };
}

async function main() {
  const statusArg = process.argv.find((a) => a.startsWith('--status='));
  const status = statusArg ? statusArg.split('=')[1] : null;

  await connectDB();
  const query = status ? { status } : {};
  const posts = await BlogPost.find(query).select('slug status title bodyHtml').lean();
  console.log(`Scanning ${posts.length} post(s)${status ? ` (status=${status})` : ''} for internal links...\n`);

  const cache = new Map(); // url -> status code or error string
  const problems = [];

  for (const post of posts) {
    const hrefs = new Set();
    let m;
    HREF_RE.lastIndex = 0;
    while ((m = HREF_RE.exec(post.bodyHtml))) hrefs.add(m[1]);

    for (const href of hrefs) {
      if (!isInternal(href)) continue;

      const resolved = resolve(href);
      if (resolved.relative) {
        problems.push({ slug: post.slug, status: post.status, href, issue: 'relative path - bodyHtml links must be absolute (e.g. /services/postpartum-support)' });
        continue;
      }

      const { url } = resolved;
      if (!cache.has(url)) {
        try {
          const res = await fetch(url, { method: 'GET', redirect: 'manual' });
          cache.set(url, res.status);
        } catch (err) {
          cache.set(url, `fetch error: ${err.message}`);
        }
      }
      const result = cache.get(url);
      const ok = typeof result === 'number' && result < 400;
      if (!ok) {
        problems.push({ slug: post.slug, status: post.status, href, issue: typeof result === 'number' ? `HTTP ${result}` : result });
      }
    }
  }

  if (problems.length === 0) {
    console.log('All internal links resolve. No dead links found.');
  } else {
    console.log(`Found ${problems.length} problem link(s):\n`);
    for (const p of problems) {
      console.log(`  [${p.status}] /blog/${p.slug} -> "${p.href}": ${p.issue}`);
    }
  }

  await disconnectDB();
  process.exit(problems.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
