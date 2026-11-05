// Design: Breath. One slow wave runs across ALL slides: short and busy on the first, long and calm by the last, while the
// background settles from deep teal to pale sand. Built for breathing carousels (a different look from the heart-rate 'nervous' design).
// Each slide is a window onto one wide canvas, so the wave joins up when the slides sit side by side in Instagram.
const { esc, lines, top, foot, small, makeCtx } = require('./base');

// 2026-10-25 (Ajith: "should we drastically deviate from the colours we use?"): no dark teal any more. Brand paper and ink throughout;
// the only colour moves are the wave (brand red calming to the teal already used in the nervous and neurodivergent designs) and a faint sage on the last slides.
const LIGHT_RAMP = ['#f7f3ec', '#f3f1e8', '#ebf0e8'];

function hex(c) { return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join(''); }
function ramp(stops, i, count) {
  if (count <= 1) return stops[0];
  const t = (i / (count - 1)) * (stops.length - 1);
  const lo = Math.floor(t), hi = Math.min(stops.length - 1, lo + 1);
  return mix(stops[lo], stops[hi], t - lo);
}

// Background colour per slide: warm paper settling to a faint sage by the last slide.
function bgFor(i, n) {
  return { color: ramp(LIGHT_RAMP, i, n), light: true };
}

function tracePath(n) {
  // A smooth wave whose wavelength grows from about 110 px to 540 px across the canvas (the breath slows) and whose height settles.
  const W = n * 540, Y0 = 378, a0 = 110, b = 430 / W;
  const pts = [];
  for (let x = 0; x <= W; x += 6) {
    const phase = (2 * Math.PI * Math.log((a0 + b * x) / a0)) / b;
    const amp = 44 * Math.pow(1 - x / W, 1.1) + 8;
    pts.push([x, Y0 - amp * Math.sin(phase)]);
  }
  return pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

const EYE = { key: 'eyebrow', label: 'Top label (e.g. A STUDY WE READ)', type: 'text' };

const layouts = {
  trace: {
    label: 'Wave slide (headline + wave + sentence)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'text', label: 'Sentence under the line', type: 'textarea' },
      { key: 'bpm', label: 'Example bpm shown big (leave blank for none)', type: 'number' },
      { key: 'hint', label: 'Handwritten swipe hint (optional, first slide)', type: 'text' }],
  },
  cta: {
    label: 'Closing slide (headline + button + portrait)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'text', label: 'Sentence', type: 'textarea' },
      { key: 'button', label: 'Button text (e.g. Comment COMEDOWN)', type: 'text' },
      { key: 'photo', label: 'Portrait', type: 'photo' },
      { key: 'note', label: 'Small print (source, limits)', type: 'textarea' }],
  },
  stat: {
    label: 'Big number slide (headline + big number + what it means)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'big', label: 'Big number (e.g. 40%)', type: 'text' },
      { key: 'bigLabel', label: 'What the number is', type: 'textarea' },
      { key: 'text', label: 'Small line under it (e.g. the comparison)', type: 'textarea' }],
  },
  text: {
    label: 'Plain text slide (same look as the wave slide)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'text', label: 'Sentence under the line', type: 'textarea' },
      { key: 'bullets', label: 'Extra lines (optional, one per line)', type: 'lines' }],
  },
};

const CSS = `
:root{--accent:#3d7a70;--line:rgba(26,26,26,.16);--ink:#1a1a1a;--muted:#5c5b55}
.wrap{position:absolute;top:0;left:0;height:675px;overflow:hidden}
.sl{position:absolute;top:0;width:540px;height:675px}
.sl.light{--ink:#1a1a1a;--muted:#5c5b55;--accent:#3d7a70;--line:rgba(26,26,26,.16)}
.sl .mark .mv{fill:var(--ink)}.sl .mark .mh{fill:#c0392b}
.sl .wm{color:var(--ink)}
.h{position:absolute;left:46px;right:46px;top:108px;font-size:41px;line-height:1.08;font-weight:800;letter-spacing:-.01em;color:var(--ink)}
.p{position:absolute;left:46px;right:46px;top:436px;font-size:23.5px;line-height:1.4;font-weight:500;color:var(--ink);opacity:.86}
.cta{background:#1a1a1a;color:#faf8f4;margin-top:16px}
.bpm{position:absolute;left:46px;top:430px;color:var(--ink);display:flex;align-items:baseline;gap:8px}
.bpm .n{font-family:"Avenir Next Condensed","Avenir Next",Arial Narrow,sans-serif;font-weight:800;font-size:60px;line-height:1;color:var(--accent)}
.bpm .u{font-size:16px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.bpm small{font-size:10.5px;font-weight:600;opacity:.6;margin-left:6px;letter-spacing:.04em}
.statn{position:absolute;left:46px;top:420px;font-family:"Avenir Next Condensed","Avenir Next",Arial Narrow,sans-serif;font-weight:800;font-size:84px;line-height:1;color:var(--accent)}
.statl{position:absolute;left:46px;right:46px;top:508px;font-size:24px;line-height:1.3;font-weight:700;color:var(--ink)}
.statt{position:absolute;left:46px;right:46px;top:574px;font-size:19px;line-height:1.4;font-weight:500;color:var(--ink);opacity:.8}
.hint{position:absolute;right:46px;top:214px;font-size:30px;color:var(--accent);transform:rotate(-2deg)}
`;

