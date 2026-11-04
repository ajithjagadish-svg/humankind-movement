// One-off: replace the copy of the "Companies Are Finally Building Recovery
// Into the Workday, Not Bolting It On" carousel with the plain-language
// six-slide version, re-render the slides, and CHECK (never edit) the matching
// publish-queue item.
//
//   node server/scripts/rewrite-recovery-carousel.js            # preview (default)
//   node server/scripts/rewrite-recovery-carousel.js --apply    # after you have said OK
//
// PREVIEW (default) is read-only against the database. It:
//   1. writes date-stamped *BACKUP.json files for the carousel + queue item
//   2. prints before/after slide text, the queue item's captions, and any
//      caption line that looks inconsistent with the new slides
//   Nothing is changed in Mongo and no PNG is touched.
//
// --apply (asks you to type "yes"):
//   1. fresh backups
//   2. renders the 6 new slides with html2canvas (the same code path as the
//      "Download all as PNG" button in /admin/carousels/:id/edit, run in
//      headless Chrome) into a staging folder - nothing is replaced yet
//   3. updates ONLY the carousel's `slides` field
//   4. moves the old slide-N.png files to the macOS Trash (Finder, so they are
//      recoverable) and copies the new ones into the Desktop folder
//   It never touches the queue item, scheduled times, or any other record,
//   and never posts anything.
require('dotenv').config();
const fs = require('fs');
const os = require('os');
const path = require('path');
const readline = require('readline');
const { execFileSync } = require('child_process');
const mongoose = require('mongoose');
const Carousel = require('../models/Carousel');
const PublishQueueItem = require('../models/PublishQueueItem');

const APPLY = process.argv.includes('--apply');
const TITLE = 'Companies Are Finally Building Recovery Into the Workday, Not Bolting It On';
const QUEUE_ID = '6aba2ee6b07868f68a2ddc66';
const IMG_DIR = path.join(os.homedir(), 'Desktop', 'Mind, Body and Soul Work', 'Social Media', TITLE);
const BACKUP_DIR = path.join(os.homedir(), 'Desktop', 'carousel-test', 'claude');
const CHROME_PATH = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EDITOR_EJS = path.join(__dirname, '..', 'views', 'admin', 'carousel-editor.ejs');

// headline + sub only; eyebrow / variant / bgStyle / ctaBtn / photo are carried
// over from the existing slide at the same position (see buildNewSlides).
const NEW_COPY = [
  { headline: 'Do short breaks help people work better?',
    sub: 'A 2022 review looked at 22 groups of workers, 2,335 people. Here is what it found.' },
  { headline: 'You feel better.',
    sub: 'After a short break, people had a little more energy and felt less tired. The effect was small, but it was there.' },
  { headline: 'Do you get more done? Not clearly.',
    sub: 'Across all kinds of work, the change in output was too small to be sure of.' },
  { headline: 'Easy tasks were the exception.',
    sub: 'On simpler, less demanding tasks, breaks did seem to help the work itself. Longer breaks did a bit better than very short ones.' },
  { headline: 'Our view: a quiet room is not enough.',
    sub: 'Space only helps if people know how to use it, and know it is OK to use it mid-day. Sitting there rehearsing your next meeting is not recovery.' },
  { headline: 'Start with when your energy drops.',
    sub: 'A first call with us is about when your energy drops in your day. Then we run a workshop on how to use a short break. Comment RECOVERY, or use the link in bio. Source: Albulescu et al., PLoS One, 2022.' },
];

// Phrases that would contradict or pre-date the new slides. Flags only.
const CAPTION_FLAGS = [
  [/\b22\s+studies\b/i, 'says "22 studies" (must be "22 groups of workers")'],
  [/\bpooled\b/i, 'researcher word "pooled"'],
  [/overall effect/i, 'researcher phrase "overall effect"'],
  [/work output/i, 'researcher phrase "work output"'],
  [/\bmeta-?analysis\b/i, 'says meta-analysis (slides say "review"; fine if accurate, check tone)'],
  [/longer breaks?[^.]*(energy|vigor|tired)/i, 'ties longer breaks to energy (slides tie longer breaks to performance only)'],
  [/(boost|improv|increas)\w*\s+(your\s+)?(performance|productivity|output)/i, 'promises a performance gain (slides say not clearly)'],
  [/\b(guarantee|proven|will\s+(boost|improve|increase))\b/i, 'outcome promise'],
  [/[₹$€£]\s?\d|\b\d+\s?(rs|inr|usd)\b/i, 'contains a price'],
  [/RECOVERY/, 'mentions RECOVERY keyword (slide 6 uses it - confirm it matches)'],
];

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function writeBackup(label, id, doc) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${label}-${id}-${stamp()}-BACKUP.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2), { flag: 'wx' });
  return file;
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((res) => rl.question(q, (a) => { rl.close(); res(a.trim()); }));
}

