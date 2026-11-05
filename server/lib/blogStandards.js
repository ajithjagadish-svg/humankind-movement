// The blog standard, in one place. (The step-by-step process around it is in server/lib/BLOG-PROCESS.md.) Used by the admin post editor (template, checklist, publish gate),
// by server/scripts/add-content-ideas.js (the weekly importer) and by server/scripts/add-blog-draft.js.
// Before 2026-11-03 these rules lived only in the importer, so anything made in the admin editor or by a
// one-off script skipped them. Do not copy these rules anywhere else: import this file.
//
// Posts created on or after STANDARDS_START (English only) follow the standard. Older posts are left alone,
// because most of them predate it and re-validating them on every save would break edits and the analytics job.
const fs = require('fs');
const path = require('path');

const STANDARDS_START = new Date('2026-11-03T00:00:00+05:30');
const ROOT = path.join(__dirname, '..', '..');

// Posts that follow the standard: English, created today or later (a post not saved yet counts as created now).
function isStandardsPost(post) {
  if (!post) return false;
  if ((post.locale || 'en') !== 'en') return false;
  if (post.standards === 'v1') return true;
  const created = post.createdAt ? new Date(post.createdAt) : new Date();
  return created >= STANDARDS_START;
}

// ---------------------------------------------------------------------------
// The template a new post starts from. Every {{...}} must be replaced before publishing (the lint blocks it).
// ---------------------------------------------------------------------------
const POST_TEMPLATE_HTML = `<p>{{Open with the reader's situation in two or three short sentences. Then state the finding, with the footnote number right after it.}}<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup> {{Say how big or small the study was and that it is a clue, not a rule.}}</p><h2>What the Study Did</h2><p>{{Who took part, what they did, for how long. Plain words.}}</p><h2>What They Found</h2><p>{{The numbers, turned into something a 10 year old can picture.}}</p><h2>What It Cannot Tell Us</h2><ul><li>{{One honest limit}}</li><li>{{Another limit}}</li></ul><h2>What This Means for You</h2><p>This part is our view, not the study's. {{What we would do and why. Say when to check with a doctor first.}}</p><p>{{One sentence that sends the reader to a related post, for example: Our post on <a href="/blog/RELATED-SLUG">the related topic</a> goes further.}}</p><p><a href="/services/one-to-one-coaching">See how one-to-one coaching works</a></p><div class="footnotes"><ol><li id="fn1">{{Authors. Title. Journal. Year. }}<a href="https://doi.org/{{DOI}}" target="_blank" rel="noopener">doi:{{DOI}}</a>. {{Say what you read: the full text, or the abstract only. List every figure's source.}} <a href="#fnref1">&#8617;</a></li></ol></div>`;

const NOTES_TEMPLATE = `Source read in full (paper, supplementary files):
Grok review (rounds, what was adopted or rejected):
ChatGPT review (rounds, what was adopted or rejected):
Open items before publishing: `;

// What must be ticked before a post goes live. Keys match BlogPost.review.
const REVIEW_ITEMS = [
  { key: 'sources', label: 'Claude read the primary source in full and checked every number, name and quote' },
  { key: 'grok', label: 'Grok reviewed the final text (claims and wording)' },
  { key: 'chatgpt', label: 'ChatGPT reviewed the final text (claims and wording)' },
  { key: 'approved', label: 'Ajith has read the final wording and said yes' },
];

// ---------------------------------------------------------------------------
// Lint. Errors block publishing; warnings need a human look.
// opts.strictLength: the weekly importer wants 500 to 750 words as an error. The admin editor treats more than
// 750 as a warning (a research post can run long on purpose) and more than 1,400 as an error.
// ---------------------------------------------------------------------------
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const countWords = (text) => text.split(/\s+/).filter(Boolean).length;

