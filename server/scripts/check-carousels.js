// Run the carousel standard over carousels in the database.
//   node server/scripts/check-carousels.js              all draft carousels, one line each
//   node server/scripts/check-carousels.js --all        include posted ones
//   node server/scripts/check-carousels.js --details    print every error and warning
//   node server/scripts/check-carousels.js --title "Sandwich"   one carousel, full detail
// Exits 1 if any checked carousel has an error, so a scheduled task can use it as a gate.
require('dotenv').config();
const mongoose = require('mongoose');
const Carousel = require('../models/Carousel');
const { lintCarousel } = require('../lib/carouselStandards');

(async () => {
  const a = process.argv.slice(2);
  const all = a.includes('--all');
  const details = a.includes('--details');
  const ti = a.indexOf('--title');
  const title = ti >= 0 ? a[ti + 1] : null;
  await mongoose.connect(process.env.MONGODB_URI);
  let q = all || title ? {} : { status: { $ne: 'posted' } };
  if (title) q.title = new RegExp(title, 'i');
  const list = await Carousel.find(q).sort({ updatedAt: -1 }).lean();
  let bad = 0;
  for (const c of list) {
    const r = lintCarousel(c);
    if (r.errors.length) bad++;
    const flow = r.flow.perSlide.map((p) => (p.linked === null ? 'C' : p.linked ? 'L' : '-')).join('');
    console.log((r.errors.length ? 'FIX   ' : r.warnings.length ? 'review' : 'ok    ') + ' err ' + r.errors.length + ' warn ' + String(r.warnings.length).padEnd(2) +
      ' flow ' + flow.padEnd(7) + ' ' + (c.design || 'classic').padEnd(13) + c.title.slice(0, 60));
    if (details || title) { r.errors.forEach((e) => console.log('      ERROR  ' + e)); r.warnings.forEach((e) => console.log('      warn   ' + e)); }
  }
  console.log('\n' + list.length + ' carousel(s) checked, ' + bad + ' with errors.   Flow: C cover, L joins the slide before, - plain statement.');
  await mongoose.disconnect();
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e.message); process.exit(2); });
