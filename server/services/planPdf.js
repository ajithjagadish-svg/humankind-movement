const PDFDocument = require('pdfkit');
const path = require('path');
const { parseMealPlanTable, eatOrderCategory, groupByDay, weeklyAverage } = require('./mealPlanTable');

// Renders the branded plan PDF a coach hands to a client - the Starting
// Point numbers (server/services/nutritionTargets.js), the eat-order and
// chrono-nutrition rules with their supporting evidence, and the coach-
// authored weekly meal table / sunlight guidance from the client's profile
// (server/models/ClientProfile.js). Structure and level of detail mirror
// the real "Nutrition Chart" project workbook on the desktop (day-by-day,
// meal-by-meal, swap options, per-item macros, evidence citations) rather
// than a generic summary sheet. Brand colors and logo are pulled from
// assets/img/logo.png and the site's own --ink/--accent tokens (#1a1a1a /
// #c0392b), not redrawn from memory.
//
// Front-matter (Starting Point, rules, sunlight) is portrait - the format
// every PDF viewer handles correctly with zero window/zoom fiddling. Only
// the meal table is landscape, because it genuinely needs the width (12
// columns) - that was the original design; a later pass made everything
// landscape for visual consistency, which turned out to cause real-world
// viewers (Preview.app confirmed) to clip wide portrait-shaped windows
// against a much wider page. Consistency lost to correctly displaying,
// every time, with no user action required - not a close call.

const INK = '#1a1a1a';
const ACCENT = '#c0392b';
const MUTED = '#6b6862';
const PAPER = '#faf8f4';
// logo.png has ~70% transparent padding baked into its 500x500 canvas (the
// mark itself only occupies the centre 30%), which made it read as both
// tiny and like leftover white space no matter how large a box it was
// drawn into. logo-cropped.png is the same mark cropped tight (170x162,
// see assets/img/logo.png's own bbox) with a small breathing-room border,
// so a given draw width now maps to the actual visible size.
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'img', 'logo-cropped.png');
const LOGO_ASPECT_W = 170;
const LOGO_ASPECT_H = 162;

const PORTRAIT_MARGIN = 56;
const LANDSCAPE_MARGIN = 40;

const CATEGORY_COLORS = {
  fibre: { text: '#2e7d32', bg: '#e8f5e9', label: 'Fibre first' },
  protein: { text: '#c85a00', bg: '#fff3e0', label: 'Protein' },
  fat: { text: '#a68300', bg: '#fffde7', label: 'Fat' },
  carb: { text: '#1565c0', bg: '#e3f2fd', label: 'Carb last' },
  other: { text: MUTED, bg: '#f1efe9', label: 'Other' },
};
const BATCH_COOK_COLOR = '#00695c';

// A logo this small is the single most common note we get back on drafts -
// it needs to read at a glance, not be found on inspection. 72pt (1 inch)
// is bold enough to anchor the page without crowding the title beneath it.
// Uses doc.page.width, so it works unmodified on both portrait and
// landscape pages.
function addLetterhead(doc, title, subtitle) {
  const logoSize = 52;
  const logoHeight = logoSize * (LOGO_ASPECT_H / LOGO_ASPECT_W);
  const bandHeight = 130;
  const margin = doc.page.margins.left;
  doc.rect(0, 0, doc.page.width, bandHeight).fill(PAPER);
  doc.image(LOGO_PATH, margin, (bandHeight - logoHeight) / 2 - 10, { width: logoSize });

  const textX = margin + logoSize + 20;
  doc
    .font('Helvetica-Bold').fontSize(15).fillColor(INK)
    .text('HUMANKIND MOVEMENT', textX, 40, { characterSpacing: 0.8 });
  doc
    .font('Helvetica').fontSize(9.5).fillColor(MUTED)
    .text('humankindmovement.in', textX, 60);
  doc
    .font('Helvetica-Bold').fontSize(21).fillColor(ACCENT)
    .text(title, textX, 80);
  if (subtitle) {
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(subtitle, textX, 106, { width: doc.page.width - textX - margin });
  }

  doc
    .moveTo(margin, bandHeight - 4).lineTo(doc.page.width - margin, bandHeight - 4)
    .strokeColor(ACCENT).lineWidth(2).stroke();
  doc.y = bandHeight + 16;
}

