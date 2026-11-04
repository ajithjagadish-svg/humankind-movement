// Renders ONE carousel (by id) to PNG slides via headless Chrome, using the same markup/CSS as
// server/views/admin/carousel-editor.ejs, including the optional small-print `note` line.
// Usage (from the repo root): node server/scripts/render-one-carousel.js <carouselId | slides.json> <outFolderName | /absolute/path>
// Output: ~/Desktop/Mind, Body and Soul Work/Social Media/<outFolderName>/slide-N.png (or the absolute path).
// With a .json file ({slides: [...]}) nothing is read from or written to the database, so it can render drafts.
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { connectDB } = require('../config/db');
const Carousel = require('../models/Carousel');

const OUT_ROOT = path.join(os.homedir(), 'Desktop', 'Mind, Body and Soul Work', 'Social Media');
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const MARK_SVG = '<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect class="mv" x="398.699219" y="294.300781" width="11.699219" height="59.414063"/><rect class="mv" x="398.699219" y="387" width="11.699219" height="59.414063"/><rect class="mh" x="328.5" y="364.5" width="59.414063" height="11.699219"/><rect class="mh" x="420.300781" y="364.5" width="59.414063" height="11.699219"/></svg>';
const RING_SVG = '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle class="ring" cx="100" cy="100" r="96"/><circle class="ring" cx="100" cy="100" r="72"/><circle class="ring" cx="100" cy="100" r="48"/><line class="tick" x1="100" y1="4" x2="100" y2="20"/><line class="tick" x1="196" y1="100" x2="180" y2="100"/><line class="tick" x1="100" y1="196" x2="100" y2="180"/><line class="tick" x1="4" y1="100" x2="20" y2="100"/></svg>';

const BG_HTML = {
  none: '',
  orb: '<div class="bg-orb"></div>',
  lines: '<div class="bg-lines">' + RING_SVG + '</div>',
};

