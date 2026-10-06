#!/usr/bin/env node
/*
 * After the currency job publishes, watch the live site until every managed page serves the new
 * figures, and check each one is still healthy.
 *
 *   node server/scripts/verify-live-site.js --base https://humankindmovement.in [--root DIR]
 *        [--max-minutes 15] [--interval-seconds 30]
 *
 * Exit codes:
 *   0  every page serves the new figures and its structured data is intact
 *   3  a page already serves the new figures but is BROKEN (invalid JSON-LD, or FAQ text no longer
 *      matches its schema). Our change caused it, so the workflow reverts the commit.
 *   4  pages are unreachable or still show old figures when time runs out (deploy slow or not
 *      triggered). Nothing is reverted; the workflow fails so you get an email.
 * Only pages already showing the new figures can count as broken, so an unrelated outage or an
 * unfinished deploy never causes a revert.
 */
const fs = require('fs');
const path = require('path');
const { MANIFEST, patterns, render, checkStructuredData, CURRENCIES } = require('./update-fx-display.js');

const BLOG_PROBE = '/blog/knee-pain-on-stairs';

function fileToUrl(file) {
  const lang = file.match(/^(es|fr)\/(.+)$/);
  if (lang) {
    if (lang[2] === 'index.html') return '/' + lang[1];
    if (lang[2] === 'services/index.html') return '/' + lang[1] + '/services';
    return '/' + lang[1] + '/' + lang[2].replace(/\.html$/, '');
  }
  if (file === 'index.html') return '/';
  if (file === 'services/index.html') return '/services';
  return '/' + file.replace(/\.html$/, '');
}

function managedPages() {
  const pages = new Set();
  for (const kind of Object.keys(MANIFEST)) for (const f of Object.keys(MANIFEST[kind])) if (f.endsWith('.html')) pages.add(f);
  return [...pages];
}

// 'new'    : every managed figure on the page equals the expected one
// 'old'    : page is up but not (fully) showing the new figures yet
function classify(file, html, expected, amounts) {
  const pats = patterns(amounts);
  let sawAny = false;
  for (const kind of Object.keys(MANIFEST)) {
    const want = MANIFEST[kind][file];
    if (!want) continue;
    const ms = [...html.matchAll(pats[kind])];
    if (ms.length !== want) return 'old';
    for (const m of ms) { sawAny = true; if (render(kind, m, expected, amounts) !== m[0]) return 'old'; }
  }
  return sawAny ? 'new' : 'old';
}

function classifyBlog(html, expected, amounts) {
  const m = [...html.matchAll(patterns(amounts).note)];
  return m.length >= 1 && m.every((x) => render('note', x, expected, amounts) === x[0]) ? 'new' : 'old';
}

async function fetchPage(base, url) {
  try {
    const res = await fetch(base + url + (url.includes('?') ? '&' : '?') + '_fxverify=' + Date.now(), { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'humankindmovement-fx-verifier', 'cache-control': 'no-cache' } });
    return { status: res.status, html: res.status === 200 ? await res.text() : '' };
  } catch (e) { return { status: 0, html: '', error: e.message }; }
}

async function evaluate(base, cfg) {
  const expected = Object.fromEntries(CURRENCIES.map((c) => [c, cfg.displayed[c]]));
  const results = [];
  const targets = managedPages().map((f) => ({ file: f, url: fileToUrl(f), blog: false }));
  targets.push({ file: 'blog-probe', url: BLOG_PROBE, blog: true });
  for (const t of targets) {
    const { status, html, error } = await fetchPage(base, t.url);
    if (t.blog && status === 404) { results.push({ ...t, state: 'skipped', detail: 'probe post not found (ignored)' }); continue; }
    if (status !== 200) { results.push({ ...t, state: 'unreachable', detail: error || 'HTTP ' + status }); continue; }
    const fresh = t.blog ? classifyBlog(html, expected, cfg.amountsInr) : classify(t.file, html, expected, cfg.amountsInr);
    if (fresh === 'old') { results.push({ ...t, state: 'old', detail: 'old figures still served' }); continue; }
    try { checkStructuredData(t.url, html); results.push({ ...t, state: 'ok', detail: '' }); }
    catch (e) { results.push({ ...t, state: 'broken', detail: e.message }); }
  }
  return results;
}

function parseArgs(argv) {
  const a = { base: null, root: path.resolve(__dirname, '../..'), maxMinutes: 15, intervalSeconds: 30 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base') a.base = argv[++i].replace(/\/$/, '');
    else if (argv[i] === '--root') a.root = path.resolve(argv[++i]);
    else if (argv[i] === '--max-minutes') a.maxMinutes = Number(argv[++i]);
    else if (argv[i] === '--interval-seconds') a.intervalSeconds = Number(argv[++i]);
  }
  if (!a.base) { console.error('--base is required'); process.exit(1); }
  return a;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = JSON.parse(fs.readFileSync(path.join(args.root, 'server/config/fx.json'), 'utf8'));
  const deadline = Date.now() + args.maxMinutes * 60000;
  let results;
  for (;;) {
    results = await evaluate(args.base, cfg);
    const broken = results.filter((r) => r.state === 'broken');
    for (const r of results) console.log(`${r.state.padEnd(11)} ${r.url}${r.detail ? '  ' + r.detail : ''}`);
    if (broken.length) { console.log('RESULT: BROKEN after update, revert needed'); process.exit(3); }
    if (results.every((r) => r.state === 'ok' || r.state === 'skipped')) { console.log('RESULT: live site verified'); process.exit(0); }
    if (Date.now() >= deadline) { console.log('RESULT: not fully deployed before the time limit'); process.exit(4); }
    console.log('...waiting for the deploy');
    await new Promise((r) => setTimeout(r, args.intervalSeconds * 1000));
  }
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(4); });
module.exports = { classify, fileToUrl, managedPages };
