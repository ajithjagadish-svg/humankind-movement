// Run with: node --test server/scripts/update-fx-display.test.js
// Copies the real site files to a temp folder, resets the managed figures to a fixed known state,
// then tries good and bad scenarios. Independent of whatever figures the site shows today.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { spawnSync, spawn } = require('child_process');
const fx = require('./update-fx-display.js');
const { fileToUrl, managedPages } = require('./verify-live-site.js');

const REPO = path.resolve(__dirname, '../..');
const SCRIPT = path.join(__dirname, 'update-fx-display.js');
const VERIFY = path.join(__dirname, 'verify-live-site.js');
const KEEP_EXT = /\.(html|ejs|js|json)$/;
const SKIP = new Set(['node_modules', '.git', '.claude', 'drafts', 'revenue-dashboard', 'ebook-src', 'downloads', 'img']);
const BASE = { USD: [10, 26], GBP: [8, 20], EUR: [9, 23] };
const MANAGED_FILES = [...new Set(Object.values(fx.MANIFEST).flatMap((m) => Object.keys(m)))];

function copyRepo() {
  const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'fx-test-'));
  const walk = (src, dst) => {
    for (const e of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP.has(e.name)) continue;
      const s = path.join(src, e.name), d = path.join(dst, e.name);
      if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); walk(s, d); }
      else if (KEEP_EXT.test(e.name)) fs.copyFileSync(s, d);
    }
  };
  walk(REPO, dest);
  setFigures(dest, BASE);
  return dest;
}

// Put every managed spot, and the config, into a known state.
function setFigures(root, displayed, anchor = 96.3) {
  const cfgPath = path.join(root, 'server/config/fx.json');
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.displayed = displayed; cfg.anchorInrPerUsd = anchor;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  const pats = fx.patterns(cfg.amountsInr);
  for (const f of MANAGED_FILES) {
    const p = path.join(root, f); let t = fs.readFileSync(p, 'utf8');
    for (const kind of Object.keys(fx.MANIFEST)) if (fx.MANIFEST[kind][f]) t = t.replace(pats[kind], (...m) => fx.render(kind, m, displayed, cfg.amountsInr));
    fs.writeFileSync(p, t);
  }
}

const read = (root, f) => fs.readFileSync(path.join(root, f), 'utf8');
const snapshot = (root, files) => Object.fromEntries(files.map((f) => [f, read(root, f)]));
const TRACKED = ['index.html', 'contact.html', 'about.html', 'services/index.html', 'es/index.html', 'fr/services/index.html', 'server/config/i18n.js', 'server/config/fx.json'];
const edit = (root, file, fn) => fs.writeFileSync(path.join(root, file), fn(read(root, file)));

function run(root, sources, extra = []) {
  const rf = path.join(root, '_rates.json');
  fs.writeFileSync(rf, JSON.stringify({ sources }));
  return spawnSync(process.execPath, [SCRIPT, '--root', root, '--rates-file', rf, ...extra], { encoding: 'utf8' });
}
const src = (usd, gbp, eur, name = 'a') => ({ name, rates: { USD: usd, GBP: gbp, EUR: eur } });
const TODAY = [src(0.01038, 0.00786, 0.00925, 'a'), src(0.010396, 0.007853, 0.009238, 'b'), src(0.01040, 0.00787, 0.00924, 'c')];
const MOVED = [src(0.01136, 0.0086, 0.0098, 'a'), src(0.01137, 0.00861, 0.00981, 'b'), src(0.01135, 0.0086, 0.00979, 'c')];

test("today's rates: nothing changes", () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, TODAY);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /no change needed/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