function slideInner(s, i, n) {
  const d = s.data || {};
  const layout = s.layout || 'trace';
  const light = bgFor(i, n).light;
  const left = i * 540;
  const t = top(d.eyebrow, i, n);
  if (layout === 'cta') {
    return `<div class="sl ${light ? 'light' : ''}" style="left:${left}px">${t}<div class="h" style="top:104px">${esc(d.headline)}</div>
      ${d.photo ? `<div class="circle" style="position:absolute;width:132px;height:132px;right:46px;top:428px;border:5px solid #f4f1e8;box-shadow:0 10px 24px -10px rgba(0,0,0,.35)"><img src="${esc(s._photoUrl || '')}"></div>` : ''}
      <div class="p" style="top:${d.photo ? 440 : 216}px;right:${d.photo ? 214 : 46}px;font-size:${d.photo ? 17 : 25}px">${esc(d.text)}${d.button ? `<br><span class="cta">${esc(d.button)}</span>` : ''}</div>
      ${small(d.note, 'bottom:80px;left:46px;right:46px')}${foot()}</div>`;
  }
  if (layout === 'stat') {
    return `<div class="sl ${light ? 'light' : ''}" style="left:${left}px">${t}<div class="h">${esc(d.headline)}</div>
      <div class="statn">${esc(d.big)}</div><div class="statl">${esc(d.bigLabel)}</div>${d.text ? `<div class="statt">${esc(d.text)}</div>` : ''}${foot()}</div>`;
  }
  const extra = lines(d.bullets).map((b) => `<br>${esc(b)}`).join('');
  const bpm = d.bpm !== undefined && d.bpm !== null && String(d.bpm) !== '' ? `<div class="bpm"><span class="n">${esc(d.bpm)}</span><span class="u">bpm</span><small>example, not data</small></div>` : '';
  const hint = d.hint ? `<div class="hint hand">${esc(d.hint)} &rarr;</div>` : '';
  return `<div class="sl ${light ? 'light' : ''}" style="left:${left}px">${t}<div class="h">${esc(d.headline)}</div>${hint}${bpm}${d.text || extra ? `<div class="p">${esc(d.text)}${extra}</div>` : ''}${foot()}</div>`;
}

// Whole-page renderer: unlike the other designs, each slide's page contains the full wide canvas and shows
// the window for slide i, so the line and background stay continuous.
function renderSlide(carousel, i, ctx) {
  const n = carousel.slides.length, W = n * 540;
  const stops = [];
  for (let k = 0; k < n; k++) {
    const c = bgFor(k, n).color;
    stops.push(`${c} ${k * 540}px`, `${c} ${(k + 1) * 540}px`);
  }
  const slides = carousel.slides.map((s, k) => {
    const copy = Object.assign({}, s);
    const ph = s.data && s.data.photo;
    if (ph) copy._photoUrl = ctx.photoUrl(ph);
    return copy;
  });
  const inner = slides.map((s, k) => slideInner(s, k, n)).join('');
  return `<div class="s" style="--bg:#14100d"><div class="wrap" style="width:${W}px;left:${-i * 540}px;background:linear-gradient(to right,${stops.join(',')})">
    <svg style="position:absolute;left:0;top:0" width="${W}" height="675" viewBox="0 0 ${W} 675"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#c0392b"/><stop offset=".55" stop-color="#3d7a70"/><stop offset="1" stop-color="#3d7a70"/></linearGradient></defs>
      <path d="${tracePath(n)}" fill="none" stroke="url(#g)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/></svg>${inner}</div></div>`;
}

module.exports = {
  id: 'breath',
  label: 'Breath',
  description: 'A slow wave runs across every slide, short and busy at first, long and calm by the last, on warm brand paper, the line turning from brand red to calm teal. For breathing carousels.',
  css: CSS,
  coverLayout: 'trace',
  ctaLayout: 'cta',
  layouts,
  renderSlide,
};
