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

const INK = '#1a1a1a';
const ACCENT = '#c0392b';
const MUTED = '#6b6862';
const PAPER = '#faf8f4';
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'img', 'logo.png');

// Every page in this document is landscape - the meal table needs the
// width, and a document that switches orientation mid-read looks like an
// assembly error rather than a design choice. Prose sections cap their own
// text width (CONTENT_WIDTH) instead of stretching line length across the
// full landscape page, which would be uncomfortable to read.
const PAGE_MARGIN = 40;
const CONTENT_WIDTH = 620;

const CATEGORY_COLORS = {
  fibre: { text: '#2e7d32', bg: '#e8f5e9', label: 'Fibre first' },
  protein: { text: '#c85a00', bg: '#fff3e0', label: 'Protein' },
  fat: { text: '#a68300', bg: '#fffde7', label: 'Fat' },
  carb: { text: '#1565c0', bg: '#e3f2fd', label: 'Carb last' },
  other: { text: MUTED, bg: '#f1efe9', label: 'Other' },
};

// A logo this small is the single most common note we get back on drafts -
// it needs to read at a glance, not be found on inspection. 72pt (1 inch)
// is bold enough to anchor the page without crowding the title beneath it.
function addLetterhead(doc, title, subtitle) {
  const logoSize = 72;
  doc.rect(0, 0, doc.page.width, logoSize + 64).fill(PAPER);
  doc.image(LOGO_PATH, PAGE_MARGIN, 32, { width: logoSize });

  const textX = PAGE_MARGIN + logoSize + 20;
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
    doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(subtitle, textX, 106, { width: doc.page.width - textX - PAGE_MARGIN });
  }

  doc
    .moveTo(PAGE_MARGIN, logoSize + 48).lineTo(doc.page.width - PAGE_MARGIN, logoSize + 48)
    .strokeColor(ACCENT).lineWidth(2).stroke();
  doc.y = logoSize + 64;
}

// minRoom should be the real height the section needs (heading + its
// content), not a flat guess - a fixed 110pt margin was pushing short
// sections (like Sunlight's one paragraph) onto a whole fresh page even
// when they would have fit in the space left on the current one, wasting
// a nearly-blank page for a couple of lines of text.
function sectionHeading(doc, text, minRoom = 50) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - minRoom) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
  }
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(ACCENT).text(text.toUpperCase(), { width: CONTENT_WIDTH, characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
}

function targetRow(doc, label, value) {
  const y = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, PAGE_MARGIN, y, { continued: false, width: 200 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(value, PAGE_MARGIN + 200, y, { width: CONTENT_WIDTH - 200 });
  doc.moveDown(0.35);
}

function bulletList(doc, items) {
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(9.8).fillColor(INK).text(`•  ${item.rule}`, { width: CONTENT_WIDTH, paragraphGap: 1 });
    if (item.evidence) {
      doc.font('Helvetica-Oblique').fontSize(8.3).fillColor(MUTED).text(`    ${item.evidence}`, { width: CONTENT_WIDTH, paragraphGap: 6 });
    } else {
      doc.moveDown(0.15);
    }
  });
}