// minRoom should be the real height the section needs (heading + its
// content), not a flat guess - a fixed 110pt margin was pushing short
// sections (like Sunlight's one paragraph) onto a whole fresh page even
// when they would have fit in the space left on the current one, wasting
// a nearly-blank page for a couple of lines of text.
function sectionHeading(doc, text, minRoom = 50) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - minRoom) {
    doc.addPage({ size: 'A4', margin: PORTRAIT_MARGIN });
  }
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(ACCENT).text(text.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
}

// Bordered stat cards spanning the full page width, 3 per row - replaces a
// fixed label-column-then-value-column layout that left a wide dead gap
// down the middle of the page whenever a label was short (e.g. "Fat"),
// which is what several rounds of "empty space on the left" turned out to
// actually be - not a margin or orientation problem, this table's own
// column layout.
function drawStatGrid(doc, stats) {
  const margin = doc.page.margins.left;
  const contentWidth = doc.page.width - margin * 2;
  const columns = 3;
  const gap = 10;
  const boxWidth = (contentWidth - gap * (columns - 1)) / columns;
  const boxHeight = 58;
  const startY = doc.y;

  stats.forEach((stat, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = margin + col * (boxWidth + gap);
    const y = startY + row * (boxHeight + gap);

    doc.roundedRect(x, y, boxWidth, boxHeight, 6).fillAndStroke('#ffffff', '#e5e0d8');
    doc.font('Helvetica-Bold').fontSize(15).fillColor(INK).text(stat.value, x + 12, y + 10, { width: boxWidth - 24 });
    doc.font('Helvetica').fontSize(8.3).fillColor(MUTED).text(stat.label, x + 12, y + 32, { width: boxWidth - 24 });
  });

  const rows = Math.ceil(stats.length / columns);
  // Each box was drawn with an explicit (x, width) - pdfkit keeps the last
  // one as the active flow bounds, so unpositioned .text() calls after this
  // (every bullet/paragraph on the rest of the page) would otherwise wrap
  // at the last box's ~150pt width instead of the full page - reset both.
  doc.x = margin;
  doc.y = startY + rows * (boxHeight + gap);
}

function bulletList(doc, items) {
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(9.8).fillColor(INK).text(`•  ${item.rule}`, { paragraphGap: 1 });
    if (item.evidence) {
      doc.font('Helvetica-Oblique').fontSize(8.3).fillColor(MUTED).text(`    ${item.evidence}`, { paragraphGap: 6 });
    } else {
      doc.moveDown(0.15);
    }
  });
}

function paragraphOrPlaceholder(doc, text, placeholder) {
  const content = (text || '').trim();
  if (content) {
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(content, { paragraphGap: 4 });
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(MUTED).text(placeholder);
  }
}

// Evidence lines mirror the citations already vetted for this project's own
// workbook (desktop "Nutrition Chart" project, Eat Order & Timing / Evidence
// tabs) - reused here, not invented fresh.
const EAT_ORDER_RULES = [
  { rule: 'Fibre and vegetables first - they slow the rest of the meal down and take the edge off appetite.', evidence: 'Vegetables and protein before carbohydrate cut the 2-hour glucose response by 73% versus the reverse order (Shukla et al., Diabetes Care 2015).' },
  { rule: 'Protein next - keeps you fuller for longer and protects muscle while eating in a deficit or surplus.', evidence: null },
  { rule: 'Fat after that - in moderation, alongside protein.', evidence: 'Fat is also the carrier for fat-soluble vitamins D and the omega-3s - see Drinks and Supplements below.' },
  { rule: 'Carbohydrate last - eaten this way, the same plate produces a gentler blood sugar response.', evidence: 'In prediabetes, this order cut the glucose peak by over 40% (Shukla et al., Diabetes Obesity & Metabolism 2019). In a 16-week trial, 94% of participants found it easy to sustain (Shukla et al., Nutrients 2023).' },
  { rule: 'A squeeze of lemon on every meal - except dairy or curd dishes, where it curdles.', evidence: 'The same vitamin C mechanism already at work for iron-rich meals (see Drinks and Supplements) - most meals here carry some plant-based iron, so this is that same habit extended as a simple daily default.' },
  { rule: 'A small side of fermented vegetable (kimchi) at dinner, alongside the curd and fermented batters already through the week.', evidence: 'A high-fermented-food diet steadily raised gut microbiome diversity and lowered inflammatory markers over 17 weeks, an effect a high-fiber diet alone did not produce (Wastyk et al., Cell 2021).' },
];

