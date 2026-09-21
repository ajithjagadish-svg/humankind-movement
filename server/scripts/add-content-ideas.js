// Generic importer for the Content Ideas collection, used by the weekly
// scheduled research task (see .claude/scheduled-tasks/content-ideas-refresh)
// as well as for one-off manual additions. Takes a path to a JSON file
// containing an array of idea objects. Safe to re-run; skips ideas that
// already exist (matched by exact topic text).
//
// Each idea may optionally include a `draftPost` object to also create a
// linked draft blog post (never published automatically - status is always
// 'draft', for Ajith to review and publish himself from /admin/posts).
//
// Usage: node server/scripts/add-content-ideas.js path/to/ideas.json
//        node server/scripts/add-content-ideas.js path/to/ideas.json --check-only   (lint only, writes nothing)
//
// Every draftPost is linted against the site's standing content rules before
// anything is written (see lintDraft below). Errors abort the whole import;
// warnings are printed and the import continues.
//
// Idea shape:
// {
//   "topic": "...", "rationale": "...",
//   "targetService": "corporate-wellness" | "general-coaching" | "postpartum" | "neurodivergent" | "other",
//   "sourceLinks": ["https://..."],
//   "draftPost": {   // optional
//     "title": "...", "meta": "...", "keyword": "...",
//     "category": "postpartum",  // must be a key from server/config/categories.js
//     "bodyHtml": "<p>...</p><p>...</p>",
//     "readMins": 4
//   }
// }

require('dotenv').config();
const fs = require('fs');
const { connectDB, disconnectDB } = require('../config/db');
const ContentIdea = require('../models/ContentIdea');
const BlogPost = require('../models/BlogPost');
const CATEGORIES = require('../config/categories');

const VALID_SERVICES = ['corporate-wellness', 'general-coaching', 'postpartum', 'neurodivergent', 'other'];