function paragraphOrPlaceholder(doc, text, placeholder) {
  const content = (text || '').trim();
  if (content) {
    doc.font('Helvetica').fontSize(10.5).fillColor(INK).text(content, { width: CONTENT_WIDTH, paragraphGap: 4 });
  } else {
    doc.font('Helvetica-Oblique').fontSize(10).fillColor(MUTED).text(placeholder, { width: CONTENT_WIDTH });
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
];

const CHRONO_RULES = [
  { rule: 'Load carbohydrate earlier in the day - breakfast and lunch carry the biggest share, dinner carries the smallest.', evidence: 'Insulin sensitivity peaks in the morning and declines toward evening - identical meals produce higher glucose and insulin responses at night.' },
  { rule: 'Finish eating by 8pm where possible, inside a 10-12 hour eating window.', evidence: 'Dinner after 8pm was independently associated with higher HbA1c in type 2 diabetes (Sakai et al. 2018).' },
  { rule: 'Protein every 3-4 hours across 4-5 meals, not one large lunch and a token dinner.', evidence: 'ISSN 2017 position stand; roughly 0.4 g/kg protein per meal (Schoenfeld & Aragon 2018).' },
  { rule: 'A short walk (10-15 minutes) within 30 minutes of your two largest meals measurably helps blood sugar control.', evidence: 'Walking as soon as possible after a meal beats the same walk delayed or taken before eating (systematic review, Sports Medicine 2023).' },
];

const DRINK_SUPPLEMENT_RULES = [
  { rule: 'Keep tea and coffee at least 60 minutes away from iron-rich meals (dal, sprouts, leafy greens, tofu, or an iron supplement).', evidence: 'Polyphenols and tannins in tea and coffee are among the strongest inhibitors of non-heme iron absorption.' },
  { rule: 'Pair iron-rich meals with a source of vitamin C - lemon, tomato, orange, guava, kiwi.', evidence: 'Ascorbic acid enhances non-heme iron absorption and can partly reverse the inhibition from tea and phytate.' },
  { rule: 'Keep dairy roughly 2 hours from iron-rich meals for the same reason.', evidence: 'Calcium inhibits both heme and non-heme iron absorption.' },
  { rule: 'Vitamin D3 (1,000-2,000 IU/day typical) with the largest fat-containing meal of the day.', evidence: 'Taking D3 with the largest meal raised serum 25(OH)D by ~50% versus other timing (Mulligan & Licata 2010); a fat-containing meal raised peak plasma D3 by 32% versus a fat-free one (Dawson-Hughes et al. 2015).' },
  { rule: 'Omega-3 EPA/DHA (~1,000-2,000 mg/day) with the same fat-containing meal as the D3.', evidence: 'Vegetarians relying on plant ALA (walnuts, flax, chia) convert it poorly to EPA/DHA - algal oil is the direct source.' },
  { rule: 'Vegetarians: a B12 supplement any time of day - this is a hard, non-negotiable gap in a vegetarian diet.', evidence: 'Italian Society of Human Nutrition position paper recommends a reliable fortified or supplemental source rather than diet alone.' },
  { rule: 'Creatine (3-5 g/day, plain monohydrate) any time - daily consistency matters more than timing.', evidence: 'Vegetarians start with lower muscle creatine and respond more strongly - greatest rise in muscle creatine and fat-free mass in trials (IJERPH 2020 systematic review).' },
  { rule: 'Iron - only if a blood test has confirmed deficiency - between meals, away from tea, coffee, dairy, and zinc by 2 hours.', evidence: 'Iron is the one supplement on this list that can do real harm if taken without a confirmed need.' },
  { rule: 'Zinc (10-15 mg/day, if used) with a meal, away from calcium and iron by 2 hours - evening works well.', evidence: 'Phytate in whole grains, legumes, nuts and seeds binds zinc, which is why vegetarian zinc needs run higher.' },
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
    doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
    doc.y = PAGE_MARGIN;
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
  const x = PAGE_MARGIN;

  doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
  const logoSize = 52;
  const textX = x + logoSize + 18;
  const introWidth = doc.page.width - textX - PAGE_MARGIN - 240;
  const introText = 'Every meal is sequenced fibre -> protein -> fat -> carbohydrate. Swap freely within the same row - the two options are macro-similar.';

  doc.image(LOGO_PATH, x, PAGE_MARGIN - 10, { width: logoSize });
  doc.font('Helvetica-Bold').fontSize(17).fillColor(ACCENT).text('Your Weekly Plan', textX, PAGE_MARGIN - 6);
  doc.font('Helvetica').fontSize(8.6).fillColor(MUTED);
  const introHeight = doc.heightOfString(introText, { width: introWidth });
  doc.text(introText, textX, PAGE_MARGIN + 16, { width: introWidth });

  if (avg) {
    const boxX = doc.page.width - PAGE_MARGIN - 230;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED).text('WEEKLY AVERAGE / DAY', boxX, PAGE_MARGIN - 6);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK).text(
      `${avg.kcal} kcal   ·   P ${avg.proteinG}g   C ${avg.carbG}g   F ${avg.fatG}g   Fib ${avg.fibreG}g`,
      boxX, PAGE_MARGIN + 8, { width: 230 }
    );
  }

  const legendY = Math.max(PAGE_MARGIN - 10 + logoSize, PAGE_MARGIN + 16 + introHeight) + 10;
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
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN, bufferPages: true });
  doc.pipe(res);

  addLetterhead(doc, 'Your Nutrition Plan', `${profile.fullName}${profile.location ? '  ·  ' + profile.location : ''}`);

  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED);
  doc.text(`Prepared ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  if (profile.currentPlanVersion) doc.text(`Plan: ${profile.currentPlanVersion}`);

  doc.moveDown(0.8);
  doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(INK).text(
    'This reflects where you are right now, not a fixed destination. The numbers below come from your current weight, activity, and goal - they will be revisited as you change, not before.',
    { width: CONTENT_WIDTH, paragraphGap: 6 }
  );

  sectionHeading(doc, 'Your Starting Point');
  targetRow(doc, 'Daily calorie target', `${startingPoint.calorieTarget} kcal`);
  targetRow(doc, 'Protein', `${startingPoint.proteinTarget} g/day  (about ${startingPoint.proteinPerMeal} g per meal, across 4+ meals)`);
  targetRow(doc, 'Fat', `${startingPoint.fatTarget} g/day`);
  targetRow(doc, 'Carbohydrate', `${startingPoint.carbTarget} g/day`);
  targetRow(doc, 'Fiber', `${startingPoint.fiberTarget} g/day`);
  doc.moveDown(0.4);
  doc.font('Helvetica').fontSize(9.5).fillColor(MUTED).text(
    `Goal: ${profile.goal}  ·  Activity level: ${profile.activityLevel}` +
    (profile.trainingSchedule ? `  ·  Training: ${profile.trainingSchedule}` : '') +
    (goalLock && goalLock.locked ? `  ·  held steady until ${new Date(goalLock.unlocksAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} so we can see a clean signal before reassessing` : ''),
    { width: CONTENT_WIDTH }
  );

  sectionHeading(doc, 'How to Build Each Meal');
  bulletList(doc, EAT_ORDER_RULES);

  sectionHeading(doc, 'Timing and Rhythm');
  bulletList(doc, CHRONO_RULES);

  sectionHeading(doc, 'Drinks and Supplements');
  bulletList(doc, DRINK_SUPPLEMENT_RULES);

  const sunlightText = (profile.sunlightNotes || '').trim() || 'Your coach will add sun-exposure timing specific to where you live here.';
  doc.font('Helvetica').fontSize(10.5);
  const sunlightHeight = doc.heightOfString(sunlightText, { width: CONTENT_WIDTH });
  sectionHeading(doc, 'Sunlight and Vitamin D', 50 + sunlightHeight);
  paragraphOrPlaceholder(doc, profile.sunlightNotes, 'Your coach will add sun-exposure timing specific to where you live here.');

  const hasTable = drawMealPlanTable(doc, profile.weeklyPlanTable);
  if (!hasTable) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
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
    doc.page.margins.bottom = 0;
    doc.font('Helvetica').fontSize(8).fillColor(MUTED).text(
      `Humankind Movement  ·  Page ${i + 1} of ${range.count}`,
      PAGE_MARGIN,
      doc.page.height - 30,
      { align: 'center', width: doc.page.width - PAGE_MARGIN * 2 }
    );
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
}

module.exports = { generatePlanPdf };