const CHRONO_RULES = [
  { rule: 'Load carbohydrate earlier in the day - breakfast and lunch carry the biggest share, dinner carries the smallest.', evidence: 'Insulin sensitivity peaks in the morning and declines toward evening - identical meals produce higher glucose and insulin responses at night.' },
  { rule: 'Finish eating by 8pm where possible, inside a 10-12 hour eating window.', evidence: 'Dinner after 8pm was independently associated with higher HbA1c in type 2 diabetes (Sakai et al. 2018).' },
  { rule: 'Protein every 3-4 hours across 4-5 meals, not one large lunch and a token dinner.', evidence: 'ISSN 2017 position stand; roughly 0.4 g/kg protein per meal (Schoenfeld & Aragon 2018).' },
  { rule: 'A short walk (10-15 minutes) within 30 minutes of your two largest meals measurably helps blood sugar control.', evidence: 'Walking as soon as possible after a meal beats the same walk delayed or taken before eating (systematic review, Sports Medicine 2023).' },
  { rule: 'A # next to a dish in the weekly plan means it is a batch-cook option: make extra at lunch and reuse a smaller portion at dinner instead of cooking a fresh vegetable - same eat-order role, similar macros, one less thing to cook. Always optional - cook fresh instead any day you would rather have the variety.', evidence: null },
];

const DRINK_SUPPLEMENT_RULES = [
  { rule: 'Keep tea and coffee at least 60 minutes away from iron-rich meals (dal, sprouts, leafy greens, tofu, or an iron supplement).', evidence: 'Polyphenols and tannins in tea and coffee are among the strongest inhibitors of non-heme iron absorption.' },
  { rule: 'Pair iron-rich meals with a source of vitamin C - lemon, tomato, orange, guava, kiwi.', evidence: 'Ascorbic acid enhances non-heme iron absorption and can partly reverse the inhibition from tea and phytate.' },
  { rule: 'Keep dairy roughly 2 hours from iron-rich meals for the same reason.', evidence: 'Calcium inhibits both heme and non-heme iron absorption.' },
  { rule: 'Vitamin D3, with breakfast (your largest fat-containing meal). Daily maintenance dose is typically 1,000-2,000 IU/day. A weekly high-dose regimen (e.g. 50,000 IU/week) is a real, effective alternative - but that is a doctor-directed protocol for correcting a confirmed deficiency, not a substitute for the daily dose without a diagnosis.', evidence: 'Taking D3 with a meal raised peak plasma D3 by 32% versus a fat-free one (Dawson-Hughes et al. 2015). Weekly 50,000 IU dosing raised serum 25(OH)D as effectively as 4,000 IU/day over 3 months, and beat a single large injected dose (Habiba et al., Can J Physiol Pharmacol 2023).' },
  { rule: 'Omega-3 EPA/DHA (~1,000-2,000 mg/day) with the same breakfast as the D3.', evidence: 'Vegetarians relying on plant ALA (walnuts, flax, chia) convert it poorly to EPA/DHA - algal oil is the direct source.' },
  { rule: 'Vegetarians: a B12 supplement any time of day, with or without food - this is a hard, non-negotiable gap in a vegetarian diet.', evidence: 'A supplement is crystalline B12, which does not need the stomach-acid-mediated release from food that dietary B12 does - its absorption does not depend on being taken on an empty stomach (Baik & Russell, Annu Rev Nutr 1999). Italian Society of Human Nutrition position paper recommends a reliable fortified or supplemental source rather than diet alone.' },
  { rule: 'Creatine (3-5 g/day, plain monohydrate) any time - daily consistency matters more than timing.', evidence: 'Vegetarians start with lower muscle creatine and respond more strongly - greatest rise in muscle creatine and fat-free mass in trials (IJERPH 2020 systematic review).' },
  { rule: 'Iron - only if a blood test has confirmed deficiency - between meals, away from tea, coffee, dairy, and zinc by 2 hours. Dosing and timing should be set with a doctor, not self-directed.', evidence: 'Iron is the one supplement on this list that can do real harm if taken without a confirmed need.' },
  { rule: 'Zinc (10-15 mg/day, if used) with a meal, away from calcium and iron by 2 hours - evening works well. Stay inside this range and do not take it long-term without checking in - this is not a "more is better" supplement.', evidence: 'Phytate in whole grains, legumes, nuts and seeds binds zinc, which is why vegetarian zinc needs run higher. Chronic zinc use above typical supplemental doses has caused copper deficiency severe enough to cause anemia and low white blood cell counts in case reports (Kimura et al. 2022; Wahab et al. 2021) - a real risk at high doses or long duration, not at a modest, time-limited 10-15 mg/day, but worth being deliberate about rather than open-ended.' },
  { rule: 'Magnesium (200-400 mg/day, if used) in the evening, with or after dinner.', evidence: null },
];

