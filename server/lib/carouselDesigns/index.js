// Registry for the category carousel designs. A carousel has `design` ('classic' = the original template, which
// lives in the editor/CLI and is not handled here) and slides of { layout, data }.
const base = require('./base');
const { makeCtx, page, lines } = base;
const { ART } = require('./art');

const DESIGNS = {};
['postpartum', 'corporate', 'neurodivergent', 'nervous', 'movement', 'breath'].forEach((id) => { DESIGNS[id] = require('./' + id); });

const isLibraryDesign = (id) => Object.prototype.hasOwnProperty.call(DESIGNS, id);
const getDesign = (id) => DESIGNS[id] || null;

// One slide as a full HTML page (540x675 CSS px; screenshot the `.s` element at 2x for 1080x1350).
function renderSlidePage(carousel, i, mode) {
  const design = getDesign(carousel.design);
  if (!design) throw new Error('Unknown design: ' + carousel.design);
  const ctx = makeCtx(mode || 'preview');
  const slides = carousel.slides || [];
  const n = slides.length;
  if (design.renderSlide) return page(ctx, design.css, design.renderSlide(carousel, i, ctx));
  const s = slides[i] || {};
  const layoutId = design.layouts[s.layout] ? s.layout : design.coverLayout;
  const data = s.data || {};
  let html = design.layouts[layoutId].render(data, { i, n, ctx });
  // Optional faded background photo (any layout): bgPhoto = photo name, bgOpacity = percent (0 to 100).
  // Used to make one photo "un-fade" across a carousel: low opacity on slide 1, full strength on the last.
  const bgUrl = data.bgPhoto ? ctx.photoUrl(data.bgPhoto) : '';
  if (bgUrl) {
    const op = Math.max(0, Math.min(100, Number(data.bgOpacity) || 0)) / 100;
    const layer = `<div style="position:absolute;inset:0;z-index:0;pointer-events:none;background:url('${base.esc(bgUrl)}') ${base.esc(data.bgPosition || '50% 60%')}/cover no-repeat;opacity:${op}"></div>`;
    const at = html.indexOf('>') + 1;
    html = html.slice(0, at) + layer + html.slice(at);
  }
  // Optional quiet artwork for blank areas (see art.js): data.art = name, data.artText = extra text for some pieces.
  if (data.art && ART[data.art]) {
    const at2 = html.indexOf('>') + 1;
    html = html.slice(0, at2) + ART[data.art](data) + html.slice(at2);
  }
  return page(ctx, design.css, html);
}

// Fields every layout gets for the optional faded background photo.
const BG_FIELDS = [
  { key: 'art', label: 'Quiet artwork for blank space (lying-cover, lying-list, breath-line, numerals, breath-underline, breath-short)', type: 'text' },
  { key: 'bgPhoto', label: 'Faded background photo (optional)', type: 'photo' },
  { key: 'bgOpacity', label: 'Background photo strength, 0 to 100 (low on early slides, 100 on the last)', type: 'number' },
];

// What the editor needs: designs, layouts, field specs, and the photo names available.
function describeDesigns() {
  const out = {};
  Object.values(DESIGNS).forEach((d) => {
    out[d.id] = {
      id: d.id, label: d.label, description: d.description, coverLayout: d.coverLayout, ctaLayout: d.ctaLayout,
      layouts: Object.fromEntries(Object.entries(d.layouts).map(([k, l]) => [k, { label: l.label, fields: l.fields.concat(BG_FIELDS) }])),
    };
  });
  return { designs: out, photos: base.listPhotos() };
}

// Which source keys feed which target field when switching design (first non-empty wins).
const ALIASES = {
  eyebrow: ['eyebrow'],
  headline: ['headline', 'title', 'big', 'line1'],
  title: ['headline', 'title', 'big', 'line1'],
  big: ['big', 'headline', 'title', 'line1'],
  line1: ['line1', 'headline', 'title', 'big'],
  sub: ['sub', 'text', 'line2'],
  text: ['text', 'sub'],
  bullets: ['bullets', 'items'],
  items: ['items', 'bullets'],
  button: ['button', 'ctaBtn'],
  note: ['note', 'small'],
  photo: ['photo'],
  label: ['label', 'fig'],
};

function flat(slide) {
  const d = Object.assign({}, slide.data || {});
  // classic slides keep their fields at the top level
  ['eyebrow', 'headline', 'sub', 'bullets', 'ctaBtn', 'note', 'photo'].forEach((k) => { if (d[k] === undefined && slide[k] !== undefined) d[k] = slide[k]; });
  return d;
}

function pick(src, key) {
  for (const a of (ALIASES[key] || [key])) {
    const v = src[a];
    if (Array.isArray(v) ? v.length : (v !== undefined && v !== null && String(v).trim() !== '')) return v;
  }
  return undefined;
}

// Convert slides from one design to another. First slide gets the cover layout, last the CTA layout, the rest 'text'.
function convertSlides(slides, from, to) {
  if (to === 'classic') {
    return slides.map((s) => {
      const d = flat(s);
      const pickText = (k) => { const v = pick(d, k); return Array.isArray(v) ? v.join(' ') : (v || ''); };
      const bullets = pick(d, 'bullets');
      return { eyebrow: pickText('eyebrow'), headline: pickText('headline'), sub: pickText('sub'), bullets: bullets ? lines(bullets) : [], ctaBtn: pickText('button'), note: pickText('note') };
    });
  }
  const target = getDesign(to);
  if (!target) return slides;
  const n = slides.length;
  return slides.map((s, i) => {
    const layoutId = i === 0 ? target.coverLayout : (i === n - 1 && n > 1 ? target.ctaLayout : 'text');
    const layout = target.layouts[layoutId] || target.layouts[target.coverLayout];
    const src = flat(s);
    const data = {};
    layout.fields.forEach((f) => {
      const v = pick(src, f.key);
      if (v === undefined) return;
      data[f.key] = f.type === 'lines' ? lines(v) : (Array.isArray(v) ? v.join(' ') : v);
    });
    return { layout: layoutId, data };
  });
}

// Generic and per-design warnings. They never block saving.
function validateCarousel(carousel) {
  const w = [];
  const slides = carousel.slides || [];
  if (slides.length > 6) w.push('More than 6 slides. The standard is 6 or fewer.');
  const all = JSON.stringify(slides.map((s) => s.data || s));
  if (all.includes('—')) w.push('An em dash is in the text. Replace it with a full stop or a comma.');
  // One idea per slide: flag slides that carry too much text or too many list items.
  const SKIP = new Set(['photo', 'bgPhoto', 'bgOpacity', 'bgPosition', 'photoShape', 'focus', 'size', 'note', 'viewLabel', 'eyebrow', 'button', 'photos', 'people']);
  slides.forEach((sl, idx) => {
    const d = sl.data || {};
    let chars = 0, listMax = 0;
    Object.keys(d).forEach((k) => {
      if (SKIP.has(k)) return;
      const v = d[k];
      if (Array.isArray(v)) { listMax = Math.max(listMax, v.length); chars += v.join(' ').length; } else if (typeof v === 'string') chars += v.length;
    });
    if (chars > 260 || listMax > 4) w.push('Slide ' + (idx + 1) + ' is crowded (' + chars + ' characters). One idea per slide: can it be one sentence a stranger gets in three seconds?');
  });
  const design = getDesign(carousel.design);
  if (design && design.validate) w.push(...design.validate(carousel));
  return w;
}

module.exports = { DESIGNS, isLibraryDesign, getDesign, renderSlidePage, describeDesigns, convertSlides, validateCarousel };
