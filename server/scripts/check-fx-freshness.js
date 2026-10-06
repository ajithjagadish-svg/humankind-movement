#!/usr/bin/env node
/*
 * Independent watchdog for the currency refresh. It does not trust the refresh job: it looks at what
 * the LIVE site shows right now, compares it with today's exchange rates, and checks that the
 * scheduled GitHub run actually happened recently. This is what catches "the job silently never ran".
 *
 *   node server/scripts/check-fx-freshness.js [--base https://humankindmovement.in]
 *
 * Prints a short report and ends with "VERDICT: OK" (exit 0) or "VERDICT: PROBLEM ..." (exit 1).
 */
const fs = require('fs');
const path = require('path');
const { patterns, agreedRates, liveSources, CURRENCIES } = require('./update-fx-display.js');

const REPO_SLUG = 'ajithjagadish-svg/humankind-movement';
const WORKFLOW = 'refresh-currency-figures.yml';
const STALE_IF_OFF_BY = 1.0;
const MAX_DAYS_SINCE_GOOD_RUN = 20;

// Pure function so it can be tested without any network.
function evaluate({ liveHtml, rates, amounts, runs, now }) {
  const problems = [];
  const pats = patterns(amounts);

  const range = [...liveHtml.matchAll(pats.range)][0];
  const note = [...liveHtml.matchAll(pats.note)][0];
  if (!range || !note) problems.push('the live homepage no longer shows the dollar note or the price range in the expected wording');
  else {
    const shown = {
      USD: [Number(range[1]), Number(range[3])],
      GBP: [Number(range[4]), Number(range[5])],
      EUR: [Number(range[6]), Number(range[7])],
    };
    for (const c of CURRENCIES) {
      [amounts.low, amounts.high].forEach((amt, i) => {
        const truth = amt * rates[c];
        if (Math.abs(truth - shown[c][i]) > STALE_IF_OFF_BY) problems.push(`${c} figure for ₹${amt.toLocaleString('en-US')} shows ${shown[c][i]} but today's rate says ${truth.toFixed(2)}`);
      });
    }
    if (Number(note[1]) !== shown.USD[0]) problems.push(`the homepage note says $${note[1]} but the FAQ range starts at $${shown.USD[0]}`);
  }

  if (runs === null) problems.push('could not read the GitHub run history for the refresh workflow (is it merged and enabled?)');
  else {
    const scheduled = runs.filter((r) => r.event === 'schedule');
    const good = scheduled.filter((r) => r.conclusion === 'success');
    const newestGood = good.map((r) => new Date(r.created_at).getTime()).sort((a, b) => b - a)[0];
    const days = newestGood ? (now - newestGood) / 86400000 : Infinity;
    if (days > MAX_DAYS_SINCE_GOOD_RUN) problems.push(`no successful scheduled refresh run in the last ${MAX_DAYS_SINCE_GOOD_RUN} days (last good run: ${newestGood ? days.toFixed(1) + ' days ago' : 'none found'})`);
    const latest = scheduled.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (latest && latest.conclusion && latest.conclusion !== 'success') problems.push(`the most recent scheduled run ended "${latest.conclusion}"`);
  }
  return problems;
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'humankindmovement-fx-watchdog', accept: 'application/vnd.github+json' } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return res.json();
}

async function main() {
  const i = process.argv.indexOf('--base');
  const base = (i > -1 ? process.argv[i + 1] : 'https://humankindmovement.in').replace(/\/$/, '');
  const cfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../config/fx.json'), 'utf8'));

  const liveHtml = await (await fetch(base + '/?_fxwatch=' + Date.now(), { signal: AbortSignal.timeout(20000) })).text();
  const rates = agreedRates(await liveSources());
  let runs = null;
  try { runs = (await getJson(`https://api.github.com/repos/${REPO_SLUG}/actions/workflows/${WORKFLOW}/runs?per_page=20`)).workflow_runs; } catch (e) { console.log('run history unavailable: ' + e.message); }

  const problems = evaluate({ liveHtml, rates, amounts: cfg.amountsInr, runs, now: Date.now() });
  console.log(`checked ${base} against today's rates (USD ${(1 / rates.USD).toFixed(2)} INR per $1)`);
  if (runs) console.log('recent scheduled runs: ' + (runs.filter((r) => r.event === 'schedule').slice(0, 3).map((r) => `${r.created_at.slice(0, 10)} ${r.conclusion || r.status}`).join(', ') || 'none'));
  if (problems.length) { console.log('VERDICT: PROBLEM'); problems.forEach((p) => console.log(' - ' + p)); process.exit(1); }
  console.log('VERDICT: OK');
}

if (require.main === module) main().catch((e) => { console.log('VERDICT: PROBLEM'); console.log(' - the watchdog itself could not finish: ' + e.message); process.exit(1); });
module.exports = { evaluate };
