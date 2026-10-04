#!/usr/bin/env node
/*
 * Keeps the dollar / pound / euro figures shown next to rupee prices current.
 *
 *   node server/scripts/update-fx-display.js [--dry-run] [--check-only] [--root DIR] [--rates-file FILE] [--message-file FILE]
 *
 *   --check-only  structure checks only (no network, nothing written); used on every pull request
 *
 * Fail-safe by design: every check runs in memory first and nothing is written unless all of
 * them pass. On any problem it exits with code 2 and leaves every file untouched, so the site
 * simply keeps its last good figures. No npm dependencies (Node 18+ only).
 */
const fs = require('fs');
const path = require('path');

const SANITY_INR_PER_USD = [70, 130];
const SOURCE_AGREEMENT_TOLERANCE = 0.02;
const KEEP_IF_WITHIN = 0.65;
const MAX_STEP_CHANGE = 0.25;
const MAX_MOVE_FROM_ANCHOR = 0.10;
const CURRENCIES = ['USD', 'GBP', 'EUR'];
const SYMBOL = { USD: '$', GBP: '£', EUR: '€' };

// Exactly how many times each managed phrase must appear in each file. If a page is edited or
// restructured so the counts no longer match, the run stops instead of guessing.
const MANIFEST = {
  intro: {
    'contact.html': 2, 'index.html': 2, 'movement-coaching-bengaluru.html': 3, 'services/index.html': 2,
  },
  range: {
    'contact.html': 2, 'index.html': 2, 'movement-coaching-bengaluru.html': 3, 'services/one-to-one-coaching.html': 2,
  },
  note: {
    'index.html': 2, 'about.html': 1, 'the-method.html': 1, 'who-we-serve.html': 1,
    'services/index.html': 1, 'services/neurodivergent-coaching.html': 1,
    'services/one-to-one-coaching.html': 1, 'services/postpartum-support.html': 1,
    'server/config/i18n.js': 1,
  },
};
const CONFIG_FILE = 'server/config/fx.json';
const SCAN_DIRS_SKIP = new Set(['node_modules', '.git', 'drafts', 'revenue-dashboard', '.claude', 'ebook-src', 'downloads']);

class Fail extends Error {}
const fail = (m) => { throw new Fail(m); };

const fmtInr = (n) => '₹' + n.toLocaleString('en-US');

function patterns(amounts) {
  const low = fmtInr(amounts.low), high = fmtInr(amounts.high);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    intro: new RegExp(esc(low) + ' \\(about \\$(\\d+)\\)', 'g'),
    range: new RegExp(esc(low) + ' to ' + esc(high) + ' per session \\(roughly \\$(\\d+)(–|&ndash;)\\$(\\d+) / £(\\d+)\\2£(\\d+) / €(\\d+)\\2€(\\d+)\\)', 'g'),
    note: new RegExp(esc(low) + ' is about \\$(\\d+) USD', 'g'),
  };
}

function render(kind, m, d, amounts) {
  const low = fmtInr(amounts.low), high = fmtInr(amounts.high);
  if (kind === 'intro') return `${low} (about $${d.USD[0]})`;
  if (kind === 'note') return `${low} is about $${d.USD[0]} USD`;
  const dash = m[2];
  return `${low} to ${high} per session (roughly $${d.USD[0]}${dash}$${d.USD[1]} / £${d.GBP[0]}${dash}£${d.GBP[1]} / €${d.EUR[0]}${dash}€${d.EUR[1]})`;
}

