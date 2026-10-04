// Run with: node --test server/scripts/update-fx-display.test.js
// Copies the real site files to a temp folder and tries good and bad scenarios against them.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
const SCRIPT = path.join(__dirname, 'update-fx-display.js');
const KEEP_EXT = /\.(html|ejs|js|json)$/;
const SKIP = new Set(['node_modules', '.git', '.claude', 'drafts', 'revenue-dashboard', 'ebook-src', 'downloads', 'img']);

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
  return dest;
}

const snapshot = (root, files) => Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(root, f), 'utf8')]));
const TRACKED = ['index.html', 'contact.html', 'about.html', 'services/index.html', 'server/config/i18n.js', 'server/config/fx.json'];

function run(root, rates, extra = []) {
  const rf = path.join(root, '_rates.json');
  fs.writeFileSync(rf, JSON.stringify({ sources: rates }));
  return spawnSync(process.execPath, [SCRIPT, '--root', root, '--rates-file', rf, ...extra], { encoding: 'utf8' });
}
const src = (usd, gbp, eur, name = 'a') => ({ name, rates: { USD: usd, GBP: gbp, EUR: eur } });
const TODAY = [src(0.01038, 0.00786, 0.00925, 'a'), src(0.010396, 0.007853, 0.009238, 'b')];

test('today\'s rates: nothing changes', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, TODAY);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /no change needed/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

// GBP low stays 8 on purpose: 8.605 is inside the 0.65 buffer around the figure already shown.
test('a real move updates every figure everywhere, and a second run is a no-op', () => {
  const root = copyRepo();
  const moved = [src(0.01136, 0.0086, 0.0098, 'a'), src(0.01137, 0.00861, 0.00981, 'b')];
  const r = run(root, moved, ['--message-file', path.join(root, '_msg.txt')]);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /figures updated/);
  const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(idx, /₹1,000 \(about \$11\)/);
  assert.match(idx, /roughly \$11–\$28 \/ £8–£22 \/ €10–€25/);
  assert.match(idx, /roughly \$11&ndash;\$28 \/ £8&ndash;£22 \/ €10&ndash;€25/);
  assert.match(idx, /₹1,000 is about \$11 USD/);
  assert.match(fs.readFileSync(path.join(root, 'server/config/i18n.js'), 'utf8'), /₹1,000 is about \$11 USD/);
  assert.deepStrictEqual(JSON.parse(fs.readFileSync(path.join(root, 'server/config/fx.json'), 'utf8')).displayed, { USD: [11, 28], GBP: [8, 22], EUR: [10, 25] });
  assert.ok(fs.existsSync(path.join(root, '_msg.txt')));
  const again = run(root, moved);
  assert.strictEqual(again.status, 0); assert.match(again.stdout, /no change needed/);
});

test('dry run never writes', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, [src(0.01136, 0.0086, 0.0098), src(0.01137, 0.00861, 0.00981)], ['--dry-run']);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /DRY RUN/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

test('hysteresis: tiny drift past a rounding edge does not flip the figure', () => {
  const root = copyRepo(); const before = snapshot(root, TRACKED);
  const r = run(root, [src(0.01055, 0.00786, 0.00925), src(0.01056, 0.00786, 0.00925)]);
  assert.strictEqual(r.status, 0, r.stderr); assert.match(r.stdout, /no change needed/);
  assert.deepStrictEqual(snapshot(root, TRACKED), before);
});

function mustStop(name, mutate, rates = TODAY, pattern) {
  test('refuses and changes nothing: ' + name, () => {
    const root = copyRepo(); mutate && mutate(root);
    const before = snapshot(root, TRACKED);
    const r = run(root, rates);
    assert.strictEqual(r.status, 2, 'expected a refusal but got: ' + r.stdout + r.stderr);
    assert.match(r.stderr, pattern);
    assert.deepStrictEqual(snapshot(root, TRACKED), before);
  });
}
const edit = (root, file, fn) => { const p = path.join(root, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
// Rates move enough that the script would otherwise change figures, so each refusal below is the check doing its job.
const MOVED = [src(0.01136, 0.0086, 0.0098, 'a'), src(0.01137, 0.00861, 0.00981, 'b')];

mustStop('the two rate sources disagree', null, [src(0.01038, 0.00786, 0.00925, 'a'), src(0.0112, 0.00786, 0.00925, 'b')], /disagree/);
mustStop('implausible exchange rate', null, [src(0.02, 0.0157, 0.0185, 'a'), src(0.02, 0.0157, 0.0185, 'b')], /implausible/);
mustStop('a figure would jump more than 25%', null, [src(0.01038, 0.0105, 0.00925, 'a'), src(0.01039, 0.0105, 0.00925, 'b')], /jump/);
mustStop('a missing rate', null, [{ name: 'a', rates: { USD: 0.0104, GBP: 0.0079 } }, src(0.0104, 0.0079, 0.0092, 'b')], /missing or invalid/);
mustStop('a managed figure disappeared from a page', (root) => edit(root, 'contact.html', (t) => t.replace('₹1,000 (about $10)', '₹1,000')), MOVED, /expected 2 "intro"/);
mustStop('a page FAQ no longer matches its JSON-LD', (root) => edit(root, 'index.html', (t) => t.replace(/(<p>Yes\. A 20-minute introduction call is ₹1,000 \(about \$)10/, '$112')), MOVED, /does not match the visible page text|expected 2 "intro"/);
mustStop('JSON-LD is broken', (root) => edit(root, 'contact.html', (t) => t.replace('"@context": "https://schema.org",', '"@context": "https://schema.org",,')), MOVED, /no longer parses/);
mustStop('a new unmanaged conversion appears somewhere', (root) => fs.writeFileSync(path.join(root, 'new-page.html'), '<p>The workshop is ₹500, about $5 per person.</p>'), MOVED, /does not manage/);