test('a real move updates every figure everywhere, resets the anchor, and a second run is a no-op', () => {
  const root = copyRepo();
  const r = run(root, MOVED, ['--message-file', path.join(root, '_msg.txt')]);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /figures updated/);
  const idx = read(root, 'index.html');
  assert.match(idx, /₹1,000 \(about \$11\)/);
  assert.match(idx, /roughly \$11–\$28 \/ £8–£22 \/ €10–€25/);
  assert.match(idx, /roughly \$11&ndash;\$28 \/ £8&ndash;£22 \/ €10&ndash;€25/);
  assert.match(idx, /₹1,000 is about \$11 USD/);
  assert.match(read(root, 'server/config/i18n.js'), /₹1,000 is about \$11 USD/);
  assert.match(read(root, 'es/index.html'), /₹1\.000 equivalen a unos 11 USD/);
  assert.match(read(root, 'fr/about.html'), /₹1 000, soit environ 11 USD/);
  assert.match(read(root, 'server/config/i18n.js'), /₹1\.000 equivalen a unos 11 USD/);
  assert.match(read(root, 'server/config/i18n.js'), /₹1 000, soit environ 11 USD/);
  const cfg = JSON.parse(read(root, 'server/config/fx.json'));
  assert.deepStrictEqual(cfg.displayed, { USD: [11, 28], GBP: [8, 22], EUR: [10, 25] });
  assert.ok(Math.abs(cfg.anchorInrPerUsd - 87.99) < 0.1, 'anchor should move to the new rate');
  assert.ok(fs.existsSync(path.join(root, '_msg.txt')));
  const again = run(root, MOVED);
  assert.strictEqual(again.status, 0); assert.match(again.stdout, /no change needed/);
});

