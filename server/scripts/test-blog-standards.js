// Quick checks for server/lib/blogStandards.js. Run: node server/scripts/test-blog-standards.js
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const S = require('../lib/blogStandards');

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('ok  ', name); };

const draftPath = path.join(__dirname, '..', '..', 'drafts', 'blog-exercise-pregnancy-mood', 'draft.html');
const raw = fs.existsSync(draftPath) ? fs.readFileSync(draftPath, 'utf8') : null;

ok('the template is blocked until every placeholder is replaced', () => {
  const r = S.lintPost({ title: 'x', meta: 'y', bodyHtml: S.POST_TEMPLATE_HTML });
  assert(r.errors.some((e) => /unfinished template/.test(e)));
  assert(r.errors.some((e) => /title is/.test(e)));
});
ok('the template itself has the structure the lint wants', () => {
  assert((S.POST_TEMPLATE_HTML.match(/<h2>/g) || []).length >= 4);
  assert(/<sup class="fn">/.test(S.POST_TEMPLATE_HTML) && /<div class="footnotes">/.test(S.POST_TEMPLATE_HTML));
  assert(/href="\/services\//.test(S.POST_TEMPLATE_HTML) && /href="\/blog\//.test(S.POST_TEMPLATE_HTML));
});
ok('rules fire: em dash, first person, weakness language, .html and /experiences links', () => {
  const body = '<p>I think your core is weak — see <a href="/about.html">this</a> and <a href="/experiences#x">that</a>.</p>';
  const r = S.lintPost({ title: 'a'.repeat(50), meta: 'b'.repeat(130), bodyHtml: body });
  const all = r.errors.join(' | ');
  assert(/em dash/.test(all) && /first-person/.test(all) && /weakness language/.test(all) && /\.html/.test(all) && /experiences/.test(all));
});
ok('only English posts from 2026-11-03 follow the standard', () => {
  assert.strictEqual(S.isStandardsPost({ locale: 'en', createdAt: '2026-09-01' }), false);
  assert.strictEqual(S.isStandardsPost({ locale: 'en', createdAt: '2026-11-03T10:00:00+05:30' }), true);
  assert.strictEqual(S.isStandardsPost({ locale: 'es', createdAt: '2026-11-04' }), false);
  assert.strictEqual(S.isStandardsPost({ locale: 'en', standards: 'v1', createdAt: '2026-01-01' }), true);
  assert.strictEqual(S.isStandardsPost({ locale: 'en' }), true); // a post not saved yet counts as new
});
if (raw) {
  const title = (raw.match(/<!-- (.*?) -->/) || [])[1];
  const meta = (raw.match(/<!-- meta: (.*?) -->/) || [])[1];
  const bodyHtml = raw.replace(/<!--[\s\S]*?-->/g, '').trim();
  ok('the pregnancy exercise draft passes every rule except the ones still open', () => {
    const r = S.lintPost({ title, meta, keyword: 'guided exercise late pregnancy', bodyHtml });
    console.log('      errors:', JSON.stringify(r.errors), '| warnings:', r.warnings.length, '| words:', r.words);
    assert.strictEqual(r.errors.length, 0, r.errors.join('; '));
  });
}
console.log(`${n} checks passed`);
