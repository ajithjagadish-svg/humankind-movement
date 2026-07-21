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
  }
}

async function main() {
  const filePath = process.argv[2];
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