function lintPost(fields, opts = {}) {
  const errors = [];
  const warnings = [];
  const title = fields.title || '';
  const meta = fields.meta || '';
  const keyword = fields.keyword || '';
  const bodyHtml = fields.bodyHtml || '';
  const text = stripTags(bodyHtml);
  const main = stripTags(bodyHtml.split('<div class="footnotes">')[0]);

  if (!title) errors.push('add a title (45-70 characters)');
  else if (title.length < 45 || title.length > 70) errors.push(`title is ${title.length} chars, must be 45-70`);
  if (!meta) errors.push('add a meta description (120-150 characters)');
  else if (meta.length < 120 || meta.length > 150) errors.push(`meta is ${meta.length} chars, must be 120-150`);
  if (/[—–]|&mdash;|&ndash;|&#8212;|&#8211;/.test(`${title} ${meta} ${bodyHtml}`)) errors.push('contains an em dash or en dash (site-wide rule: use commas or split the sentence)');

  if (keyword) {
    const t = title.toLowerCase();
    const missing = keyword.toLowerCase().split(/\s+/).filter((w) => !t.includes(w.replace(/s$/, '')));
    if (missing.length) errors.push(`keyword "${keyword}" is not in the title (missing: ${missing.join(', ')})`);
  } else {
    warnings.push('no keyword set');
  }

  // Unfinished template text
  if (/\{\{|\}\}|RELATED-SLUG|\bTODO\b/.test(`${title} ${meta} ${bodyHtml}`)) errors.push('unfinished template text is still in the post ({{...}}, RELATED-SLUG or TODO): replace every placeholder');

  // Voice: collective "we", never first-person singular. Quoted text (a reader's own question) is exempt.
  const unquoted = main.replace(/"[^"]*"|“[^”]*”/g, ' ');
  const fp = unquoted.match(/\b(?:I|I'm|I've|I'd|I'll|my|My|me|Me|mine)\b/g);
  if (fp) errors.push(`first-person singular found (${[...new Set(fp)].join(', ')}); use "we" (Ajith's rule, 2026-09-14)`);

  // Weakness framing about a body is never allowed; plain "weak" (e.g. "weak evidence") is only a warning.
  if (/\bweak(?:er|ness|ened)?\b[^.]{0,30}\b(?:core|back|pelvic|floor|glutes?|hips?|abs|abdominal|muscles?|body)\b/i.test(main)
      || /\b(?:core|back|pelvic floor|glutes?|hips?|abs|muscles?)\b[^.]{0,20}\b(?:is|are|was|were)\s+weak/i.test(main)) {
    errors.push('weakness language about a body ("weak core/back/pelvic floor"); frame root cause as coordination, starting with the breath');
  } else if (/\bweak/i.test(main)) {
    warnings.push('the word "weak" appears; make sure it is not describing a body or a person');
  }
  if (/kegel/i.test(main)) warnings.push('mentions Kegels; must never imply we prescribe them (breath first, then coordination)');
  if (/\byoga\b/i.test(main)) warnings.push('mentions yoga; Ajith does not do yoga, so only as a quoted keyword or cliche (never "our yoga")');

  // SEO / AEO / GEO structure
  if ((bodyHtml.match(/<h2>/g) || []).length < 2) errors.push('needs at least 2 <h2> subheadings');
  if (!/<sup class="fn">/.test(bodyHtml) || !/<div class="footnotes">/.test(bodyHtml)) errors.push('needs an inline footnote (<sup class="fn">) and a <div class="footnotes"> block citing the primary source');
  else if (!/<div class="footnotes">[\s\S]*href="https?:\/\//.test(bodyHtml)) errors.push('the footnote must link to the primary source (journal, DOI or official page)');
  if (!/href="\/services\/[a-z-]+"/.test(bodyHtml)) errors.push('needs one link to a /services/<slug> page');
  if (!/href="\/blog\/(?!topics)[a-z0-9-]+"/.test(bodyHtml)) errors.push('needs one link to a related PUBLISHED blog post (/blog/<slug>)');
  for (const m of bodyHtml.matchAll(/href="([^"]+)"/g)) {
    const href = m[1];
    if (/^\/[^"]*\.html(?:[#?]|$)/.test(href)) errors.push(`link "${href}" has .html, but the site serves clean URLs (that page 404s)`);
    if (href.startsWith('/experiences')) errors.push(`link "${href}" points at the retired /experiences page; use /services/<slug>`);
  }

  // Length
  const total = countWords(text);
  if (total < 500) errors.push(`${total} words including citations; minimum 500 (the audit counts posts under 500 words as thin)`);
  if (opts.strictLength) {
    if (total > 750) errors.push(`${total} words including citations; target is about 700 (max 750)`);
  } else if (total > 1400) {
    errors.push(`${total} words including citations; over 1,400 is too long even for a research post`);
  } else if (total > 750) {
    warnings.push(`${total} words including citations; the usual target is about 700. Fine for a research post if every section earns its place`);
  }

  // Plain language: warnings, because judgment is needed.
  const jargon = main.match(/\b(?:pooled|meta-analys[ie]s|randomi[sz]ed|cohort|risk of bias|statistically|cross-sectional|intra-abdominal|inter-recti|doming|significant(?:ly)?)\b/gi);
  if (jargon) warnings.push(`possible jargon a 10 year old would trip on: ${[...new Set(jargon.map((j) => j.toLowerCase()))].join(', ')}`);
  const longSentences = main.split(/(?<=[.?!])\s+/).filter((sent) => countWords(sent) > 28);
  if (longSentences.length) warnings.push(`${longSentences.length} sentence(s) over 28 words, split them: "${longSentences[0].slice(0, 70)}..."`);

  return { errors, warnings, words: total };
}

// Every related-post link must point at a real, published English post.
async function checkRelatedLinks(bodyHtml, BlogPost) {
  const problems = [];
  const slugs = [...(bodyHtml || '').matchAll(/href="\/blog\/(?!topics)([a-z0-9-]+)"/g)].map((m) => m[1]);
  for (const slug of slugs) {
    if (slug === 'RELATED-SLUG') continue;
    const found = await BlogPost.findOne({ slug, status: 'published', locale: 'en' }).select('_id').lean();
    if (!found) problems.push(`the link /blog/${slug} is not a published English post`);
  }
  return problems;
}

// The share card is a file in /assets/img/og (made locally with render-og-images.js --slug=, then committed and
// deployed, because production has no Chrome). A hero image counts as the share image too.
function shareImageExists(post) {
  if (post.heroImage && String(post.heroImage).trim()) return true;
  if (!post.slug) return false;
  return fs.existsSync(path.join(ROOT, 'assets', 'img', 'og', `${post.slug}.jpg`));
}

// Everything that must be true before a standards post goes live.
async function publishProblems(post, BlogPost) {
  const problems = [];
  const lint = lintPost(post);
  problems.push(...lint.errors);
  problems.push(...(await checkRelatedLinks(post.bodyHtml, BlogPost)));
  const review = post.review || {};
  for (const item of REVIEW_ITEMS) if (!review[item.key]) problems.push(`not ticked: ${item.label}`);
  if (!shareImageExists(post)) problems.push(post.slug
    ? `no share image: run "node server/scripts/render-og-images.js --slug=${post.slug}" locally, commit and deploy the card, or set a hero image`
    : 'no share image yet: save the post first (it gets a slug), then render the card locally with render-og-images.js --slug=<slug>, commit and deploy it, or set a hero image');
  return problems;
}

// Everything the editor panel shows for one post.
async function standardsContext(post, BlogPost) {
  if (!isStandardsPost(post)) return { applies: false };
  const lint = lintPost(post);
  const related = await checkRelatedLinks(post.bodyHtml, BlogPost);
  const problems = await publishProblems(post, BlogPost);
  return { applies: true, errors: [...lint.errors, ...related], warnings: lint.warnings, words: lint.words, review: post.review || {}, problems, shareImage: shareImageExists(post), ready: problems.length === 0 };
}

// Where each draft stands, for the dashboard and the posts list. State: 'ready' (publish it), 'approval' (only Ajith's
// yes is missing), 'fix' (something to do first; `next` says what). Runs the checks in parallel.
async function draftReadiness(posts, BlogPost) {
  return Promise.all(posts.map(async (post) => {
    const problems = await publishProblems(post, BlogPost);
    let state = 'fix';
    if (!problems.length) state = 'ready';
    else if (problems.length === 1 && /^not ticked: Ajith/.test(problems[0])) state = 'approval';
    const notYou = problems.filter((x) => !/^not ticked: Ajith/.test(x));
    return { post, state, count: problems.length, next: state === 'fix' ? notYou[0] : state === 'approval' ? 'read the wording, then tick your approval' : 'publish it' };
  }));
}

module.exports = { draftReadiness, STANDARDS_START, isStandardsPost, POST_TEMPLATE_HTML, NOTES_TEMPLATE, REVIEW_ITEMS, lintPost, checkRelatedLinks, shareImageExists, publishProblems, standardsContext };
