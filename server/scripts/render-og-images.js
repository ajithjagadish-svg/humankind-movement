// Renders a 1200x630 branded share card for every published blog post into
// assets/img/og/<slug>.jpg. server/routes/blog.js uses it as og:image and the
// Article schema image when the file exists (falls back to Ajith's portrait).
//
//   node server/scripts/render-og-images.js            # only posts missing a card
//   node server/scripts/render-og-images.js --force    # re-render everything
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { connectDB, disconnectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const OUT_DIR = path.join(__dirname, '..', '..', 'assets', 'img', 'og');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FORCE = process.argv.includes('--force');

const MARK_SVG = '<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect x="398.699219" y="294.300781" width="11.699219" height="59.414063" fill="#1a1a1a"/><rect x="398.699219" y="387" width="11.699219" height="59.414063" fill="#1a1a1a"/><rect x="328.5" y="364.5" width="59.414063" height="11.699219" fill="#c0392b"/><rect x="420.300781" y="364.5" width="59.414063" height="11.699219" fill="#c0392b"/></svg>';

const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function card(post) {
  const len = post.title.length;
  const size = len > 100 ? 46 : len > 70 ? 54 : 64;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:1200px;height:630px;background:#f5ebe1;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Helvetica,Arial,sans-serif;color:#1a1a1a;position:relative;overflow:hidden}
    .orb{position:absolute;width:760px;height:760px;right:-240px;bottom:-330px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#c0392b 0%,rgba(192,57,43,0.32) 42%,transparent 72%);opacity:.5}
    .bar{position:absolute;left:0;top:0;bottom:0;width:14px;background:#c0392b}
    .wrap{position:absolute;inset:0;padding:64px 80px 56px 92px;display:flex;flex-direction:column}
    .kicker{font-size:22px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:#c0392b}
    h1{margin-top:26px;font-size:${size}px;line-height:1.12;font-weight:800;letter-spacing:-.01em;max-width:940px;flex:1;display:flex;align-items:center}
    .foot{display:flex;align-items:center;justify-content:space-between;border-top:2px solid rgba(26,26,26,.14);padding-top:24px}
    .brand{display:flex;align-items:center;gap:14px;font-size:20px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .mark{width:38px;height:38px}
    .url{font-size:20px;font-weight:500;color:#58524a}
  </style></head><body><div class="orb"></div><div class="bar"></div><div class="wrap">
    <div class="kicker">${esc(post.categoryLabel)}</div>
    <h1><span>${esc(post.title)}</span></h1>
    <div class="foot"><div class="brand">${MARK_SVG}<span>Humankind Movement</span></div><div class="url">humankindmovement.in</div></div>
  </div></body></html>`;
}

(async () => {
  await connectDB();
  const posts = await BlogPost.find({ status: 'published' }).select('slug title categoryLabel').lean();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const todo = posts.filter((p) => FORCE || !fs.existsSync(path.join(OUT_DIR, p.slug + '.jpg')));
  console.log(`${posts.length} published, rendering ${todo.length}`);

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  for (const post of todo) {
    await page.setContent(card(post), { waitUntil: 'load' });
    await page.screenshot({ path: path.join(OUT_DIR, post.slug + '.jpg'), type: 'jpeg', quality: 86 });
  }
  await browser.close();
  await disconnectDB();
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
