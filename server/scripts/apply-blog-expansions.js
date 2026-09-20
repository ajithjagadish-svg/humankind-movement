// Applies the reviewed expansion drafts in drafts/blog-expansions/<slug>.html to the
// matching BlogPost bodyHtml. Dry run by default; nothing is written without --apply.
//
//   node server/scripts/apply-blog-expansions.js                    # dry run, all drafts
//   node server/scripts/apply-blog-expansions.js --apply            # write all drafts
//   node server/scripts/apply-blog-expansions.js --apply --only=slug-a,slug-b
//
// Only bodyHtml changes. title/meta are untouched, so the pre-save SEO length check does
// not fire; contentModifiedAt is set automatically by the model's pre-save hook.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB, disconnectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const DIR = path.join(__dirname, '..', '..', 'drafts', 'blog-expansions');
const APPLY = process.argv.includes('--apply');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? onlyArg.slice(7).split(',') : null;
const words = (h) => h.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

(async () => {
  await connectDB();
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5))
    .filter((s) => !ONLY || ONLY.includes(s));
  for (const slug of files) {
    const post = await BlogPost.findOne({ slug, locale: 'en' });
    if (!post) { console.log(`MISSING  ${slug}`); continue; }
    const next = fs.readFileSync(path.join(DIR, slug + '.html'), 'utf8').trim();
    if (next === post.bodyHtml.trim()) { console.log(`SAME     ${slug}`); continue; }
    console.log(`${APPLY ? 'UPDATE  ' : 'WOULD   '} ${slug}: ${words(post.bodyHtml)} -> ${words(next)} words`);
    if (APPLY) { post.bodyHtml = next; await post.save(); }
  }
  await disconnectDB();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
