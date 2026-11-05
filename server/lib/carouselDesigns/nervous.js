// Design: Nervous system and recovery. One heart-rate trace runs across ALL slides, jagged on the first and flat by
// the last, while the background steps from dark to light as you swipe. Each slide is a window onto one wide
// canvas, so the line joins up when the slides sit side by side in Instagram.
// The trace and the bpm readouts are an illustration (the slides label the numbers "example, not data").
const { esc, lines, top, foot, small, makeCtx } = require('./base');

const DARK_RAMP = ['#14100d', '#1c1512', '#2b201c', '#43332e'];
const LIGHT_RAMP = ['#e9ded3', '#f6eee6'];

function hex(c) { return [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)); }
function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, k) => Math.round(v + (B[k] - v) * t).toString(16).padStart(2, '0')).join(''); }
function ramp(stops, i, count) {
  if (count <= 1) return stops[0];
  const t = (i / (count - 1)) * (stops.length - 1);
  const lo = Math.floor(t), hi = Math.min(stops.length - 1, lo + 1);
  return mix(stops[lo], stops[hi], t - lo);
}

// Background colour per slide: first ~2/3 dark and getting lighter, then the "exhale" into two light slides.
function bgFor(i, n) {
  const dark = Math.max(1, Math.round((n * 2) / 3));
  return i < dark ? { color: ramp(DARK_RAMP, i, dark), light: false } : { color: ramp(LIGHT_RAMP, i - dark, Math.max(1, n - dark)), light: true };
}

function tracePath(n) {
  const W = n * 540, Y0 = 356;
  const pts = [];
  let x = 0, a = 150, P = 96;
  const stopAt = W * 0.818;
  while (x < stopAt) {
    [[0, 0], [.14, 0], [.2, -.1], [.26, 0], [.33, .16], [.39, -1], [.45, .38], [.52, 0], [.66, -.12], [.76, 0], [1, 0]].forEach(([t, v]) => pts.push([x + t * P, Y0 + v * a]));
    x += P; a = Math.max(8, a * 0.9); P = Math.min(280, P * 1.07);
  }
  for (let xx = x; xx <= W; xx += 12) pts.push([xx, Y0 + Math.sin((xx - x) / 38) * 5 * Math.max(0, 1 - (xx - x) / 400)]);
  return pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

const EYE = { key: 'eyebrow', label: 'Top label (e.g. A STUDY WE READ)', type: 'text' };

const layouts = {
  trace: {
    label: 'Heart-rate slide (headline + line + bpm readout)',
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
    label: 'Plain text slide (same look as the heart-rate slide, no bpm)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'text', label: 'Sentence under the line', type: 'textarea' },
      { key: 'bullets', label: 'Extra lines (optional, one per line)', type: 'lines' }],
  },
};

const CSS = `
:root{--accent:#e8b4a0;--line:rgba(245,235,225,.2);--ink:#f5ebe1;--muted:rgba(245,235,225,.62)}
.wrap{position:absolute;top:0;left:0;height:675px;overflow:hidden}
.sl{position:absolute;top:0;width:540px;height:675px}
.sl.light{--ink:#2a1c18;--muted:#6a5750;--accent:#b5432f;--line:rgba(42,28,24,.18)}
.sl .mark .mv{fill:var(--ink)}.sl .mark .mh{fill:#c0392b}
.sl .wm{color:var(--ink)}
.h{position:absolute;left:46px;right:46px;top:108px;font-size:41px;line-height:1.08;font-weight:800;letter-spacing:-.01em;color:var(--ink)}
.p{position:absolute;left:46px;right:46px;top:436px;font-size:23.5px;line-height:1.4;font-weight:500;color:var(--ink);opacity:.86}
.cta{background:#2a1c18;color:#f6eee6;margin-top:16px}
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
      ${d.photo ? `<div class="circle" style="position:absolute;width:132px;height:132px;right:46px;top:428px;border:5px solid #f6eee6;box-shadow:0 10px 24px -10px rgba(0,0,0,.35)"><img src="${esc(s._photoUrl || '')}"></div>` : ''}
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
    <svg style="position:absolute;left:0;top:0" width="${W}" height="675" viewBox="0 0 ${W} 675"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${W}" y2="0"><stop offset="0" stop-color="#ff6a4d"/><stop offset=".5" stop-color="#e8934f"/><stop offset=".66" stop-color="#3d7a70"/><stop offset="1" stop-color="#3d7a70"/></linearGradient></defs>
      <path d="${tracePath(n)}" fill="none" stroke="url(#g)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>${inner}</div></div>`;
}

module.exports = {
  id: 'nervous',
  label: 'Nervous system and recovery',
  description: 'A heart-rate line runs across every slide, jagged to flat, with a bpm readout that falls as you swipe and a dark-to-light background.',
  css: CSS,
  coverLayout: 'trace',
  ctaLayout: 'cta',
  layouts,
  renderSlide,
};
