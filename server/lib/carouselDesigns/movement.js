// Design: Movement and power. Bold condensed type, big numbers, full-bleed action photos with a dark gradient,
// bars for before/after, red closing slide. Two consecutive photo slides can use two frames of the same moment
// (same camera position), so swiping plays like a flipbook.
const { esc, lines, top, foot, small, fit } = require('./base');

const CSS = `
:root{--bg:#f4f1ec;--ink:#111;--muted:#5d5a55;--accent:#d63a2a;--line:rgba(17,17,17,.18)}
.photo{position:absolute;inset:0;background-size:cover}
.ov{position:absolute;inset:0}
.cta{background:#111;color:#f4f1ec}
.white{--ink:#fff;--muted:#e8e4de;--line:rgba(255,255,255,.3)}
.white .eye{color:#fff}.white .cnt{color:rgba(255,255,255,.8)}
.white .wm{color:#fff}.white .mark .mv{fill:#fff}
.chip{position:absolute;left:44px;top:80px;z-index:6;color:#fff;font-size:28px;transform:rotate(-2deg);background:rgba(0,0,0,.5);padding:2px 16px 4px;border-radius:99px}
.bar{height:46px;border-radius:8px;display:flex;align-items:center;padding-left:14px;font-weight:800;font-size:19px;color:#fff;white-space:nowrap}
.lbl{font-size:12px;font-weight:800;letter-spacing:.1em;color:var(--muted);margin:22px 0 8px;text-transform:uppercase}
.bignum{font-family:"Avenir Next Condensed","Avenir Next",Arial Narrow,sans-serif;font-weight:800;line-height:.9;color:#d63a2a}
.red{background:#d63a2a;--ink:#fff;--muted:#ffe3de;--line:rgba(255,255,255,.35);--accent:#fff}
.red .mark .mv{fill:#fff}.red .wm{color:#fff}
`;

const GRAD = 'background:linear-gradient(to bottom,rgba(0,0,0,.38) 0%,rgba(0,0,0,0) 22%,rgba(0,0,0,.4) 42%,rgba(0,0,0,.9) 60%,rgba(0,0,0,.94) 100%)';
const EYE = { key: 'eyebrow', label: 'Top label (e.g. A STUDY WE READ)', type: 'text' };
const PHOTO = { key: 'photo', label: 'Photo', type: 'photo' };
const FOCUS = { key: 'focus', label: 'Photo focus (CSS position, default 55% 0%)', type: 'text' };