function cleanText(html) {
  const ent = { '&ndash;': '–', '&mdash;': '—', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ', '&rsquo;': "'", '&lsquo;': "'", '&lt;': '<', '&gt;': '>' };
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#39;/gi, (e) => ent[e.toLowerCase()] ?? e)
    .replace(/\s+/g, ' ').trim();
}

function jsonLdBlocks(html) {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function checkStructuredData(file, html) {
  const visible = cleanText(html);
  for (const raw of jsonLdBlocks(html)) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch (e) { fail(`${file}: JSON-LD no longer parses (${e.message})`); }
    for (const node of Array.isArray(parsed) ? parsed : [parsed]) {
      if (node['@type'] !== 'FAQPage') continue;
      for (const q of node.mainEntity || []) {
        const answer = q.acceptedAnswer && q.acceptedAnswer.text;
        if (!answer || !/(about \$|roughly \$)/.test(answer)) continue;
        if (!visible.includes(cleanText(answer))) fail(`${file}: FAQ answer in JSON-LD does not match the visible page text: "${answer.slice(0, 70)}..."`);
      }
    }
  }
}

function countManaged(files, amounts) {
  const pats = patterns(amounts);
  for (const kind of Object.keys(MANIFEST)) {
    for (const [file, expected] of Object.entries(MANIFEST[kind])) {
      const n = (files[file].match(pats[kind]) || []).length;
      if (n !== expected) fail(`${file}: expected ${expected} "${kind}" figure(s) but found ${n}. The page text changed; update the manifest on purpose before this job can touch it.`);
    }
  }
}

function checkTracking(files) {
  for (const [file, notes] of Object.entries(MANIFEST.note)) {
    if (!file.endsWith('.html')) continue;
    const tracked = (files[file].match(/data-ga-event="book_intro_call_click"/g) || []).length;
    if (tracked !== notes) fail(`${file}: ${tracked} intro-call button(s) with click tracking but ${notes} dollar note(s). The admin Analytics tab counts intro-call clicks through data-ga-event="book_intro_call_click", so every button must keep it.`);
  }
}

function findUnmanagedMentions(root, files, amounts) {
  const pats = patterns(amounts);
  const stray = [];
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SCAN_DIRS_SKIP.has(e.name)) continue;
      const abs = path.join(dir, e.name), r = rel ? rel + '/' + e.name : e.name;
      if (r === 'server/scripts') continue; // tooling, never served to visitors
      if (e.isDirectory()) walk(abs, r);
      else if (/\.(html|ejs|js)$/.test(e.name)) {
        let text = files[r] !== undefined ? files[r] : fs.readFileSync(abs, 'utf8');
        for (const k of Object.keys(pats)) text = text.replace(pats[k], ' ');
        const m = text.match(/₹[\d,]+[^<"\n]{0,45}?[$£€]\d+/g);
        if (m) stray.push(`${r}: ${m[0].slice(0, 80)}`);
      }
    }
  };
  walk(root, '');
  return stray;
}

async function fetchJson(url) {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'user-agent': 'humankindmovement-fx-updater' } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) { last = e; await new Promise((r) => setTimeout(r, 1500 * (i + 1))); }
  }
  throw last;
}

async function liveSources() {
  const providers = [
    ['frankfurter (ECB)', async () => {
      const j = await fetchJson('https://api.frankfurter.dev/v1/latest?base=INR&symbols=USD,GBP,EUR');
      return Object.fromEntries(CURRENCIES.map((c) => [c, j.rates[c]]));
    }],
    ['currency-api', async () => {
      let j;
      try { j = await fetchJson('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/inr.json'); }
      catch (e) { j = await fetchJson('https://latest.currency-api.pages.dev/v1/currencies/inr.json'); }
      return Object.fromEntries(CURRENCIES.map((c) => [c, j.inr[c.toLowerCase()]]));
    }],
    ['open.er-api', async () => {
      const j = await fetchJson('https://open.er-api.com/v6/latest/INR');
      return Object.fromEntries(CURRENCIES.map((c) => [c, j.rates[c]]));
    }],
  ];
  const out = [];
  for (const [name, get] of providers) {
    try { out.push({ name, rates: await get() }); } catch (e) { console.log(`source unavailable: ${name} (${e.message})`); }
  }
  return out;
}

function agreedRates(sources, anchorInrPerUsd) {
  if (!sources || sources.length < 2) fail('fewer than two rate sources responded');
  const out = {};
  for (const c of CURRENCIES) {
    const vals = sources.map((s) => s.rates[c]).filter((v) => typeof v === 'number' && isFinite(v) && v > 0);
    if (vals.length < 2) fail(`fewer than two valid ${c} rates`);
    const agree = (a, b) => Math.abs(a - b) / ((a + b) / 2) <= SOURCE_AGREEMENT_TOLERANCE;
    const keep = new Set();
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) if (agree(vals[i], vals[j])) { keep.add(i); keep.add(j); }
    if (keep.size < 2) fail(`rate sources disagree for ${c}: ${vals.join(' vs ')}`);
    const used = [...keep].map((i) => vals[i]);
    out[c] = used.reduce((a, b) => a + b, 0) / used.length;
  }
  const inrPerUsd = 1 / out.USD;
  if (inrPerUsd < SANITY_INR_PER_USD[0] || inrPerUsd > SANITY_INR_PER_USD[1]) fail(`implausible rate: ${inrPerUsd.toFixed(2)} INR per USD`);
  if (anchorInrPerUsd && Math.abs(inrPerUsd / anchorInrPerUsd - 1) > MAX_MOVE_FROM_ANCHOR) {
    fail(`rate moved more than ${MAX_MOVE_FROM_ANCHOR * 100}% since the figures were last set (${anchorInrPerUsd} -> ${inrPerUsd.toFixed(2)} INR per USD); needs a human look`);
  }
  return out;
}

function nextDisplayed(current, rates, amounts) {
  const next = {};
  for (const c of CURRENCIES) {
    next[c] = [amounts.low, amounts.high].map((amt, i) => {
      const truth = amt * rates[c];
      const cur = current[c][i];
      const value = Math.abs(truth - cur) <= KEEP_IF_WITHIN ? cur : Math.max(1, Math.round(truth));
      if (Math.abs(value - cur) / cur > MAX_STEP_CHANGE) fail(`${c} figure for ${fmtInr(amt)} would jump ${cur} -> ${value} (more than ${MAX_STEP_CHANGE * 100}%); refusing to apply`);
      return value;
    });
    if (!(next[c][0] < next[c][1])) fail(`${c} low figure is not below the high figure`);
  }
  return next;
}