function buildNewSlides(oldSlides) {
  return NEW_COPY.map((c, i) => {
    const old = (oldSlides && oldSlides[i]) || {};
    return {
      eyebrow: old.eyebrow || '',
      headline: c.headline,
      sub: c.sub,
      bullets: [],
      chatBubbles: [],
      variant: old.variant || 'default',
      ctaBtn: old.ctaBtn || '',
      bgStyle: old.bgStyle || 'none',
      photo: '',
    };
  });
}

function showSlides(slides) {
  (slides || []).forEach((s, i) => {
    console.log(`  ${i + 1}. [${s.eyebrow || '-'}] ${s.headline}`);
    if (s.sub) console.log(`       ${s.sub}`);
    (s.bullets || []).forEach((b) => console.log(`       • ${b}`));
    (s.chatBubbles || []).forEach((b) => console.log(`       (${b.from}) ${b.text}`));
    console.log(`       variant=${s.variant} bg=${s.bgStyle}${s.ctaBtn ? ` ctaBtn="${s.ctaBtn}"` : ''}${s.photo ? ` photo=${s.photo}` : ''}`);
  });
}

// Pull the editor's own slide CSS + slideInnerHtml out of the .ejs so the
// render uses the project's template rather than a copy that can drift.
function extractRendererSource() {
  const src = fs.readFileSync(EDITOR_EJS, 'utf8');
  const start = src.indexOf('var MARK_SVG');
  const end = src.indexOf('// Chat-bubble lines are entered');
  if (start < 0 || end < 0 || end < start) {
    throw new Error('Could not find the slide renderer in carousel-editor.ejs - the file has changed. Aborting.');
  }
  return src.slice(start, end);
}

async function renderSlides(slides, outDir) {
  const puppeteer = require('puppeteer-core');
  if (!fs.existsSync(CHROME_PATH)) throw new Error(`Chrome not found at ${CHROME_PATH} (set CHROME_PATH).`);
  const rendererSrc = extractRendererSource();
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 700, height: 800, deviceScaleFactor: 1 });
    await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0"><div id="stage"></div></body></html>');
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js' });
    await page.evaluate((code) => { new Function(code + '\nwindow.__slideInnerHtml = slideInnerHtml;')(); }, rendererSrc);
    for (let i = 0; i < slides.length; i++) {
      const dataUrl = await page.evaluate(async (data, idx, total) => {
        const stage = document.getElementById('stage');
        stage.innerHTML = '<div class="slide' + (data.variant !== 'default' ? ' ' + data.variant : '') + '"></div>';
        const el = stage.firstChild;
        el.innerHTML = window.__slideInnerHtml(data, idx + 1, total);
        if (document.fonts && document.fonts.ready) await document.fonts.ready;
        const canvas = await html2canvas(el, { scale: 2, width: 540, height: 675 });
        return canvas.toDataURL('image/png');
      }, slides[i], i, slides.length);
      fs.writeFileSync(path.join(outDir, `slide-${i + 1}.png`), Buffer.from(dataUrl.split(',')[1], 'base64'));
    }
  } finally {
    await browser.close();
  }
  for (let i = 1; i <= slides.length; i++) {
    const f = path.join(outDir, `slide-${i}.png`);
    if (!fs.existsSync(f) || fs.statSync(f).size < 5000) throw new Error(`Render looks wrong: ${f}`);
  }
}

