// Renders a 1080x1920 (Story-sized) quote card in the same brand tokens as
// render-og-images.js: cream bg #f5ebe1, red accent #c0392b, dark text #1a1a1a.
// One card per line in QUOTES below. Each line is either something Ajith has
// already said publicly (site tagline, a blog/carousel line) or an external
// quote with attribution — never invented, never unattributed borrowing.
//
//   node server/scripts/render-quote-story.js            # renders all, skips existing
//   node server/scripts/render-quote-story.js --force    # re-renders everything
//   node server/scripts/render-quote-story.js --only=0   # renders just QUOTES[0], for previewing one
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const OUT_DIR = path.join(__dirname, '..', '..', 'assets', 'img', 'stories');
// Ajith posts these manually from his own machine, not from the repo checkout,
// so every render also gets copied here (2026-09-22). Desktop path only exists
// on his Mac - copy is best-effort and never fails the render itself.
const DESKTOP_DIR = path.join(
  process.env.HOME || '',
  'Desktop', 'Mind, Body and Soul Work', 'Social Media', 'stories-quote-cards'
);
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FORCE = process.argv.includes('--force');
const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const ONLY = onlyArg ? Number(onlyArg.slice(7)) : null;

const MARK_SVG = '<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect x="398.699219" y="294.300781" width="11.699219" height="59.414063" fill="#1a1a1a"/><rect x="398.699219" y="387" width="11.699219" height="59.414063" fill="#1a1a1a"/><rect x="328.5" y="364.5" width="59.414063" height="11.699219" fill="#c0392b"/><rect x="420.300781" y="364.5" width="59.414063" height="11.699219" fill="#c0392b"/></svg>';
const esc = (s) => (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// slug: filename. text: the line. source: 'ajith' (his own words, already published
// somewhere) or a real attributed author. where: internal note on where it's from,
// for Ajith's review only, not rendered on the card.
const QUOTES = [
  {
    slug: 'health-before-success',
    text: 'Health before success. Awareness before action.',
    source: 'ajith',
    where: 'Humankind Movement LinkedIn Page tagline (verified live 2026-09-22)',
  },
  {
    slug: 'recovery-is-a-capacity',
    text: 'Recovery is a capacity, not a gap in the schedule.',
    source: 'ajith',
    where: 'Blog: recovery-is-a-skill (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'success-is-peace-of-mind',
    text: 'Success is peace of mind.',
    source: 'ajith',
    where: 'Blog: health-before-success (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'poor-sleep-is-data',
    text: "Poor sleep is data, not a defect.",
    source: 'ajith',
    where: 'Blog: what-poor-sleep-is-telling-you (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'regulation-before-behavior',
    text: 'Regulation before behavior.',
    source: 'ajith',
    where: 'Blog: neurodivergence-is-a-variation-not-a-deficiency (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'number-is-a-symptom',
    text: 'A number is a symptom, not a story.',
    source: 'ajith',
    where: 'Blog: what-an-ai-coach-still-can-t-see (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'capacity-over-measurement',
    text: 'The gap closing is not the goal, capacity is.',
    source: 'ajith',
    where: 'Blog: diastasis-recti-what-the-gap-doesnt-tell-you (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'training-loads-sleep-changes',
    text: "Training loads the body. Sleep is what tells the body it's safe to change.",
    source: 'ajith',
    where: 'Blog: sleep-is-not-a-reward (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'rebuilding-not-returning',
    text: 'Rebuilding is not the same as returning.',
    source: 'ajith',
    where: 'Blog: rebuilding-the-core-after-birth (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'capacity-on-top-of-nervous-system',
    text: "You cannot build capacity on top of a nervous system that hasn't been asked how it's doing.",
    source: 'ajith',
    where: 'Blog: why-i-ask-about-sleep-first (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'pushing-through-has-a-cost',
    text: "Pushing through has a cost, and the nervous system keeps the ledger even when you don't.",
    source: 'ajith',
    where: 'Blog: nervous-system-cost-of-pushing-through (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'knee-less-prepared',
    text: "The knee that hurts on the first few stairs isn't necessarily weaker than the one that doesn't. It's just less prepared.",
    source: 'ajith',
    where: 'Blog: knee-pain-on-stairs (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'six-weeks-not-a-finish-line',
    text: 'Six weeks was never a finish line, it was the earliest point someone could ask the next question.',
    source: 'ajith',
    where: 'Blog: the-six-week-clearance-was-never-the-real-timeline (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'calmest-people-frost',
    text: "The calmest people you know aren't fighting their anger. They're doing something much smaller.",
    source: 'ajith',
    where: 'From the "Catch It Before It Becomes a Habit" carousel, scheduled 2026-09-30 - do not post this Story before that carousel goes live',
  },
  {
    slug: 'doing-better-than-you-think',
    text: 'You probably think you’re doing better than you actually are.',
    source: 'ajith',
    where: 'From the "You Think You’re Doing Better" reel, scheduled 2026-10-02 - do not post this Story before that reel goes live',
  },
  {
    slug: 'movement-work-is-regulation-work',
    text: "The movement work isn't separate from the regulation work. It's often the same work.",
    source: 'ajith',
    where: 'Blog: what-17-trials-say-about-exercise-and-executive-function-in-autism (published, verified via DB 2026-09-22)',
  },
  // --- Added 2026-09-22: Ajith asked for the series to read warmer and more
  // motivational/supportive, not clinical or cautionary. These are all still
  // his own already-published hl lines, re-screened for tone (not new content,
  // not deleting anything above - he said he may still use some of those).
  {
    slug: 'timeline-to-discover',
    text: 'The timeline is not something to follow, it is something to discover.',
    source: 'ajith',
    where: 'Blog: return-to-exercise-timeline (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'relationship-built-through-repetition',
    text: 'A relationship with yourself, like any relationship, is built through repetition, not revelation.',
    source: 'ajith',
    where: 'Blog: building-a-relationship-with-yourself (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'goal-not-to-forget-injury',
    text: 'The goal is not to forget the injury happened. It is to stop letting it write the whole program.',
    source: 'ajith',
    where: 'Blog: training-around-an-injury (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'doing-less-more-slowly',
    text: 'Doing less, more slowly, is not a lesser version of training. For a lot of people, it is the first version that actually asks anything of them.',
    source: 'ajith',
    where: 'Blog: case-for-slower-reps (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'food-awareness-paying-attention',
    text: 'Food awareness means paying attention before you decide, not obeying a decision someone else already made for you.',
    source: 'ajith',
    where: 'Blog: food-awareness-not-food-rules (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'recovery-not-a-deadline',
    text: 'Recovery here is not a deadline, it is several different processes moving at different speeds in the same body.',
    source: 'ajith',
    where: 'Blog: a-new-guide-finally-answers-when-to-return-to-running-after-birth (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'gap-doesnt-mean-nothing-improving',
    text: "A gap that doesn't change doesn't mean nothing is improving.",
    source: 'ajith',
    where: 'Blog: do-hypopressive-exercises-help-diastasis-recti-a-2026-trial (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'building-environment-before-born',
    text: "It's part of the environment you're building for someone else before they're even born.",
    source: 'ajith',
    where: 'Blog: moving-through-pregnancy-shapes-more-than-your-own-recovery (published, verified via DB 2026-09-22)',
  },
  {
    slug: 'body-mind-same-timeline',
    text: 'The body and the mind are not on separate timelines here. They are the same timeline.',
    source: 'ajith',
    where: 'Blog: postpartum-recovery-is-pelvic-floor-and-mental-health-not-a-body-to-get-back (published, verified via DB 2026-09-22)',
  },
];

function card(q) {
  const len = q.text.length;
  const size = len > 90 ? 58 : len > 55 ? 68 : 80;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0}
    body{width:1080px;height:1920px;background:#f5ebe1;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",Helvetica,Arial,sans-serif;color:#1a1a1a;position:relative;overflow:hidden}
    .orb{position:absolute;width:900px;height:900px;left:-320px;top:-360px;border-radius:50%;background:radial-gradient(circle at 65% 65%,#c0392b 0%,rgba(192,57,43,0.30) 42%,transparent 72%);opacity:.55}
    .orb2{position:absolute;width:700px;height:700px;right:-260px;bottom:-280px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#c0392b 0%,rgba(192,57,43,0.22) 42%,transparent 72%);opacity:.4}
    .bar{position:absolute;left:0;top:0;bottom:0;width:20px;background:#c0392b}
    .wrap{position:absolute;inset:0;padding:120px 96px 100px 128px;display:flex;flex-direction:column}
    .mark-top{width:56px;height:56px}
    q{font-size:${size}px;line-height:1.18;font-weight:800;letter-spacing:-.01em;flex:1;display:flex;align-items:center;quotes:none}
    .foot{display:flex;align-items:center;gap:20px;border-top:3px solid rgba(26,26,26,.14);padding-top:36px;font-size:30px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .mark{width:48px;height:48px}
    .url{font-size:26px;font-weight:500;color:#58524a;text-transform:none;letter-spacing:0;margin-left:auto}
  </style></head><body><div class="orb"></div><div class="orb2"></div><div class="bar"></div><div class="wrap">
    <div class="mark-top">${MARK_SVG}</div>
    <q>${esc(q.text)}</q>
    <div class="foot">${MARK_SVG}<span>Humankind Movement</span><span class="url">humankindmovement.in</span></div>
  </div></body></html>`;
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const todo = QUOTES.map((q, i) => ({ q, i })).filter(
    ({ q, i }) => (ONLY === null || i === ONLY) && (FORCE || !fs.existsSync(path.join(OUT_DIR, q.slug + '.png')))
  );
  console.log(`${QUOTES.length} quotes, rendering ${todo.length}`);

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  for (const { q } of todo) {
    await page.setContent(card(q), { waitUntil: 'load' });
    const outPath = path.join(OUT_DIR, q.slug + '.png');
    await page.screenshot({ path: outPath });
    try {
      fs.mkdirSync(DESKTOP_DIR, { recursive: true });
      fs.copyFileSync(outPath, path.join(DESKTOP_DIR, q.slug + '.png'));
    } catch (e) {
      console.warn(`  (could not copy ${q.slug} to Desktop: ${e.message})`);
    }
    console.log('rendered', q.slug);
  }
  await browser.close();
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