function drawEatOrderLegend(doc, x, y) {
  let cursorX = x;
  Object.entries(CATEGORY_COLORS).forEach(([key, c]) => {
    if (key === 'other') return;
    doc.rect(cursorX, y, 8, 8).fill(c.text);
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(c.label, cursorX + 12, y - 1.5);
    cursorX += 12 + doc.widthOfString(c.label) + 16;
  });
}

const TABLE_COLUMNS = [
  { key: 'day', label: 'Day', width: 50 },
  { key: 'meal', label: 'Meal', width: 62 },
  { key: 'time', label: 'Time', width: 32 },
  { key: 'eatOrder', label: 'Eat order', width: 68 },
  { key: 'dish', label: 'Eat this (Option A)', width: 154 },
  { key: 'swap', label: 'Or swap to (Option B)', width: 144 },
  { key: 'proteinG', label: 'P g', width: 28, align: 'right' },
  { key: 'carbG', label: 'C g', width: 28, align: 'right' },
  { key: 'fatG', label: 'F g', width: 28, align: 'right' },
  { key: 'fibreG', label: 'Fib g', width: 30, align: 'right' },
  { key: 'kcal', label: 'kcal', width: 34, align: 'right' },
  { key: 'note', label: 'Coaching note', width: 87 },
];

function tableWidth() {
  return TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);
}

function drawColumnHeaderRow(doc, x, y) {
  const height = 20;
  doc.rect(x, y, tableWidth(), height).fill('#f1efe9');
  let cx = x;
  TABLE_COLUMNS.forEach((col) => {
    doc.font('Helvetica-Bold').fontSize(7.6).fillColor(INK).text(col.label, cx + 4, y + 6, { width: col.width - 8, align: col.align || 'left' });
    cx += col.width;
  });
  return y + height;
}

function ensureRoom(doc, x, needed, redrawHeader) {
  const bottomLimit = doc.page.height - 44;
  if (doc.y + needed > bottomLimit) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: LANDSCAPE_MARGIN });
    doc.y = LANDSCAPE_MARGIN;
    doc.y = redrawHeader(x, doc.y);
  }
}

function drawItemRow(doc, x, y, row) {
  const cat = CATEGORY_COLORS[eatOrderCategory(row.eatOrder)];
  const wideCols = ['dish', 'swap', 'note'];
  const heights = wideCols.map((key) => doc.heightOfString(String(row[key] || ''), { width: TABLE_COLUMNS.find((c) => c.key === key).width - 8 }));
  const rowHeight = Math.max(16, ...heights) + 6;

  doc.rect(x, y, tableWidth(), rowHeight).fillAndStroke('#ffffff', '#ece7dd');
  doc.rect(x, y, 3, rowHeight).fill(cat.text);

  let cx = x;
  TABLE_COLUMNS.forEach((col) => {
    const raw = row[col.key];
    const value = typeof raw === 'number' ? String(raw) : raw || '';
    if (col.key === 'eatOrder') {
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(cat.text).text(value, cx + 5, y + 4, { width: col.width - 9 });
    } else if (col.key === 'note' && value.includes('#')) {
      // Batch-cook tag - colored so it reads as a marker pointing back to the
      // one-time explanation in Timing and Rhythm, not another paragraph to read.
      doc.font('Helvetica-Bold').fontSize(7.8).fillColor(BATCH_COOK_COLOR).text(value, cx + 4, y + 4, { width: col.width - 8 });
    } else {
      doc.font('Helvetica').fontSize(7.8).fillColor(INK).text(value, cx + 4, y + 4, { width: col.width - 8, align: col.align || 'left' });
    }
    cx += col.width;
  });
  return y + rowHeight;
}