test('dry run never writes', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, MOVED, ['--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /DRY RUN/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

test('hysteresis: tiny drift past a rounding edge does not flip the figure', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, [src(0.01055, 0.00786, 0.00925), src(0.01056, 0.00786, 0.00925)]);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /no change needed/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

test('three sources: one wrong outlier is ignored when the other two agree', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, [src(0.01038, 0.00786, 0.00925, 'a'), src(0.010396, 0.007853, 0.009238, 'b'), src(0.0131, 0.0098, 0.0113, 'wrong')]);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /no change needed/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

test('check-only passes on healthy pages with no rates at all', () => {
  const root = copyRepo();
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check-only'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /structure OK/);
});

function mustStop(name, mutate, sources, pattern, extra = []) {
  test('refuses and changes nothing: ' + name, () => {
    const root = copyRepo(); mutate && mutate(root);
    const before = snapshot(root, TRACKED);
    const r = run(root, sources, extra);
    assert.strictEqual(r.status, 2, 'expected a refusal but got: ' + r.stdout + r.stderr);
    assert.match(r.stderr, pattern);
    assert.deepStrictEqual(snapshot(root, TRACKED), before);
  });
}
const faqBreak = (t) => t.replace(/(<p>Yes\. A 20-minute introduction call is ₹1,000 \(about \$10\)), a short paid/, '$1, a brief paid');

mustStop('two sources disagree', null, [src(0.01038, 0.00786, 0.00925, 'a'), src(0.0112, 0.00786, 0.00925, 'b')], /disagree/);
mustStop('three sources all disagree', null, [src(0.0100, 0.00786, 0.00925, 'a'), src(0.0105, 0.00786, 0.00925, 'b'), src(0.0110, 0.00786, 0.00925, 'c')], /disagree/);
mustStop('implausible exchange rate', null, [src(0.02, 0.0157, 0.0185, 'a'), src(0.02, 0.0157, 0.0185, 'b')], /implausible/);
mustStop('the rate moved more than 10% from where the figures were last set', null, [src(0.0125, 0.0094, 0.0108, 'a'), src(0.0125, 0.0094, 0.0108, 'b')], /moved more than 10%/);
mustStop('a figure would jump more than 25%', null, [src(0.01038, 0.0105, 0.00925, 'a'), src(0.01039, 0.0105, 0.00925, 'b')], /jump/);
mustStop('only one source answered', null, [src(0.01038, 0.00786, 0.00925, 'a')], /fewer than two/);
mustStop('a rate is missing', null, [{ name: 'a', rates: { USD: 0.0104, GBP: 0.0079 } }, src(0.0104, 0.0079, 0.0092, 'b')], /fewer than two valid EUR/);
mustStop('a managed figure disappeared from a page', (root) => edit(root, 'contact.html', (t) => t.replace('₹1,000 (about $10)', '₹1,000')), MOVED, /expected 2 "intro"/);
mustStop('a page FAQ no longer matches its JSON-LD', (root) => edit(root, 'index.html', faqBreak), MOVED, /does not match the visible page text/);
mustStop('JSON-LD is broken', (root) => edit(root, 'contact.html', (t) => t.replace('"@context": "https://schema.org",', '"@context": "https://schema.org",,')), MOVED, /no longer parses/);
mustStop('a new unmanaged conversion appears somewhere', (root) => fs.writeFileSync(path.join(root, 'new-page.html'), '<p>The workshop is ₹500, about $5 per person.</p>'), MOVED, /does not manage/);
mustStop('the rupee price in the config and the page text disagree', (root) => edit(root, 'server/config/fx.json', (t) => t.replace('"high": 2500', '"high": 3000')), MOVED, /expected 2 "range"/);

test('check-only catches page drift before any rate is looked at', () => {
  const root = copyRepo(); edit(root, 'about.html', (t) => t.replace('₹1,000 is about $10 USD', '₹1,000 is roughly ten dollars'));
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check-only'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2); assert.match(r.stderr, /expected 1 "note"/);
});

test('check-only fails if an intro-call button loses its click tracking (the admin Analytics tab depends on it)', () => {
  const root = copyRepo(); edit(root, 'about.html', (t) => t.replace('data-ga-event="book_intro_call_click"', 'data-ga-event="renamed"'));
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check-only'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2); assert.match(r.stderr, /Analytics tab/);
});

// ---- live-site verifier, against a local stand-in for the website ----
const BLOG = (usd) => `<html><body><p class="price-note">₹1,000 is about $${usd} USD</p><script type="application/ld+json">{"@type":"Article"}</script></body></html>`;

function serve(pages, overrides = {}) {
  const server = http.createServer((req, res) => {
    const u = req.url.split('?')[0];
    if (overrides[u] === 500) { res.writeHead(500); return res.end('err'); }
    const body = overrides[u] !== undefined ? overrides[u] : pages[u];
    if (body === undefined) { res.writeHead(404); return res.end('nf'); }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(body);
  });
  return new Promise((r) => server.listen(0, () => r(server)));
}
function verify(root, port) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [VERIFY, '--root', root, '--base', 'http://localhost:' + port, '--max-minutes', '0.03', '--interval-seconds', '0.1']);
    let out = ''; p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { out += d; });
    p.on('close', (code) => resolve({ code, out }));
  });
}
function liveWorld(newFigures) {
  const root = copyRepo();
  const oldPages = {};
  for (const f of managedPages()) oldPages[fileToUrl(f)] = read(root, f);
  oldPages['/blog/knee-pain-on-stairs'] = BLOG(10);
  if (newFigures) {
    const r = run(root, MOVED); assert.strictEqual(r.status, 0, r.stderr);
  }
  const newPages = {};
  for (const f of managedPages()) newPages[fileToUrl(f)] = read(root, f);
  newPages['/blog/knee-pain-on-stairs'] = BLOG(11);
  return { root, oldPages, newPages };
}

test('verifier: everything deployed and healthy -> success', async () => {
  const w = liveWorld(true); const s = await serve(w.newPages);
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 0, r.out); assert.match(r.out, /live site verified/);
});

test('verifier: site still serves old figures -> "not deployed", never "broken"', async () => {
  const w = liveWorld(true); const s = await serve(w.oldPages);
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 4, r.out); assert.match(r.out, /not fully deployed/);
});

test('verifier: a page is down -> "not deployed", no revert', async () => {
  const w = liveWorld(true); const s = await serve(w.newPages, { '/about': 500 });
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 4, r.out);
});

test('verifier: new figures served but structured data broken -> BROKEN (triggers revert)', async () => {
  const w = liveWorld(true);
  const broken = w.newPages['/contact'].replace('"@context": "https://schema.org",', '"@context": "https://schema.org",,');
  const s = await serve(w.newPages, { '/contact': broken });
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 3, r.out); assert.match(r.out, /BROKEN/);
});

