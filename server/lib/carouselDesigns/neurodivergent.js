// Design: Neurodivergent. Calm and low-stimulation: muted green, the same card layout on every slide, a step bar,
// no blur and no motion tricks. Rule from Ajith (2026-10-12): every neurodivergent carousel shows Vijay's photo
// as well as his own on the closing slide (the validate() below warns if it is missing).
const { esc, lines, top, foot, small, fit, dotGrid } = require('./base');

const CSS = `
:root{--bg:#eaf0e8;--ink:#1d2a26;--muted:#566860;--accent:#3d7a70;--line:rgba(29,42,38,.15)}
.steps{position:absolute;left:44px;top:70px;display:flex;gap:8px;z-index:5}
.steps i{width:26px;height:6px;border-radius:3px;background:rgba(29,42,38,.16)}
.steps i.on{background:var(--accent)}
.card{position:absolute;left:44px;right:44px;top:50%;transform:translateY(-50%);margin-top:26px;background:#fbfdf9;border-radius:22px;padding:36px 30px;box-shadow:0 14px 30px -18px rgba(29,42,38,.3)}
.lab{font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin-bottom:14px}
.big{font-size:36px;line-height:1.2;font-weight:700;letter-spacing:-.005em}
.txt{font-size:20px;line-height:1.5;color:var(--muted);margin-top:16px;font-weight:500}
.cta{background:var(--ink);color:#fff}
`;

const EYE = { key: 'eyebrow', label: 'Top label (e.g. A TRIAL WE READ)', type: 'text' };
const steps = (i, n) => `<div class="steps">${Array.from({ length: n }, (_, j) => `<i class="${j <= i ? 'on' : ''}"></i>`).join('')}</div>`;

const layouts = {
  card: {
    label: 'Card (the standard calm slide)',
    fields: [EYE,
      { key: 'label', label: 'Small label in the card', type: 'text' },
      { key: 'big', label: 'Main sentence', type: 'textarea' },
      { key: 'text', label: 'Supporting sentence (optional)', type: 'textarea' },
      { key: 'size', label: 'Size', type: 'select', options: [['normal', 'Normal'], ['large', 'Large (for the cover)']] }],
    render(d, { i, n }) {
      const bigSize = d.size === 'large' ? 40 : 36;
      return `<div class="s">${top(d.eyebrow, i, n)}${steps(i, n)}
        <div class="card" style="${d.size === 'large' ? 'padding:44px 30px' : ''}"><div class="lab">${esc(d.label)}</div><div class="big" style="font-size:${bigSize}px">${esc(d.big)}</div>${d.text ? `<div class="txt">${esc(d.text)}</div>` : ''}</div>${foot()}</div>`;
    },
  },
  dots: {
    label: 'Card with dots ("63 started, 39 finished")',
    fields: [EYE,
      { key: 'label', label: 'Small label in the card', type: 'text' },
      { key: 'big', label: 'Main sentence', type: 'text' },
      { key: 'text', label: 'Supporting sentence', type: 'textarea' },
      { key: 'filled', label: 'Filled dots', type: 'number' },
      { key: 'total', label: 'Total dots (max 63)', type: 'number' }],
    render(d, { i, n }) {
      const total = Math.min(63, Number(d.total) || 63), filled = Math.min(total, Number(d.filled) || 0);
      const rows = Math.ceil(total / 9);
      return `<div class="s">${top(d.eyebrow, i, n)}${steps(i, n)}
        <div class="card"><div class="lab">${esc(d.label)}</div><div class="big">${esc(d.big)}</div><div class="txt" style="margin-bottom:22px">${esc(d.text)}</div>
          <div style="position:relative;width:290px;height:${rows * 32}px">${dotGrid(filled, total, 9, [32, 32], 20, { on: '#3d7a70', off: '#9db5ac', borderW: 2.5 })}</div></div>${foot()}</div>`;
    },
  },
  cta: {
    label: 'Closing card (button + both coaches)',
    fields: [EYE,
      { key: 'label', label: 'Small label in the card', type: 'text' },
      { key: 'big', label: 'Main sentence', type: 'textarea' },
      { key: 'text', label: 'Supporting sentence', type: 'textarea' },
      { key: 'button', label: 'Button text (e.g. Comment ADHD)', type: 'text' },
      { key: 'photos', label: 'Photos, one name per line (default: ajith-jacket, then vijay)', type: 'lines' },
      { key: 'people', label: 'Names beside the photos', type: 'text' },
      { key: 'note', label: 'Small print (source, limits)', type: 'textarea' }],
    render(d, { i, n, ctx }) {
      const ph = lines(d.photos).length ? lines(d.photos) : ['ajith-jacket', 'vijay'];
      const faces = ph.map((p, k) => `<span class="circle" style="width:76px;height:76px;display:block;border:3px solid #fbfdf9;${k ? 'margin-left:-16px' : ''}"><img src="${esc(ctx.photoUrl(p))}"></span>`).join('');
      const [a, b] = String(d.people || 'Ajith and Vijay | your coaches').split('|').map((s) => s.trim());
      return `<div class="s">${top(d.eyebrow, i, n)}${steps(i, n)}
        <div class="card" style="padding-bottom:30px"><div class="lab">${esc(d.label)}</div><div class="big">${esc(d.big)}</div>${d.text ? `<div class="txt">${esc(d.text)}</div>` : ''}
          ${d.button ? `<div style="margin-top:24px"><span class="cta">${esc(d.button)}</span></div>` : ''}
          <div style="margin-top:22px;display:flex;align-items:center;gap:14px"><span style="display:flex">${faces}</span><span style="font-size:15px;font-weight:700;line-height:1.3">${esc(a)}${b ? `<br><span style="font-weight:500;color:var(--muted)">${esc(b)}</span>` : ''}</span></div></div>
        ${small(d.note, 'bottom:78px')}${foot()}</div>`;
    },
  },
  text: {
    label: 'Plain card',
    fields: [EYE,
      { key: 'label', label: 'Small label in the card', type: 'text' },
      { key: 'headline', label: 'Main sentence', type: 'textarea' },
      { key: 'sub', label: 'Supporting sentence', type: 'textarea' },
      { key: 'bullets', label: 'Bullets (one per line)', type: 'lines' }],
    render(d, { i, n }) {
      const li = lines(d.bullets).map((t) => `<div class="txt" style="margin-top:10px">&bull; ${esc(t)}</div>`).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}${steps(i, n)}
        <div class="card"><div class="lab">${esc(d.label)}</div><div class="big">${esc(d.headline)}</div>${d.sub ? `<div class="txt">${esc(d.sub)}</div>` : ''}${li}</div>${foot()}</div>`;
    },
  },
};

module.exports = {
  id: 'neurodivergent',
  label: 'Neurodivergent',
  description: 'Calm green, identical card on every slide, a step bar, no blur or motion. Shows Ajith and Vijay on the closing slide.',
  css: CSS,
  coverLayout: 'card',
  ctaLayout: 'cta',
  layouts,
  // Warnings shown in the editor (never block saving).
  validate(carousel) {
    const w = [];
    const all = JSON.stringify((carousel.slides || []).map((s) => s.data || {}));
    if (!/vijay/i.test(all)) w.push('Neurodivergent carousels should show Vijay\'s photo as well as Ajith\'s. Add "vijay" to the photos on the closing slide.');
    return w;
  },
};
