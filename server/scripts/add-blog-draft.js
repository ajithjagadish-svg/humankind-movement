// The default way a blog draft enters the site. One command for every post, replacing the one-off add-*-blog-post.js scripts.
//
//   node server/scripts/add-blog-draft.js <folder> [--apply] [--update]
//
// <folder> is drafts/<folder>/ containing:
//   draft.html   first line  <!-- Title -->   second line  <!-- meta: description -->   then the body HTML
//   post.json    { "slug": "...", "category": "postpartum", "keyword": "...", "notes": "...", "review": { "sources": true, ... } }
//
// It runs the blog standard (server/lib/blogStandards.js: the same lint the admin editor uses), prints errors and warnings,
// and saves a DRAFT only. Nothing is published here. Dry run unless --apply. --update refreshes an existing DRAFT with the
// same slug (it refuses to touch a published post). The admin editor then shows the same checklist and blocks publishing
// until it is clean, the four review boxes are ticked and a share image exists.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');
const CATEGORIES = require('../config/categories');
const blogStandards = require('../lib/blogStandards');

const APPLY = process.argv.includes('--apply');
const UPDATE = process.argv.includes('--update');
const folder = process.argv.slice(2).find((a) => !a.startsWith('--'));

(async () => {
  if (!folder) throw new Error('Usage: node server/scripts/add-blog-draft.js <folder under drafts/> [--apply] [--update]');
  const dir = path.join(__dirname, '..', '..', 'drafts', folder);
  const raw = fs.readFileSync(path.join(dir, 'draft.html'), 'utf8');
  const cfg = JSON.parse(fs.readFileSync(path.join(dir, 'post.json'), 'utf8'));
  const title = (raw.match(/<!-- (.*?) -->/) || [])[1];
  const meta = (raw.match(/<!-- meta: (.*?) -->/) || [])[1];
  const bodyHtml = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  if (!title || !meta || !bodyHtml) throw new Error('draft.html needs the title comment, the meta comment and a body');
  const category = CATEGORIES.find((c) => c.key === cfg.category);
  if (!category) throw new Error('post.json category must be one of: ' + CATEGORIES.map((c) => c.key).join(', '));
  if (!cfg.slug || !/^[a-z0-9-]+$/.test(cfg.slug)) throw new Error('post.json needs a slug of lowercase letters, numbers and hyphens');

  const fields = { title, meta, keyword: cfg.keyword || '', bodyHtml, slug: cfg.slug, locale: 'en' };
  const lint = blogStandards.lintPost(fields);
  await connectDB();
  const related = await blogStandards.checkRelatedLinks(bodyHtml, BlogPost);
  const errors = [...lint.errors, ...related];
  console.log(`title ${title.length} | meta ${meta.length} | ${lint.words} words`);
  warningsAndErrors(errors, lint.warnings);
  if (errors.length) throw new Error(`${errors.length} standard error(s). Fix draft.html and run again. Nothing was written.`);
  if (!APPLY) { console.log('DRY RUN: the draft passes the standard, the database is untouched. Add --apply to save it as a DRAFT.'); process.exit(0); }

  const data = {
    slug: cfg.slug, title, meta, keyword: cfg.keyword || '', category: category.key, categoryLabel: category.label, bodyHtml,
    readMins: Math.max(2, Math.round(lint.words / 200)), status: 'draft', notes: cfg.notes || '', standards: 'v1',
    review: { sources: !!(cfg.review && cfg.review.sources), grok: !!(cfg.review && cfg.review.grok), chatgpt: !!(cfg.review && cfg.review.chatgpt), approved: !!(cfg.review && cfg.review.approved) },
  };
  const existing = await BlogPost.findOne({ slug: cfg.slug });
  if (existing) {
    if (!UPDATE) throw new Error('That slug already exists. Add --update to refresh the existing draft.');
    if (existing.status === 'published') throw new Error('That post is published. Edit it in /admin/posts, not here.');
    Object.assign(existing, data);
    await existing.save();
    console.log('Updated DRAFT', existing._id.toString(), existing.slug);
  } else {
    const post = await BlogPost.create(data);
    console.log('Created DRAFT', post._id.toString(), post.slug);
  }
  process.exit(0);
})().catch((e) => { console.error(e.message || e); process.exit(1); });

function warningsAndErrors(errors, warnings) {
  errors.forEach((e) => console.log('  ERROR  ' + e));
  warnings.forEach((w) => console.log('  look at ' + w));
}