function slugify(title) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// The site serves every marketing/blog page at a clean URL with no ".html"
// extension (see server/routes/marketing.js) - a bodyHtml link containing
// ".html" is therefore always a legacy/dead path, never a real page.
// "/experiences" was retired in favor of the standalone /services/<slug>
// pages, and its old anchor ids don't exist there - see
// server/routes/marketing.js's SERVICE_PAGES for the current list.
function checkInternalLinks(bodyHtml, topic) {
  const hrefRe = /href="([^"]+)"/g;
  let m;
  while ((m = hrefRe.exec(bodyHtml))) {
    const href = m[1];
    if (/^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    if (href.includes('.html')) {
      throw new Error(`draftPost for "${topic}" links to "${href}", but the site serves clean URLs with no .html extension - that page doesn't exist and will 404. Use an absolute path like /services/postpartum-support instead.`);
    }
    if (href.startsWith('/experiences')) {
      throw new Error(`draftPost for "${topic}" links to "${href}", but /experiences was retired and its anchors no longer exist. Use one of: /services/one-to-one-coaching, /services/postpartum-support, /services/neurodivergent-coaching, /services/workshops, /services/corporate-wellbeing.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Content lint. These are Ajith's standing rules for every blog draft (voice,
// plain language, SEO/AEO/GEO checklist). Enforced here so a weekly run cannot
// slip past them by forgetting the instructions. Errors abort the import;
// warnings are printed for review.
// ---------------------------------------------------------------------------
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const countWords = (text) => text.split(/\s+/).filter(Boolean).length;

function lintDraft(idea) {
  const errors = [];
  const warnings = [];
  const { title, meta, keyword, bodyHtml } = idea.draftPost;
  const text = stripTags(bodyHtml);
  const main = stripTags(bodyHtml.split('<div class="footnotes">')[0]);

  if (title.length < 45 || title.length > 70) errors.push(`title is ${title.length} chars, must be 45-70`);
  if (meta.length < 120 || meta.length > 150) errors.push(`meta is ${meta.length} chars, must be 120-150`);
  if (/[—–]/.test(`${title} ${meta} ${bodyHtml}`)) errors.push('contains an em dash or en dash (site-wide rule: use commas or split the sentence)');

  if (keyword) {
    const t = title.toLowerCase();
    const missing = keyword.toLowerCase().split(/\s+/).filter((w) => !t.includes(w.replace(/s$/, '')));
    if (missing.length) errors.push(`keyword "${keyword}" is not in the title (missing: ${missing.join(', ')})`);
  } else {
    warnings.push('no keyword set');
  }

  // Voice: collective "we", never first-person singular. Quoted text (a reader's own question) is exempt.
  const unquoted = main.replace(/"[^"]*"|“[^”]*”/g, ' ');
  const fp = unquoted.match(/\b(?:I|I'm|I've|I'd|I'll|my|My|me|Me|mine)\b/g);
  if (fp) errors.push(`first-person singular found (${[...new Set(fp)].join(', ')}); use "we" (Ajith's rule, 2026-09-14)`);

  // Weakness framing is never allowed about a body; plain "weak" (e.g. "weak evidence") is only a warning.
  if (/\bweak(?:er|ness|ened)?\b[^.]{0,30}\b(?:core|back|pelvic|floor|glutes?|hips?|abs|abdominal|muscles?|body)\b/i.test(main)
      || /\b(?:core|back|pelvic floor|glutes?|hips?|abs|muscles?)\b[^.]{0,20}\b(?:is|are|was|were)\s+weak/i.test(main)) {
    errors.push('weakness language about a body ("weak core/back/pelvic floor"); frame root cause as coordination, starting with the breath');
  } else if (/\bweak/i.test(main)) {
    warnings.push('the word "weak" appears; make sure it is not describing a body or a person');
  }
  if (/kegel/i.test(main)) warnings.push('mentions Kegels; must never imply we prescribe them (breath first, then coordination)');

  // SEO / AEO / GEO structure
  if ((bodyHtml.match(/<h2>/g) || []).length < 2) errors.push('needs at least 2 <h2> subheadings');
  if (!/<sup class="fn">/.test(bodyHtml) || !/<div class="footnotes">/.test(bodyHtml)) errors.push('needs an inline footnote (<sup class="fn">) and a <div class="footnotes"> block citing the primary source');
  if (!/href="\/services\/[a-z-]+"/.test(bodyHtml)) errors.push('needs one link to a /services/<slug> page');
  if (!/href="\/blog\/(?!topics)[a-z0-9-]+"/.test(bodyHtml)) errors.push('needs one link to a related PUBLISHED blog post (/blog/<slug>), see Step 3 of the task');

  // Length target is 400-700 including citation lines; allow a little slack.
  const total = countWords(text);
  if (total > 750) errors.push(`${total} words including citations; target is about 700 (max 750)`);
  if (total < 500) errors.push(`${total} words including citations; target is 500-700 (min 500, the audit counts posts under 500 words as thin)`);

  // Plain language: warnings, because judgment is needed.
  const jargon = main.match(/\b(?:pooled|meta-analys[ie]s|randomi[sz]ed|cohort|risk of bias|statistically|cross-sectional|intra-abdominal|inter-recti|doming|significant(?:ly)?)\b/gi);
  if (jargon) warnings.push(`possible jargon a 10 year old would trip on: ${[...new Set(jargon.map((j) => j.toLowerCase()))].join(', ')}`);
  const longSentences = main.split(/(?<=[.?!])\s+/).filter((sent) => countWords(sent) > 28);
  if (longSentences.length) warnings.push(`${longSentences.length} sentence(s) over 28 words, split them: "${longSentences[0].slice(0, 70)}..."`);

  return { errors, warnings };
}

// Every draft must link to a related post that actually exists and is published.
async function checkRelatedPostLinks(ideas) {
  const problems = [];
  for (const idea of ideas) {
    if (!idea.draftPost) continue;
    const slugs = [...idea.draftPost.bodyHtml.matchAll(/href="\/blog\/(?!topics)([a-z0-9-]+)"/g)].map((m) => m[1]);
    for (const slug of slugs) {
      const found = await BlogPost.findOne({ slug, status: 'published', locale: 'en' }).select('_id').lean();
      if (!found) problems.push(`"${idea.draftPost.title}" links to /blog/${slug}, which is not a published English post`);
    }
  }
  return problems;
}

function validate(idea) {
  if (!idea.topic || !idea.rationale) {
    throw new Error(`Every idea needs a topic and rationale. Got: ${JSON.stringify(idea)}`);
  }
  if (!idea.sourceLinks || !idea.sourceLinks.length) {
    throw new Error(`Idea "${idea.topic}" has no sourceLinks. Every idea must cite a real URL found via web search - never fabricate one.`);
  }
  if (idea.targetService && !VALID_SERVICES.includes(idea.targetService)) {
    throw new Error(`Idea "${idea.topic}" has invalid targetService "${idea.targetService}". Must be one of: ${VALID_SERVICES.join(', ')}`);
  }
  if (idea.draftPost) {
    const { title, meta, bodyHtml, category } = idea.draftPost;
    if (!title || !meta || !bodyHtml) {
      throw new Error(`draftPost for "${idea.topic}" needs title, meta, and bodyHtml.`);
    }
    if (!CATEGORIES.find((c) => c.key === category)) {
      throw new Error(`draftPost for "${idea.topic}" has invalid category "${category}". Must be one of: ${CATEGORIES.map((c) => c.key).join(', ')}`);
    }
    checkInternalLinks(bodyHtml, idea.topic);
    const { errors, warnings } = lintDraft(idea);
    warnings.forEach((w) => console.warn(`WARNING [${title}]: ${w}`));
    if (errors.length) {
      throw new Error(`Content lint failed for "${title}":\n  - ${errors.join('\n  - ')}\nFix the draft and re-run. Nothing was written.`);
    }
  }
}

async function main() {
  const filePath = process.argv.slice(2).find((a) => !a.startsWith('--'));
  const checkOnly = process.argv.includes('--check-only');
  if (!filePath) {
    console.error('Usage: node server/scripts/add-content-ideas.js path/to/ideas.json');
    process.exit(1);
  }

  const ideas = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(ideas)) {
    throw new Error('Expected the JSON file to contain an array of idea objects.');
  }
  ideas.forEach(validate);

  await connectDB();

  const linkProblems = await checkRelatedPostLinks(ideas);
  if (linkProblems.length) {
    await disconnectDB();
    throw new Error(`Related-post link check failed:\n  - ${linkProblems.join('\n  - ')}\nNothing was written.`);
  }
  if (checkOnly) {
    console.log(`Lint passed for ${ideas.length} idea(s). --check-only, nothing written.`);
    await disconnectDB();
    process.exit(0);
  }

  let ideasCreated = 0;
  let ideasSkipped = 0;
  let draftsCreated = 0;
  let draftsSkipped = 0;

  for (const idea of ideas) {
    const exists = await ContentIdea.findOne({ topic: idea.topic });
    if (exists) {
      ideasSkipped++;
      continue;
    }

    const created = await ContentIdea.create({
      topic: idea.topic,
      rationale: idea.rationale,
      targetService: idea.targetService || 'other',
      sourceLinks: idea.sourceLinks,
    });
    ideasCreated++;

    if (idea.draftPost) {
      const category = CATEGORIES.find((c) => c.key === idea.draftPost.category);
      const slug = slugify(idea.draftPost.title);
      const slugTaken = await BlogPost.findOne({ slug });
      if (slugTaken) {
        draftsSkipped++;
        console.log(`Skipped draft for "${idea.topic}": slug "${slug}" already exists.`);
        continue;
      }

      const post = await BlogPost.create({
        slug,
        title: idea.draftPost.title,
        meta: idea.draftPost.meta,
        keyword: idea.draftPost.keyword || '',
        category: category.key,
        categoryLabel: category.label,
        bodyHtml: idea.draftPost.bodyHtml,
        readMins: Number(idea.draftPost.readMins) || 4,
        status: 'draft',
      });
      draftsCreated++;

      created.status = 'drafting';
      created.linkedPost = post._id;
      await created.save();
    }
  }

  console.log(`Content ideas added. Created: ${ideasCreated}, already existed: ${ideasSkipped}.`);
  console.log(`Draft posts added. Created: ${draftsCreated}, skipped (slug conflict): ${draftsSkipped}.`);
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
