const PDFDocument = require('pdfkit');
const path = require('path');

// Renders the branded plan PDF a coach hands to a client - the Starting
// Point numbers (server/services/nutritionTargets.js), the eat-order and
// chrono-nutrition rules from the "Nutrition Chart" project research, and
// the coach-authored weekly menu / sunlight guidance from the client's
// profile (server/models/ClientProfile.js). Brand colors and logo path are
// pulled from assets/img/logo.png and the site's own --ink/--accent tokens
// (#1a1a1a / #c0392b), not redrawn from memory.

const INK = '#1a1a1a';
const ACCENT = '#c0392b';
const MUTED = '#6b6862';
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'img', 'logo.png');

const PAGE_MARGIN = 56;

function addLetterhead(doc, title) {
  doc.image(LOGO_PATH, PAGE_MARGIN, 40, { width: 40 });
  doc
    .font('Helvetica-Bold').fontSize(9).fillColor(MUTED)
    .text('HUMANKIND MOVEMENT', PAGE_MARGIN + 52, 46, { characterSpacing: 1 });
  doc
    .font('Helvetica').fontSize(8.5).fillColor(MUTED)
    .text('humankindmovement.in', PAGE_MARGIN + 52, 60);
  doc
    .font('Helvetica-Bold').fontSize(20).fillColor(INK)
    .text(title, PAGE_MARGIN, 96);
  doc
    .moveTo(PAGE_MARGIN, 128).lineTo(doc.page.width - PAGE_MARGIN, 128)
    .strokeColor(ACCENT).lineWidth(1.5).stroke();
  doc.y = 144;
}

function sectionHeading(doc, text) {
  doc.moveDown(0.6);
  doc.font('Helvetica-Bold').fontSize(12.5).fillColor(ACCENT).text(text.toUpperCase(), { characterSpacing: 0.5 });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10.5).fillColor(INK);
}

function targetRow(doc, label, value) {
  const y = doc.y;
  doc.font('Helvetica').fontSize(10).fillColor(MUTED).text(label, PAGE_MARGIN, y, { continued: false, width: 260 });
  doc.font('Helvetica-Bold').fontSize(10).fillColor(INK).text(value, PAGE_MARGIN + 260, y);
  doc.moveDown(0.35);
}

function bulletList(doc, items) {
  items.forEach((item) => {
    doc.font('Helvetica').fontSize(10).fillColor(INK).text(`•  ${item}`, { indent: 0, paragraphGap: 4 });
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

const EAT_ORDER_RULES = [
  'Fibre and vegetables first - they slow the rest of the meal down and take the edge off appetite.',
  'Protein next - keeps you fuller for longer and protects muscle while eating in a deficit or surplus.',
  'Fat after that - in moderation, alongside protein.',
  'Carbohydrate last - eaten this way, the same plate produces a gentler blood sugar response.',
];

const CHRONO_RULES = [
  'Load carbohydrate earlier in the day - breakfast and lunch carry the biggest share, dinner carries the smallest.',
  'Finish eating by 8pm where possible, inside a 10-12 hour eating window.',
  'A short walk (10-15 minutes) within 30 minutes of your two largest meals measurably helps blood sugar control.',
];

const DRINK_SUPPLEMENT_RULES = [
  'Keep tea and coffee at least 60 minutes away from iron-rich meals (dal, sprouts, leafy greens, tofu, or an iron supplement) - both block iron absorption.',
  'Pair iron-rich meals with a source of vitamin C to help absorption.',
  'Keep dairy roughly 2 hours from iron-rich meals for the same reason.',
  'Take vitamin D3 and omega-3 together with your largest fat-containing meal - both are fat-soluble.',
  'Vegetarians: a B12 supplement can be taken any time of day.',
  'Creatine (if you take it) works the same regardless of timing - daily consistency is what matters.',
  'Iron supplements (only if a blood test has confirmed deficiency) should be kept away from tea, coffee, dairy, and zinc by about 2 hours.',
  'Zinc, if supplemented, is best taken in the evening, away from calcium and iron.',
  'Magnesium, if supplemented, is also best taken in the evening.',
];

function generatePlanPdf({ profile, startingPoint, goalLock }, res) {
  const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
  doc.pipe(res);

  addLetterhead(doc, 'Your Nutrition Plan');

  doc.font('Helvetica').fontSize(10.5).fillColor(MUTED);
  doc.text(`${profile.fullName}${profile.location ? '  ·  ' + profile.location : ''}`);
  doc.text(`Prepared ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`);
  if (profile.currentPlanVersion) doc.text(`Plan: ${profile.currentPlanVersion}`);

  doc.moveDown(0.8);
  doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(INK).text(
    'This reflects where you are right now, not a fixed destination. The numbers below come from your current weight, activity, and goal - they will be revisited as you change, not before.',
    { paragraphGap: 6 }
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
    (goalLock && goalLock.locked ? `  ·  held steady until ${new Date(goalLock.unlocksAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} so we can see a clean signal before reassessing` : '')
  );

  sectionHeading(doc, 'How to Build Each Meal');
  bulletList(doc, EAT_ORDER_RULES);

  sectionHeading(doc, 'Your Weekly Plan');
  paragraphOrPlaceholder(doc, profile.weeklyPlanNotes, 'Your coach will add your specific weekly menu here.');

  sectionHeading(doc, 'Timing and Rhythm');
  bulletList(doc, CHRONO_RULES);

  sectionHeading(doc, 'Drinks and Supplements');
  bulletList(doc, DRINK_SUPPLEMENT_RULES);

  sectionHeading(doc, 'Sunlight and Vitamin D');
  paragraphOrPlaceholder(doc, profile.sunlightNotes, 'Your coach will add sun-exposure timing specific to where you live here.');

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
      doc.page.height - 40,
      { align: 'center', width: doc.page.width - PAGE_MARGIN * 2 }
    );
    doc.page.margins.bottom = bottomMargin;
  }

  doc.end();
}

module.exports = { generatePlanPdf };