const layouts = {
  'photo-cover': {
    label: 'Photo cover (full photo + big title)',
    fields: [EYE, PHOTO, FOCUS,
      { key: 'chip', label: 'Handwritten chip (e.g. hold the dots and slide)', type: 'text' },
      { key: 'title', label: 'Title', type: 'textarea' },
      { key: 'sub', label: 'Smaller line under the title', type: 'textarea' }],
    render(d, { i, n, ctx }) {
      const size = fit(d.title, [[40, 52], [75, 45], [200, 38]]);
      return `<div class="s white"><div class="photo" style="background-image:url('${esc(ctx.photoUrl(d.photo))}');background-position:${esc(d.focus || '55% 0%')}"></div><div class="ov" style="${GRAD}"></div>
        ${top(d.eyebrow, i, n)}${d.chip ? `<div class="chip hand">${esc(d.chip)} &rarr;</div>` : ''}
        <div style="position:absolute;left:44px;right:44px;top:362px;color:#fff"><div class="cond" style="font-size:${size}px;line-height:.97">${esc(d.title)}</div>
          ${d.sub ? `<div style="font-size:16px;font-weight:500;line-height:1.4;margin-top:14px;color:#f1ede7">${esc(d.sub)}</div>` : ''}</div>${foot()}</div>`;
    },
  },
  'photo-stat': {
    label: 'Photo + one big number',
    fields: [EYE, PHOTO, FOCUS,
      { key: 'lead', label: 'Line above the number', type: 'text' },
      { key: 'number', label: 'Big number (e.g. 30%)', type: 'text' },
      { key: 'unit', label: 'Word under the number (e.g. bigger)', type: 'text' },
      { key: 'text', label: 'Sentence under it', type: 'textarea' }],
    render(d, { i, n, ctx }) {
      return `<div class="s white"><div class="photo" style="background-image:url('${esc(ctx.photoUrl(d.photo))}');background-position:${esc(d.focus || '55% 0%')}"></div><div class="ov" style="${GRAD}"></div>
        ${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:344px;color:#fff"><div class="cond" style="font-size:30px;line-height:1;color:#ffd0c8">${esc(d.lead)}</div>
          <div class="cond" style="font-size:104px;line-height:.88;color:#ff6a55">${esc(d.number)}</div><div class="cond" style="font-size:34px;line-height:1">${esc(d.unit)}</div>
          ${d.text ? `<p style="font-size:16.5px;line-height:1.4;margin-top:10px;font-weight:500;color:#f1ede7">${esc(d.text)}</p>` : ''}</div>${foot()}</div>`;
    },
  },
  bars: {
    label: 'Bars (before/after, up to 4)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'bars', label: 'Bars, "label | +18% | 62 | dark" one per line (width 0-100, colour dark or red)', type: 'lines' },
      { key: 'note', label: 'Small print under the bars', type: 'text' }],
    render(d, { i, n }) {
      const bars = lines(d.bars).slice(0, 4).map((t, k) => {
        const [label, val, w, col] = t.split('|').map((s) => s.trim());
        const width = Math.max(10, Math.min(100, Number(w) || 60));
        return `<div class="lbl" style="${k === 0 ? 'margin-top:0' : ''}">${esc(label)}</div><div class="bar" style="width:${width}%;background:${/red/i.test(col) ? '#d63a2a' : '#111'}">${esc(val)}</div>`;
      }).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:108px"><div class="cond" style="font-size:50px;line-height:.98">${esc(d.headline)}</div></div>
        <div style="position:absolute;left:44px;right:44px;top:290px">${bars}</div>${small(d.note, 'bottom:80px')}${foot()}</div>`;
    },
  },
  numbers: {
    label: 'Big numbers (up to 2)',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'items', label: 'Numbers, "+12% | leg press strength" one per line (up to 2)', type: 'lines' }],
    render(d, { i, n }) {
      const rows = lines(d.items).slice(0, 2).map((t, k) => {
        const [num, label] = t.split('|').map((s) => s.trim());
        return `<div style="position:absolute;left:44px;top:${k ? 470 : 290}px"><div class="bignum" style="font-size:${k ? 88 : 118}px">${esc(num)}</div><div class="cond" style="font-size:28px;margin-top:${k ? 6 : 16}px">${esc(label)}</div></div>`;
      }).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:108px"><div class="cond" style="font-size:50px;line-height:.98">${esc(d.headline)}</div></div>${rows}${foot()}</div>`;
    },
  },
  limits: {
    label: 'The limits (honest slide + our view)',
    fields: [{ key: 'eyebrow', label: 'Top label', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'items', label: 'Limits (one per line)', type: 'lines' },
      { key: 'view', label: 'Our view, not the study\'s', type: 'textarea' },
      { key: 'viewLabel', label: 'Label before it (default: Our view, not the study\'s:)', type: 'text' }],
    render(d, { i, n }) {
      const items = lines(d.items).map((t) => `<div style="margin-bottom:8px">${esc(t)}</div>`).join('');
      return `<div class="s">${top(d.eyebrow || 'THE LIMITS', i, n)}
        <div style="position:absolute;left:44px;right:44px;top:108px"><div class="cond" style="font-size:50px;line-height:.98">${esc(d.headline)}</div></div>
        <div style="position:absolute;left:44px;right:44px;top:280px">
          <div style="min-height:188px;font-size:21px;line-height:1.55;font-weight:600">${items}</div>
          ${d.view ? `<p style="margin-top:14px;font-size:16.5px;line-height:1.5;color:var(--muted);font-weight:500"><b style="color:#111">${esc(d.viewLabel || 'Our view, not the study\'s:')}</b> ${esc(d.view)}</p>` : ''}</div>
        ${foot()}</div>`;
    },
  },
  'cta-photo': {
    label: 'Closing slide (red, button + photo)',
    fields: [{ key: 'eyebrow', label: 'Top label', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'button', label: 'Button text (e.g. Comment POWER)', type: 'text' },
      PHOTO,
      { key: 'photoShape', label: 'Photo shape', type: 'select', options: [['square', 'Square (portrait)'], ['wide', 'Wide (landscape photo under the headline)'], ['full', 'Full photo behind the slide (text over it)']] },
      { key: 'note', label: 'Small print (source, limits)', type: 'textarea' }],
    render(d, { i, n, ctx }) {
      if (d.photo && d.photoShape === 'full') {
        const fg = 'background:linear-gradient(to bottom,rgba(0,0,0,.72) 0%,rgba(0,0,0,.5) 34%,rgba(0,0,0,.08) 56%,rgba(0,0,0,.5) 80%,rgba(0,0,0,.86) 100%)';
        return `<div class="s white"><div class="photo" style="background-image:url('${esc(ctx.photoUrl(d.photo))}');background-position:${esc(d.focus || '50% 60%')}"></div><div class="ov" style="${fg}"></div>
        ${top(d.eyebrow || 'YOUR TURN', i, n)}
        <div style="position:absolute;left:44px;right:44px;top:104px;color:#fff"><div class="cond" style="font-size:46px;line-height:.98">${esc(d.headline)}</div>
          ${d.button ? `<div style="margin-top:18px"><span class="cta" style="background:#fff;color:#111">${esc(d.button)}</span></div>` : ''}</div>
        ${small(d.note, 'bottom:78px;color:#f1ede7')}${foot()}</div>`;
      }
      if (d.photo && d.photoShape === 'wide') {
        return `<div class="s red">${top(d.eyebrow || 'YOUR TURN', i, n)}
        <div style="position:absolute;left:44px;right:44px;top:104px;color:#fff"><div class="cond" style="font-size:44px;line-height:.98">${esc(d.headline)}</div>
          ${d.button ? `<div style="margin-top:18px"><span class="cta">${esc(d.button)}</span></div>` : ''}</div>
        <img src="${esc(ctx.photoUrl(d.photo))}" style="position:absolute;left:44px;right:44px;bottom:140px;width:452px;height:228px;object-fit:cover;object-position:50% 35%;border-radius:18px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)">
        ${small(d.note, 'bottom:78px;color:#ffe3de')}${foot()}</div>`;
      }
      return `<div class="s red">${top(d.eyebrow || 'YOUR TURN', i, n)}
        <div style="position:absolute;left:44px;top:110px;width:330px;color:#fff"><div class="cond" style="font-size:44px;line-height:.98">${esc(d.headline)}</div>
          ${d.button ? `<div style="margin-top:20px"><span class="cta">${esc(d.button)}</span></div>` : ''}</div>
        ${d.photo ? `<img src="${esc(ctx.photoUrl(d.photo))}" style="position:absolute;right:44px;bottom:150px;width:250px;height:250px;object-fit:cover;border-radius:18px;box-shadow:0 14px 30px -12px rgba(0,0,0,.5)">` : ''}
        ${small(d.note, 'bottom:78px;color:#ffe3de')}${foot()}</div>`;
    },
  },
  text: {
    label: 'Plain text slide',
    fields: [EYE,
      { key: 'headline', label: 'Headline', type: 'textarea' },
      { key: 'sub', label: 'Supporting sentence', type: 'textarea' },
      { key: 'bullets', label: 'Bullets (one per line)', type: 'lines' }],
    render(d, { i, n }) {
      const li = lines(d.bullets).map((t) => `<div style="font-size:21px;line-height:1.6;font-weight:600">${esc(t)}</div>`).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:108px"><div class="cond" style="font-size:50px;line-height:.98">${esc(d.headline)}</div>
          ${d.sub ? `<p style="margin-top:18px;font-size:19px;line-height:1.5;color:var(--muted);font-weight:500">${esc(d.sub)}</p>` : ''}</div>
        ${li ? `<div style="position:absolute;left:44px;right:44px;top:330px">${li}</div>` : ''}${foot()}</div>`;
    },
  },
};

module.exports = {
  id: 'movement',
  label: 'Movement and power',
  description: 'Bold condensed type, big numbers, action photos with a dark gradient, bars and a red closing slide. Two frames of one moment make a flipbook.',
  css: CSS,
  coverLayout: 'photo-cover',
  ctaLayout: 'cta-photo',
  layouts,
};