function drawTotalsRow(doc, x, y, label, totals) {
  const height = 18;
  doc.rect(x, y, tableWidth(), height).fill('#efe4e1');
  const dishColX = x + TABLE_COLUMNS[0].width + TABLE_COLUMNS[1].width + TABLE_COLUMNS[2].width + TABLE_COLUMNS[3].width;
  doc.font('Helvetica-Bold').fontSize(8).fillColor(ACCENT).text(label, x + 4, y + 5);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text('DAY TOTAL', dishColX + 4, y + 5);

  let cx = dishColX + TABLE_COLUMNS[4].width + TABLE_COLUMNS[5].width;
  ['proteinG', 'carbG', 'fatG', 'fibreG', 'kcal'].forEach((key) => {
    const col = TABLE_COLUMNS.find((c) => c.key === key);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(INK).text(String(Math.round(totals[key])), cx + 4, y + 5, { width: col.width - 8, align: 'right' });
    cx += col.width;
  });
  return y + height;
}

function drawMealPlanTable(doc, weeklyPlanTable) {
  const rows = parseMealPlanTable(weeklyPlanTable);
  if (!rows.length) return false;

  const days = groupByDay(rows);
  const avg = weeklyAverage(days);
  const x = LANDSCAPE_MARGIN;

  doc.addPage({ size: 'A4', layout: 'landscape', margin: LANDSCAPE_MARGIN });
  const logoSize = 36;
  const textX = x + logoSize + 18;
  const introWidth = doc.page.width - textX - LANDSCAPE_MARGIN - 240;
  const introText = 'Every meal is sequenced fibre -> protein -> fat -> carbohydrate. Swap freely within the same row - the two options are macro-similar.';

  doc.image(LOGO_PATH, x, LANDSCAPE_MARGIN - 10, { width: logoSize });
  doc.font('Helvetica-Bold').fontSize(17).fillColor(ACCENT).text('Your Weekly Plan', textX, LANDSCAPE_MARGIN - 6);
  doc.font('Helvetica').fontSize(8.6).fillColor(MUTED);
  const introHeight = doc.heightOfString(introText, { width: introWidth });
  doc.text(introText, textX, LANDSCAPE_MARGIN + 16, { width: introWidth });

  if (avg) {
    const boxX = doc.page.width - LANDSCAPE_MARGIN - 230;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('WEEKLY AVERAGE / DAY', boxX, LANDSCAPE_MARGIN - 6);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(
      `${avg.kcal} kcal   ·   P ${avg.proteinG}g   C ${avg.carbG}g   F ${avg.fatG}g   Fib ${avg.fibreG}g`,
      boxX, LANDSCAPE_MARGIN + 8, { width: 230 }
    );
  }

  const legendY = Math.max(LANDSCAPE_MARGIN - 10 + logoSize, LANDSCAPE_MARGIN + 16 + introHeight) + 10;
  drawEatOrderLegend(doc, x, legendY);
  doc.y = legendY + 18;

  const redrawHeader = (hx, hy) => drawColumnHeaderRow(doc, hx, hy);
  doc.y = drawColumnHeaderRow(doc, x, doc.y);

  days.forEach((day) => {
    ensureRoom(doc, x, 20 + 20, redrawHeader);
    doc.rect(x, doc.y, tableWidth(), 18).fill('#f6ece9');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text(day.day.toUpperCase(), x + 6, doc.y + 5);
    doc.y += 18;

    day.rows.forEach((row) => {
      const wideCols = ['dish', 'swap', 'note'];
      const heights = wideCols.map((key) => doc.heightOfString(String(row[key] || ''), { width: TABLE_COLUMNS.find((c) => c.key === key).width - 8 }));
      const estHeight = Math.max(16, ...heights) + 6;
      ensureRoom(doc, x, estHeight, redrawHeader);
      doc.y = drawItemRow(doc, x, doc.y, row);
    });

    ensureRoom(doc, x, 18, redrawHeader);
    doc.y = drawTotalsRow(doc, x, doc.y, day.day, day.totals);
    doc.y += 6;
  });

  return true;
}

