#!/usr/bin/env node
/*
 * Opens every tab of the admin panel against a THROWAWAY copy of the app and reports problems.
 *
 *   node server/scripts/admin-smoke-test.js [--shots DIR]
 *
 * Safe by construction: all environment variables are stripped (so no real database, GA, or API
 * keys can be reached), the database is an in-memory one, and the login is a generated test
 * account that exists only for this run. Needs Chrome (set CHROME_PATH if it is not the macOS
 * default) and the cached in-memory mongod that `npm run dev` already uses.
 * Run it before and after any change that could touch shared templates, CSS, or tracking, and
 * compare the two outputs: they should be identical. The one expected console message per tab is
 * PostHog saying its token is not configured, because the environment is deliberately empty.
 */
const path = require('path');
const crypto = require('crypto');
const keep = /^(PATH|HOME|TMPDIR|LANG|CHROME_PATH)$/;
for (const k of Object.keys(process.env)) if (!keep.test(k)) delete process.env[k];
process.env.NODE_ENV = 'development';

const puppeteer = require('puppeteer-core');
const { connectDB, disconnectDB } = require('../config/db');
const createApp = require('../app');
const AdminUser = require('../models/AdminUser');

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const TABS = ['/admin/dashboard', '/admin/posts', '/admin/posts/new', '/admin/content-ideas', '/admin/analytics', '/admin/submissions', '/admin/clients', '/admin/clients/new', '/admin/carousels', '/admin/engagement', '/admin/queue', '/admin/queue/new', '/admin/llm-brand'];
const shotsDir = process.argv.includes('--shots') ? path.resolve(process.argv[process.argv.indexOf('--shots') + 1]) : null;

(async () => {
  const uri = await connectDB();
  const email = 'smoke-test@example.test', pw = crypto.randomBytes(12).toString('hex');
  await AdminUser.create({ email, passwordHash: await AdminUser.hashPassword(pw) });
  const server = createApp(uri).listen(0);
  const base = 'http://localhost:' + server.address().port;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(base + '/admin/login', { waitUntil: 'load' });
  await page.type('input[name=email]', email);
  await page.type('input[name=password]', pw);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('button[type=submit], input[type=submit]')]);
  console.log('logged in ->', page.url().replace(base, ''));
  let failed = 0;
  for (const tab of TABS) {
    const errs = [];
    const onErr = (e) => errs.push(e.message); const onCon = (m) => { if (m.type() === 'error') errs.push(m.text()); };
    page.on('pageerror', onErr); page.on('console', onCon);
    const res = await page.goto(base + tab, { waitUntil: 'load', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 400));
    const info = await page.evaluate(() => ({ h1: (document.querySelector('h1') || {}).innerText || '', text: document.body.innerText, hscroll: document.documentElement.scrollWidth > innerWidth }));
    const unexpected = errs.filter((e) => !/POSTHOG_PROJECT_TOKEN/.test(e));
    const bad = /(TypeError|ReferenceError|SyntaxError|Cannot read|is not defined|ENOENT|Internal Server Error|Something went wrong)/.test(info.text);
    const ok = (res.status() === 200 || res.status() === 304) && !bad && !unexpected.length && !info.hscroll && page.url().includes(tab);
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${String(res.status()).padEnd(4)} ${tab.padEnd(24)} h1="${info.h1.slice(0, 36)}"${unexpected.length ? ' errors: ' + unexpected[0].slice(0, 80) : ''}${bad ? ' [error text on page]' : ''}${info.hscroll ? ' [horizontal scroll]' : ''}`);
    if (shotsDir) await page.screenshot({ path: path.join(shotsDir, tab.slice(1).replace(/\//g, '_') + '.png') });
    page.off('pageerror', onErr); page.off('console', onCon);
  }
  await browser.close(); server.close(); await disconnectDB();
  console.log(failed ? `RESULT: ${failed} tab(s) need attention` : `RESULT: all ${TABS.length} admin tabs load cleanly`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('HARNESS ERROR', e); process.exit(2); });
