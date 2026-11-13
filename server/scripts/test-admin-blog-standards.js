#!/usr/bin/env node
/*
 * Exercises the blog standard inside the real admin routes, against a THROWAWAY app: every environment variable is stripped
 * (no real database or keys), the database is in memory, the login is generated for this run only.
 *   node server/scripts/test-admin-blog-standards.js
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const keep = /^(PATH|HOME|TMPDIR|LANG)$/;
for (const k of Object.keys(process.env)) if (!keep.test(k)) delete process.env[k];
process.env.NODE_ENV = 'development';

const assert = require('assert');
const { connectDB, disconnectDB } = require('../config/db');
const createApp = require('../app');
const AdminUser = require('../models/AdminUser');
const BlogPost = require('../models/BlogPost');
const S = require('../lib/blogStandards');

(async () => {
  const uri = await connectDB();
  const email = 'standards-test@example.test', pw = crypto.randomBytes(12).toString('hex');
  await AdminUser.create({ email, passwordHash: await AdminUser.hashPassword(pw) });
  const server = createApp(uri).listen(0);
  const base = 'http://localhost:' + server.address().port;
  let cookie = '';
  const req = async (method, url, form) => {
    const res = await fetch(base + url, {
      method, redirect: 'manual',
      headers: { cookie, ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}) },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const sc = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (sc.length) cookie = sc.map((c) => c.split(';')[0]).join('; ');
    return { status: res.status, location: res.headers.get('location'), text: await res.text() };
  };
  let n = 0; const ok = (name) => { n++; console.log('ok  ', name); };

  const login = await req('POST', '/admin/login', { email, password: pw });
  assert([302, 303].includes(login.status), 'login failed ' + login.status);
  ok('logged in with a generated test account');

  // 1. New post page: template prefilled, checklist and ticks shown
  let r = await req('GET', '/admin/posts/new');
  assert.strictEqual(r.status, 200);
  assert(r.text.includes('What the Study Did') && r.text.includes('Blog standard checklist') && r.text.includes('name="review_grok"'));
  assert(r.text.includes('to fix before publishing'));
  ok('new post starts from the template, with the checklist and the four review boxes');

  // 2. A draft can always be saved, even with template text; we land on the edit page with the checklist
  r = await req('POST', '/admin/posts/new', { title: 'A draft title that is long enough to pass the length rule ok', slug: 'test-standards-draft', category: 'movement', meta: 'm'.repeat(130), keyword: '', readMins: 3, status: 'draft', bodyHtml: S.POST_TEMPLATE_HTML, notes: '' });
  assert([302, 303].includes(r.status), 'draft save failed ' + r.status + r.text.slice(0, 200));
  assert(/\/admin\/posts\/[a-f0-9]{24}\/edit\?saved=1/.test(r.location), r.location);
  const draft = await BlogPost.findOne({ slug: 'test-standards-draft' });
  assert.strictEqual(draft.standards, 'v1');
  ok('a draft saves even while unfinished, flagged as following the standard, and opens on its checklist');

  // 3. Publishing is blocked, with the reasons shown
  const pubForm = (extra = {}) => ({ title: draft.title, slug: draft.slug, category: 'movement', meta: draft.meta, keyword: '', readMins: 3, status: 'published', bodyHtml: draft.bodyHtml, notes: '', ...extra });
  r = await req('POST', `/admin/posts/${draft._id}/edit`, pubForm());
  assert.strictEqual(r.status, 400);
  assert(r.text.includes('Not ready to publish') && r.text.includes('unfinished template text') && r.text.includes('not ticked: Grok') && r.text.includes('no share image'));
  assert.strictEqual((await BlogPost.findById(draft._id)).status, 'draft');
  ok('publishing an unfinished post is blocked: template text, unticked reviews and the missing share image are all named');

  // 4. A finished post with ticks and a share image publishes
  const words = (k) => Array.from({ length: k }, (_, i) => 'word' + (i % 40)).join(' ');
  const finished = `<p>${words(300)}<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p><h2>One</h2><p>${words(150)}</p><h2>Two</h2><p>${words(100)} <a href="/services/one-to-one-coaching">coaching</a> <a href="/blog/related-ok">related</a></p><div class="footnotes"><ol><li id="fn1">Ref <a href="https://doi.org/10.1/x" target="_blank" rel="noopener">doi</a> <a href="#fnref1">&#8617;</a></li></ol></div>`;
  await BlogPost.create({ slug: 'related-ok', title: 'A related published post with a long enough title here', meta: 'm'.repeat(130), category: 'movement', categoryLabel: 'Movement', bodyHtml: '<p>x</p>', status: 'published', publishedAt: new Date(), standards: '' });
  const card = path.join(__dirname, '..', '..', 'assets', 'img', 'og', 'test-standards-draft.jpg');
  fs.writeFileSync(card, 'x');
  try {
    r = await req('POST', `/admin/posts/${draft._id}/edit`, pubForm({ bodyHtml: finished, review_sources: '1', review_grok: '1', review_chatgpt: '1', review_approved: '1' }));
    assert([302, 303].includes(r.status), 'publish failed ' + r.status + ' ' + r.text.replace(/<[^>]+>/g, ' ').slice(0, 400));
    assert.strictEqual((await BlogPost.findById(draft._id)).status, 'published');
    ok('a finished post with all four ticks and a share image publishes');
  } finally { fs.unlinkSync(card); }

  // 5. Posts that predate the standard are untouched: publishing needs nothing extra
  const legacy = await BlogPost.create({ slug: 'legacy-post', title: 'A legacy post that predates the standard with a long title', meta: 'm'.repeat(130), category: 'movement', categoryLabel: 'Movement', bodyHtml: '<p>short old post with no footnote</p>', status: 'draft', standards: '' });
  await BlogPost.collection.updateOne({ _id: legacy._id }, { $set: { createdAt: new Date('2026-08-01') } });
  r = await req('GET', `/admin/posts/${legacy._id}/edit`);
  assert(r.text.includes('predates the blog standard'));
  r = await req('POST', `/admin/posts/${legacy._id}/edit`, { title: legacy.title, slug: legacy.slug, category: 'movement', meta: legacy.meta, keyword: '', readMins: 2, status: 'published', bodyHtml: '<p>short old post with no footnote</p>', notes: '' });
  assert([302, 303].includes(r.status), 'legacy publish blocked: ' + r.text.slice(0, 200));
  assert.strictEqual((await BlogPost.findById(legacy._id)).status, 'published');
  ok('a post from before 3 Nov 2026 is not held to the standard');

  // 6. The posts list shows checklist status for new drafts
  const d2 = await BlogPost.create({ slug: 'second-draft', title: 'A second draft title that is long enough for the rule here', meta: 'm'.repeat(130), category: 'movement', categoryLabel: 'Movement', bodyHtml: '<p>x</p>', status: 'draft' });
  r = await req('GET', '/admin/posts');
  assert(r.status === 200 && /checklist: \d+ to fix/.test(r.text));
  ok('the posts list shows "checklist: n to fix" on new drafts');

  // 7. The dashboard: do-now list, publishing queue (IST day), blog pipeline
  const PublishQueueItem = require('../models/PublishQueueItem');
  const ContactSubmission = require('../models/ContactSubmission');
  r = await req('GET', '/admin/dashboard');
  assert(r.status === 200 && r.text.includes('Nothing needs you right now'), 'empty dashboard should say nothing needs you');
  const istStart = (d) => new Date(Math.floor((Date.now() + 5.5 * 3600e3) / 86400e3) * 86400e3 - 5.5 * 3600e3 + d * 86400e3);
  await PublishQueueItem.create({ title: 'Overdue Reel', scheduledDate: istStart(-2), platforms: [{ name: 'LinkedIn', content: 'x', status: 'queued' }, { name: 'X', content: 'x', status: 'queued' }, { name: 'Instagram', content: 'x', status: 'posted' }] });
  await PublishQueueItem.create({ title: 'Due today carousel', scheduledDate: new Date(istStart(0).getTime() + 3600e3 * 12), platforms: [{ name: 'LinkedIn', content: 'x', status: 'queued' }] });
  await PublishQueueItem.create({ title: 'Far future item', scheduledDate: istStart(20), platforms: [{ name: 'LinkedIn', content: 'x', status: 'queued' }] });
  await PublishQueueItem.create({ title: 'Ancient August item', scheduledDate: istStart(-60), platforms: [{ name: 'LinkedIn', content: 'x', status: 'queued' }, { name: 'X', content: 'x', status: 'queued' }] });
  await ContactSubmission.create({ name: 'Test', email: 'a@b.test', phone: '9999999999', topic: 'other', message: 'hello' });
  r = await req('GET', '/admin/dashboard');
  assert(r.status === 200, 'dashboard ' + r.status);
  assert(/2<\/span> overdue posts still not published/.test(r.text), 'overdue count (queued platforms only)');
  assert(/1<\/span> post due today/.test(r.text), 'due today count');
  assert(r.text.includes('Overdue Reel') && r.text.includes('Due today carousel') && !r.text.includes('Far future item'), 'queue shows overdue and next 3 days only');
  assert(!/<span class="chip">Instagram<\/span>/.test(r.text), 'a platform already posted is not listed');
  assert(/1<\/span> new contact message/.test(r.text));
  assert(!r.text.includes('Ancient August item') && /1<\/span> older queue item/.test(r.text), 'old unposted items are one quiet line, not an overdue alarm');
  ok('the dashboard lists only what needs action: new messages, overdue and due-today platforms, nothing far ahead');
  assert(r.text.includes('A second draft title that is long enough') && /to fix/.test(r.text) && /Next:/.test(r.text), 'the draft shows its state and next step');
  ok('the blog pipeline shows each new-standard draft with its state and next step');

  console.log(`${n} checks passed`);
  server.close(); await disconnectDB(); process.exit(0);
})().catch(async (e) => { console.error('FAILED:', e.message || e); try { await disconnectDB(); } catch (_) {} process.exit(1); });