test('verifier: new figures served but FAQ text no longer matches its schema -> BROKEN', async () => {
  const w = liveWorld(true);
  const mismatched = w.newPages['/'].replace(/(<p>Yes\. A 20-minute introduction call is ₹1,000 \(about \$11\)), a short paid/, '$1, a brief paid');
  assert.notStrictEqual(mismatched, w.newPages['/']);
  const s = await serve(w.newPages, { '/': mismatched });
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 3, r.out);
});

test('verifier: an old page that was already imperfect is never blamed on us', async () => {
  const w = liveWorld(true);
  const oldBroken = w.oldPages['/contact'].replace('"@context": "https://schema.org",', '"@context": "https://schema.org",,');
  const s = await serve(w.oldPages, { '/contact': oldBroken });
  const r = await verify(w.root, s.address().port); s.close();
  assert.strictEqual(r.code, 4, r.out);
});

// ---- watchdog ----
const { evaluate } = require('./check-fx-freshness.js');
const NOW = Date.parse('2026-10-20T00:00:00Z');
const RATES_OK = { USD: 0.0104, GBP: 0.00787, EUR: 0.00924 };
const run1 = (daysAgo, conclusion = 'success', event = 'schedule') => ({ event, conclusion, created_at: new Date(NOW - daysAgo * 86400000).toISOString() });
const watch = (over = {}) => evaluate({ liveHtml: read(copyRepo(), 'index.html'), rates: RATES_OK, amounts: { low: 1000, high: 2500 }, runs: [run1(4)], now: NOW, ...over });

test('watchdog: healthy site and a recent good run -> no problems', () => assert.deepStrictEqual(watch(), []));
test('watchdog: live figures are stale against today\'s rates', () => {
  const p = watch({ rates: { USD: 0.0125, GBP: 0.0094, EUR: 0.0108 } });
  assert.ok(p.some((m) => /USD figure/.test(m)), p.join('; '));
});
test('watchdog: the scheduled job has not run for too long', () => assert.ok(watch({ runs: [run1(30)] }).some((m) => /no successful scheduled refresh run/.test(m))));
test('watchdog: the job never ran at all', () => assert.ok(watch({ runs: [] }).some((m) => /none found/.test(m))));
test('watchdog: the latest scheduled run failed', () => assert.ok(watch({ runs: [run1(2, 'failure'), run1(17)] }).some((m) => /ended "failure"/.test(m))));
test('watchdog: manual runs do not count as the schedule running', () => assert.ok(watch({ runs: [run1(1, 'success', 'workflow_dispatch')] }).some((m) => /no successful scheduled/.test(m))));
test('watchdog: run history unreadable is flagged, not ignored', () => assert.ok(watch({ runs: null }).some((m) => /could not read the GitHub run history/.test(m))));
test('watchdog: a page whose wording changed is flagged', () => assert.ok(watch({ liveHtml: '<p>no prices here</p>' }).some((m) => /no longer shows/.test(m))));

test('a Spanish or French note that drifts out of its wording is caught by the structure check', () => {
  for (const [file, from, to] of [['es/about.html', 'equivalen a unos', 'son aproximadamente'], ['fr/the-method.html', 'soit environ', 'environ']]) {
    const root = copyRepo(); edit(root, file, (t) => t.replace(from, to));
    const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check-only'], { encoding: 'utf8' });
    assert.strictEqual(r.status, 2, file); assert.match(r.stderr, /noteEs|noteFr/);
  }
});

test('a stray "<n> USD" conversion next to a rupee price, in any language, is flagged as unmanaged', () => {
  const root = copyRepo(); fs.writeFileSync(path.join(root, 'new-page.html'), '<p>El taller cuesta ₹500, unos 5 USD.</p>');
  const r = spawnSync(process.execPath, [SCRIPT, '--root', root, '--check-only'], { encoding: 'utf8' });
  assert.strictEqual(r.status, 2); assert.match(r.stderr, /does not manage/);
});