const SLIDE_CSS = '<style>' +
  ':root{--paper:#f5ebe1;--ink:#1a1a1a;--muted:#58524a;--accent:#c0392b;--accent-tint:#efd9c9;--dark:#14100d;--dark-ink:#f5ebe1;--dark-accent:#e8b4a0;--line:rgba(26,26,26,0.14);--line-dark:rgba(245,235,225,0.18);--sans:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Helvetica,Arial,sans-serif;}' +
  '*{box-sizing:border-box;margin:0;}' +
  'body{margin:0;}' +
  '.slide{width:540px;height:675px;background:var(--paper);color:var(--ink);position:relative;display:flex;flex-direction:column;padding:44px 46px 36px;overflow:hidden;font-family:var(--sans);}' +
  '.slide.dark{background:var(--dark);color:var(--dark-ink);}' +
  '.slide.cta{background:var(--accent-tint);}' +
  '.row-top{position:relative;z-index:2;display:flex;align-items:baseline;justify-content:space-between;}' +
  '.eyebrow{font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:var(--accent);}' +
  '.slide.dark .eyebrow{color:var(--dark-accent);}' +
  '.counter{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;color:var(--muted);letter-spacing:0.04em;}' +
  '.slide.dark .counter{color:rgba(245,235,225,0.6);}' +
  '.body{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;gap:22px;padding-top:8px;}' +
  'h1{margin:0;font-size:42px;line-height:1.14;font-weight:800;letter-spacing:-0.01em;}' +
  '.sub{margin:0;font-size:19px;line-height:1.5;font-weight:500;color:var(--muted);max-width:42ch;}' +
  '.slide.dark .sub{color:rgba(245,235,225,0.78);}' +
  '.slide.cta .sub{color:#4a3226;}' +
  'ul.points{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:14px;}' +
  'ul.points li{font-size:19px;font-weight:500;line-height:1.4;padding-left:22px;position:relative;color:var(--ink);}' +
  'ul.points li::before{content:"";position:absolute;left:0;top:9px;width:8px;height:8px;border-radius:50%;background:var(--accent);}' +
  '.footer{position:relative;z-index:2;display:flex;align-items:center;justify-content:space-between;padding-top:20px;margin-top:20px;border-top:1px solid var(--line);}' +
  '.slide.dark .footer{border-top-color:var(--line-dark);}' +
  '.brand{display:flex;align-items:center;gap:10px;}' +
  '.mark{width:24px;height:24px;flex-shrink:0;display:block;}' +
  '.mark .mv{fill:var(--ink);}' +
  '.mark .mh{fill:var(--accent);}' +
  '.slide.dark .mark .mv{fill:var(--dark-ink);}' +
  '.slide.dark .mark .mh{fill:var(--dark-accent);}' +
  '.wordmark{font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;}' +
  '.handle{font-size:12.5px;font-weight:500;color:var(--muted);}' +
  '.slide.dark .handle{color:rgba(245,235,225,0.6);}' +
  '.slide.cta .handle{color:#4a3226;}' +
  '.cta-btn{display:inline-block;align-self:flex-start;margin-top:4px;background:var(--ink);color:var(--paper);font-size:15px;font-weight:700;padding:12px 22px;border-radius:100px;}' +
  '.note{position:relative;z-index:2;margin:14px 0 0;font-size:11.5px;line-height:1.45;font-weight:500;color:var(--muted);max-width:48ch;}' +
  '.slide.dark .note{color:rgba(245,235,225,0.62);}' +
  '.slide.cta .note{color:#4a3226;}' +
  '.bg-orb{position:absolute;inset:0;z-index:1;overflow:hidden;}' +
  '.bg-orb::before{content:"";position:absolute;width:var(--orb-size,520px);height:var(--orb-size,520px);right:var(--orb-x,-160px);bottom:var(--orb-y,-180px);border-radius:50%;background:radial-gradient(circle at 35% 35%, var(--accent) 0%, rgba(192,57,43,0.35) 40%, transparent 72%);opacity:0.55;filter:blur(2px);}' +
  '.slide.dark .bg-orb::before{background:radial-gradient(circle at 35% 35%, var(--dark-accent) 0%, rgba(232,180,160,0.28) 40%, transparent 72%);opacity:0.45;}' +
  '.slide.cta .bg-orb::before{background:radial-gradient(circle at 35% 35%, var(--accent) 0%, rgba(192,57,43,0.22) 40%, transparent 72%);opacity:0.35;}' +
  '.bg-lines{position:absolute;inset:0;z-index:1;overflow:hidden;}' +
  '.bg-lines svg{position:absolute;right:-90px;top:-70px;width:460px;height:460px;opacity:0.16;}' +
  '.slide.dark .bg-lines svg{opacity:0.22;}' +
  '.bg-lines .ring{fill:none;stroke:var(--ink);stroke-width:1.4;}' +
  '.slide.dark .bg-lines .ring{stroke:var(--dark-ink);}' +
  '.slide.cta .bg-lines .ring{stroke:var(--ink);}' +
  '.bg-lines .tick{fill:none;stroke:var(--accent);stroke-width:2.4;stroke-linecap:round;}' +
  '.body-photo{align-items:center;text-align:center;justify-content:center;gap:18px;}' +
  '.photo-wrap{width:200px;height:200px;border-radius:50%;overflow:hidden;border:4px solid var(--paper);box-shadow:0 8px 24px -8px rgba(20,16,13,0.35);flex-shrink:0;}' +
  '.slide.dark .photo-wrap{border-color:var(--dark);}' +
  '.slide.cta .photo-wrap{border-color:var(--accent-tint);}' +
  '.photo-wrap img{width:100%;height:100%;object-fit:cover;display:block;}' +
  '.body-photo h1{font-size:34px;}' +
  '.body-photo .sub{max-width:32ch;}' +
  '</style>';

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function slideInnerHtml(data, counter, total) {
  const bgHtml = BG_HTML[data.bgStyle] || '';
  const rowTop = '<div class="row-top"><span class="eyebrow">' + escapeHtml(data.eyebrow) + '</span><span class="counter">' + counter + ' / ' + total + '</span></div>';
  const footer = '<div class="footer"><div class="brand">' + MARK_SVG + '<span class="wordmark">Humankind Movement</span></div><span class="handle">@humankind_movement</span></div>';
  const subHtml = data.sub ? '<p class="sub">' + escapeHtml(data.sub) + '</p>' : '';

  let bulletsHtml = '';
  if (data.bullets && data.bullets.length) {
    bulletsHtml = '<ul class="points">' + data.bullets.map((b) => '<li>' + escapeHtml(b) + '</li>').join('') + '</ul>';
  }
  const ctaHtml = data.ctaBtn ? '<span class="cta-btn">' + escapeHtml(data.ctaBtn) + '</span>' : '';
  const noteHtml = data.note ? '<p class="note">' + escapeHtml(data.note) + '</p>' : '';
  return bgHtml + rowTop +
    '<div class="body"><h1>' + escapeHtml(data.headline) + '</h1>' + subHtml + bulletsHtml + ctaHtml + '</div>' +
    noteHtml + footer;
}