function generatePlanPdf({ profile, startingPoint, goalLock }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: PORTRAIT_MARGIN, bufferPages: true });
  doc.pipe(res);

  addLetterhead(doc, 'Your Nutrition Plan', `${profile.fullName}${profile.location ? '  ·  ' + profile.location : ''}`);

  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED);
  doc.text(`Prepared ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  if (profile.currentPlanVersion) doc.text(`Plan: ${profile.currentPlanVersion}`);

  doc.moveDown(0.8);
  doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(INK).text(
    'This reflects where you are right now, not a fixed destination. The numbers below come from your current weight, activity, and goal - they will be revisited as you change, not before.',
    { paragraphGap: 6 }
  );

  sectionHeading(doc, 'Your Starting Point');
  drawStatGrid(doc, [
    { value: `${startingPoint.calorieTarget} kcal`, label: 'Daily calorie target' },
    { value: `${startingPoint.proteinTarget} g`, label: 'Protein / day' },
    { value: `${startingPoint.proteinPerMeal} g`, label: 'Protein / meal (4+ meals)' },
    { value: `${startingPoint.fatTarget} g`, label: 'Fat / day' },
    { value: `${startingPoint.carbTarget} g`, label: 'Carbohydrate / day' },
    { value: `${startingPoint.fiberTarget} g`, label: 'Fiber / day' },
  ]);
  doc.moveDown(0.6);
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(
    `Goal: ${profile.goal}  ·  Activity level: ${profile.activityLevel}` +
    (profile.trainingSchedule ? `  ·  Training: ${profile.trainingSchedule}` : '') +
    (goalLock && goalLock.locked ? `  ·  held steady until ${new Date(goalLock.unlocksAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} so we can see a clean signal before reassessing` : '')
  );

  sectionHeading(doc, 'How to Build Each Meal');
  bulletList(doc, EAT_ORDER_RULES);

  sectionHeading(doc, 'Timing and Rhythm');
  bulletList(doc, CHRONO_RULES);

  sectionHeading(doc, 'Drinks and Supplements');
  doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(MUTED).text(
    'Everything below is a general guideline, not a prescription - the specific doses, timing, and even whether a supplement makes sense for you at all should be confirmed with blood work and a doctor, not assumed from this page. This section does not assume a diagnosed deficiency unless stated.',
    { paragraphGap: 8 }
  );
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
  bulletList(doc, DRINK_SUPPLEMENT_RULES);

  const sunlightText = (profile.sunlightNotes || '').trim() || 'Your coach will add sun-exposure timing specific to where you live here.';
  doc.font('Helvetica').fontSize(10.5);
  const sunlightHeight = doc.heightOfString(sunlightText, { width: doc.page.width - PORTRAIT_MARGIN * 2 });
  sectionHeading(doc, 'Sunlight and Vitamin D', 50 + sunlightHeight);
  paragraphOrPlaceholder(doc, profile.sunlightNotes, 'Your coach will add sun-exposure timing specific to where you live here.');

  const hasTable = drawMealPlanTable(doc, profile.weeklyPlanTable);
  if (!hasTable) {
    doc.addPage({ size: 'A4', margin: PORTRAIT_MARGIN });
    addLetterhead(doc, 'Your Weekly Plan');
    paragraphOrPlaceholder(doc, '', 'Your coach will add your specific day-by-day meal table here.');
  }

  // Drawing this close to the bottom edge would otherwise trip pdfkit's own
  // overflow check and silently append a blank page per footer - zeroing
  // the bottom margin for the duration of each write avoids that.
  const range = doc.bufferedPageRange();
  const bottomMargin = doc.page.margins.bottom;
  for (let i = 0; i < range.count; i += 1) {
    doc.switchToPage(range.start + i);
    const margin = doc.page.margins.left;
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      `Humankind Movement  ·  Page ${i + 1} of ${range.count}`,
      margin,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - margin * 2 }
    );
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
}

module.exports = { generatePlanPdf };