function parseArgs(argv) {
  const a = { dryRun: false, checkOnly: false, root: path.resolve(__dirname, '../..'), ratesFile: null, messageFile: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') a.dryRun = true;
    else if (argv[i] === '--check-only') a.checkOnly = true;
    else if (argv[i] === '--root') a.root = path.resolve(argv[++i]);
    else if (argv[i] === '--rates-file') a.ratesFile = argv[++i];
    else if (argv[i] === '--message-file') a.messageFile = argv[++i];
    else fail('unknown argument ' + argv[i]);
  }
  return a;
}

async function run(argv) {
  const args = parseArgs(argv);
  const cfgPath = path.join(args.root, CONFIG_FILE);
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const amounts = cfg.amountsInr;

  const files = {};
  for (const f of new Set(Object.values(MANIFEST).flatMap((m) => Object.keys(m)))) files[f] = fs.readFileSync(path.join(args.root, f), 'utf8');

  countManaged(files, amounts);
  checkTracking(files);
  const stray = findUnmanagedMentions(args.root, files, amounts);
  if (stray.length) fail('found rupee-with-conversion text the job does not manage (it would go stale):\n  ' + stray.join('\n  '));
  for (const [f, text] of Object.entries(files)) if (f.endsWith('.html')) checkStructuredData(f, text);
  if (args.checkOnly) { console.log('RESULT: structure OK (figure counts, JSON-LD, FAQ text, no unmanaged conversions)'); return 0; }

  const sources = args.ratesFile ? JSON.parse(fs.readFileSync(args.ratesFile, 'utf8')).sources : await liveSources();
  const rates = agreedRates(sources, cfg.anchorInrPerUsd);
  const next = nextDisplayed(cfg.displayed, rates, amounts);

  const summary = CURRENCIES.map((c) => `${c} ${fmtInr(amounts.low)}=${(amounts.low * rates[c]).toFixed(2)} ${fmtInr(amounts.high)}=${(amounts.high * rates[c]).toFixed(2)} shown ${cfg.displayed[c].join('/')}->${next[c].join('/')}`).join(' | ');
  const changed = CURRENCIES.some((c) => next[c].some((v, i) => v !== cfg.displayed[c][i]));
  console.log('sources:', sources.map((s) => s.name).join(', '));
  console.log(summary);
  if (!changed) { console.log('RESULT: no change needed'); return 0; }

  const pats = patterns(amounts);
  const updated = {};
  for (const [file, text] of Object.entries(files)) {
    let out = text;
    for (const kind of Object.keys(MANIFEST)) {
      if (MANIFEST[kind][file]) out = out.replace(pats[kind], (...m) => render(kind, m, next, amounts));
    }
    updated[file] = out;
  }

  const mask = (s) => Object.keys(pats).reduce((acc, k) => acc.replace(pats[k], (m) => m.replace(/([$£€])\d+/g, '$1#')), s);
  for (const f of Object.keys(files)) {
    if (mask(files[f]) !== mask(updated[f])) fail(`${f}: changes went beyond the managed figures`);
    if (f.endsWith('.html')) checkStructuredData(f, updated[f]);
  }
  countManaged(updated, amounts);
  const stillStray = findUnmanagedMentions(args.root, updated, amounts);
  if (stillStray.length) fail('unmanaged conversion text after update: ' + stillStray.join('; '));

  if (args.dryRun) { console.log('RESULT: DRY RUN, would change figures (nothing written)'); return 0; }

  for (const [f, text] of Object.entries(updated)) if (text !== files[f]) fs.writeFileSync(path.join(args.root, f), text);
  cfg.displayed = next;
  cfg.anchorInrPerUsd = Math.round((1 / rates.USD) * 100) / 100;
  cfg.lastChange = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  if (args.messageFile) fs.writeFileSync(args.messageFile, `Refresh currency figures next to rupee prices\n\n${summary.split(' | ').join('\n')}\n\nSources: ${sources.map((s) => s.name).join(' + ')} (agree within ${SOURCE_AGREEMENT_TOLERANCE * 100}%). All checks passed: figure counts, JSON-LD validity, FAQ text matches schema, changes limited to the figures.\n`);
  console.log('RESULT: figures updated');
  return 0;
}

if (require.main === module) {
  run(process.argv.slice(2)).then((c) => process.exit(c)).catch((e) => {
    console.error(e instanceof Fail ? 'STOPPED (nothing was changed): ' + e.message : e);
    process.exit(2);
  });
}
module.exports = { run, patterns, render, liveSources, cleanText, checkStructuredData, agreedRates, nextDisplayed, fmtInr, MANIFEST, CURRENCIES, Fail };