function lerp(a, b, t) { return a + (b - a) * t; }

// Design refresh 2026-09-28: the orb drifts up-and-left and grows across a
// carousel's own slide sequence instead of sitting in a fixed spot on every
// slide ("seamless transition" trend, approved sample vs. progressive-lines).
function orbStyle(i, total) {
  const t = total > 1 ? i / (total - 1) : 0;
  const orbX = lerp(-180, 20, t).toFixed(0) + 'px';
  const orbY = lerp(-200, -420, t).toFixed(0) + 'px';
  const orbSize = lerp(500, 620, t).toFixed(0) + 'px';
  return `--orb-x:${orbX};--orb-y:${orbY};--orb-size:${orbSize};`;
}

function slugToFolder(slug) {
  return 'carousel-' + slug.split('-').slice(0, 6).join('-');
}

async function main() {
  const [carouselId, folderName] = process.argv.slice(2);
  if (!carouselId || !folderName) { console.error('Usage: node server/scripts/render-one-carousel.js <carouselId> <outFolderName>'); process.exit(1); }
  let carousel;
  if (carouselId.endsWith('.json')) {
    carousel = JSON.parse(fs.readFileSync(carouselId, 'utf8'));
  } else {
    await connectDB();
    carousel = await Carousel.findById(carouselId).lean();
    if (!carousel) { console.error('Carousel not found', carouselId); process.exit(1); }
  }
  const outDir = path.isAbsolute(folderName) ? folderName : path.join(OUT_ROOT, folderName);
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 540, height: 675, deviceScaleFactor: 2 });

  const total = carousel.slides.length;
  const libraryDesign = carousel.design && carousel.design !== 'classic';
  for (let i = 0; i < total; i++) {
    if (libraryDesign) {
      // Category designs (server/lib/carouselDesigns) share one renderer with the admin editor.
      const libHtml = require('../lib/carouselDesigns').renderSlidePage(carousel, i, 'file');
      const libPath = path.join(outDir, `.tmp-slide-${i + 1}.html`);
      fs.writeFileSync(libPath, libHtml);
      await page.goto('file://' + libPath, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      fs.unlinkSync(libPath);
      const libEl = await page.$('.s');
      await libEl.screenshot({ path: path.join(outDir, `slide-${i + 1}.png`) });
      continue;
    }
    const slide = carousel.slides[i];
    const slideClass = 'slide' + (slide.variant && slide.variant !== 'default' ? ' ' + slide.variant : '');
    const styleAttr = slide.bgStyle === 'orb' ? ' style="' + orbStyle(i, total) + '"' : '';
    const html = '<!doctype html><html><head><meta charset="utf-8">' + SLIDE_CSS +
      '</head><body><div class="' + slideClass + '"' + styleAttr + '>' + slideInnerHtml(slide, i + 1, total) + '</div></body></html>';
    const tmpHtmlPath = path.join(outDir, `.tmp-slide-${i + 1}.html`);
    fs.writeFileSync(tmpHtmlPath, html);
    await page.goto('file://' + tmpHtmlPath, { waitUntil: 'load' });
    fs.unlinkSync(tmpHtmlPath);
    const el = await page.$('.slide');
    await el.screenshot({ path: path.join(outDir, `slide-${i + 1}.png`) });
  }
  await browser.close();
  console.log('Rendered', total, 'slides ->', outDir);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