function moveToTrash(file) {
  if (process.platform !== 'darwin') throw new Error('Trash step needs macOS (Finder).');
  const esc = file.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  execFileSync('osascript', ['-e', `tell application "Finder" to delete POSIX file "${esc}"`]);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    // Deliberately NOT using connectDB(): it silently falls back to a
    // throwaway in-memory DB, which would "succeed" against empty data.
    throw new Error('MONGODB_URI is not set (expected in .env). Refusing to continue.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    console.log(`Connected to database "${mongoose.connection.name}" on ${mongoose.connection.host}`);

    const matches = await Carousel.find({ title: TITLE }).lean();
    if (matches.length !== 1) {
      throw new Error(`Expected exactly 1 carousel titled "${TITLE}", found ${matches.length}. Nothing done.`);
    }
    const carousel = matches[0];
    const queueItem = await PublishQueueItem.findById(QUEUE_ID).lean();
    if (!queueItem) throw new Error(`Queue item ${QUEUE_ID} not found. Nothing done.`);

    console.log('\n== Backups ==');
    console.log('  ' + writeBackup('carousel', carousel._id, carousel));
    console.log('  ' + writeBackup('queue-item', QUEUE_ID, queueItem));

    const newSlides = buildNewSlides(carousel.slides);

    console.log(`\n== Carousel ${carousel._id} ("${carousel.title}", status=${carousel.status}) ==`);
    if (carousel.status === 'posted') console.log('  !! status is "posted" - check before applying.');
    console.log('\n-- BEFORE --');
    showSlides(carousel.slides);
    console.log('\n-- AFTER --');
    showSlides(newSlides);

    console.log('\n== Heads-up on things the template cannot express ==');
    const oldText = JSON.stringify(carousel.slides || []).toLowerCase();
    console.log(`  • "swipe →" cue: ${/swipe/.test(oldText) ? 'present in the old slides (check where; only ctaBtn is carried over)' : 'not found in the old slide data'}. The editor has no swipe field.`);
    console.log('  • Heartbeat line: the editor offers bgStyle none/orb/lines (rings). No heartbeat element or per-slide "nearly flat" setting exists in this repo.');
    console.log('  • Source line on slide 6 is appended to the sub text (no separate field).');
    if ((carousel.slides || []).length !== NEW_COPY.length) {
      console.log(`  • Old carousel has ${(carousel.slides || []).length} slides, new one has ${NEW_COPY.length}; extra positions get default variant/background.`);
    }

    console.log(`\n== Queue item ${QUEUE_ID} (READ-ONLY) ==`);
    console.log(`  title: ${queueItem.title}`);
    console.log(`  scheduledDate: ${new Date(queueItem.scheduledDate).toISOString()}  sourceType=${queueItem.sourceType}  sourceId=${queueItem.sourceId || '-'}`);
    const linked = String(queueItem.sourceId || '') === String(carousel._id);
    console.log(`  linked to this carousel: ${linked ? 'yes' : 'NO (sourceId differs) - check you have the right item'}`);
    if (queueItem.notes) console.log(`  notes: ${queueItem.notes}`);
    for (const p of queueItem.platforms || []) {
      console.log(`\n  --- ${p.name} [${p.status}] ---`);
      console.log(p.content.split('\n').map((l) => '  | ' + l).join('\n'));
      const hits = [];
      p.content.split('\n').forEach((line, n) => {
        for (const [re, why] of CAPTION_FLAGS) if (re.test(line)) hits.push(`line ${n + 1}: ${why}  -> "${line.trim().slice(0, 100)}"`);
      });
      console.log(hits.length ? hits.map((h) => '  ⚠ ' + h).join('\n') : '  (no automatic flags)');
    }
    console.log('\n  Automatic flags are keyword checks only. Read the captions against the new slides yourself.');
    console.log('  Captions are NOT edited by this script.');

    if (!APPLY) {
      console.log('\nPreview only. Nothing in the database or on the Desktop was changed (other than the backup files above).');
      console.log('When you are happy, re-run with --apply.');
      return;
    }

    console.log(`\n== APPLY ==\nImages folder: ${IMG_DIR}`);
    if (await ask('Type "yes" to update the carousel record, render new slides, and Trash the old PNGs: ') !== 'yes') {
      console.log('Cancelled. Nothing changed.');
      return;
    }
    if (!fs.existsSync(IMG_DIR)) throw new Error(`Images folder not found: ${IMG_DIR}`);

    // Fresh backup right before the write.
    console.log('  backup: ' + writeBackup('carousel-pre-apply', carousel._id, await Carousel.findById(carousel._id).lean()));

    // Render first, into staging. If this fails nothing has been changed.
    const staging = path.join(BACKUP_DIR, `render-${stamp()}`);
    console.log(`  rendering to ${staging} ...`);
    await renderSlides(newSlides, staging);

    // Update ONLY slides. Guard on the old updatedAt so we don't clobber an edit made meanwhile.
    const res = await Carousel.updateOne(
      { _id: carousel._id, updatedAt: carousel.updatedAt },
      { $set: { slides: newSlides } }
    );
    if (res.matchedCount !== 1) throw new Error('Carousel changed since preview; not updated. Re-run preview.');
    console.log('  carousel slides updated.');

    for (let i = 1; i <= NEW_COPY.length; i++) {
      const dest = path.join(IMG_DIR, `slide-${i}.png`);
      if (fs.existsSync(dest)) { moveToTrash(dest); console.log(`  trashed old slide-${i}.png`); }
      fs.copyFileSync(path.join(staging, `slide-${i}.png`), dest);
    }
    console.log(`\nDone. New slides are in ${IMG_DIR} (copies also in ${staging}).`);
    console.log('Nothing was published, scheduled or posted; the queue item was not touched.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((err) => { console.error('\nERROR:', err.message); process.exit(1); });
