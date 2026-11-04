// Design: Corporate and HR. Cool paper, serif numerals, report/board look, dot-grid data graphic, blurred number reveal.
const { esc, lines, top, foot, small, fit, dotGrid } = require('./base');

const CSS = `
:root{--bg:#eef1f4;--ink:#0f1b2a;--muted:#5a6a7b;--accent:#c0392b;--line:rgba(15,27,42,.16)}
.fig{font-size:11px;font-weight:700;letter-spacing:.12em;color:var(--muted);text-transform:uppercase}
h2.serif{font-size:40px;line-height:1.06;font-weight:400;letter-spacing:-.01em}
.row{display:flex;justify-content:space-between;align-items:baseline;padding:20px 0;border-bottom:1px solid var(--line);font-size:23px;font-weight:600}
.row span:last-child{font-size:15px;font-weight:700;letter-spacing:.06em;color:var(--accent);text-transform:uppercase}
.tick{color:#2d7d5f;font-weight:800;margin-right:10px}
.cta{background:var(--accent);color:#fff;border-radius:4px}
`;

const EYE = { key: 'eyebrow', label: 'Top label (e.g. A TRIAL WE READ)', type: 'text' };
const FIG = { key: 'fig', label: 'Small caps label above the headline', type: 'text' };

const layouts = {
  cover: {
    label: 'Cover (big serif lines + red claim)',
    fields: [EYE, FIG,
      { key: 'line1', label: 'Big line 1 (e.g. 18 months.)', type: 'text' },
      { key: 'line2', label: 'Big line 2 (e.g. 4,000 people.)', type: 'text' },
      { key: 'claim', label: 'Red claim line', type: 'text' },
      { key: 'sub', label: 'Supporting sentence', type: 'textarea' }],
    render(d, { i, n }) {
      return `<div class="s" style="background:#f6f2ec">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;top:104px;width:64px;height:6px;background:#c0392b"></div>
        <div style="position:absolute;left:44px;right:44px;top:140px"><div class="fig">${esc(d.fig)}</div>
          <h2 class="serif" style="font-size:72px;line-height:.98;margin-top:14px">${esc(d.line1)}</h2>
          <h2 class="serif" style="font-size:72px;line-height:.98">${esc(d.line2)}</h2>
          <div style="margin-top:28px;font-size:27px;font-weight:700;color:#c0392b;line-height:1.25">${esc(d.claim)}</div>
          ${d.sub ? `<p style="margin-top:16px;font-size:17px;line-height:1.5;color:var(--muted);max-width:30ch">${esc(d.sub)}</p>` : ''}</div>${foot()}</div>`;
    },
  },
  dots: {
    label: 'Dot grid ("20 of 160")',
    fields: [EYE, FIG,
      { key: 'headline', label: 'Headline (serif)', type: 'textarea' },
      { key: 'filled', label: 'Filled dots', type: 'number' },
      { key: 'total', label: 'Total dots (max 160)', type: 'number' },
      { key: 'legendOn', label: 'Legend for filled dots', type: 'text' },
      { key: 'legendOff', label: 'Legend for hollow dots', type: 'text' }],
    render(d, { i, n }) {
      const total = Math.min(160, Number(d.total) || 160), filled = Math.min(total, Number(d.filled) || 0);
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><div class="fig">${esc(d.fig)}</div><h2 class="serif" style="margin-top:10px">${esc(d.headline)}</h2></div>
        <div style="position:absolute;left:44px;top:304px;width:460px;height:240px">${dotGrid(filled, total, 16, [28, 24], 16, { on: '#c0392b', off: '#9fb0c2' })}</div>
        <div style="position:absolute;left:44px;top:560px;font-size:13px;color:var(--muted)"><b style="color:#c0392b">&#9679;</b> ${esc(d.legendOn)} &nbsp;&nbsp; <b style="color:#9fb0c2">&#9675;</b> ${esc(d.legendOff)}</div>${foot()}</div>`;
    },
  },
  ticks: {
    label: 'Ticked list ("what changed")',
    fields: [EYE, FIG,
      { key: 'headline', label: 'Headline (serif)', type: 'textarea' },
      { key: 'items', label: 'Ticked items (one per line)', type: 'lines' },
      { key: 'small', label: 'Small print', type: 'text' }],
    render(d, { i, n }) {
      const rows = lines(d.items).map((t) => `<div class="row"><span><span class="tick">&#10003;</span>${esc(t)}</span></div>`).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><div class="fig">${esc(d.fig)}</div><h2 class="serif" style="margin-top:10px">${esc(d.headline)}</h2></div>
        <div style="position:absolute;left:44px;right:44px;top:332px">${rows}</div>${small(d.small, 'bottom:80px')}${foot()}</div>`;
    },
  },
  rows: {
    label: 'Rows with a value (+ blurred teaser number)',
    fields: [EYE, FIG,
      { key: 'headline', label: 'Headline (serif)', type: 'textarea' },
      { key: 'rows', label: 'Rows, "name | value" one per line (up to 4)', type: 'lines' },
      { key: 'teaser', label: 'Blurred teaser text (optional, e.g. 1.3 of 8)', type: 'text' },
      { key: 'hint', label: 'Hint beside it (e.g. why? swipe)', type: 'text' }],
    render(d, { i, n }) {
      const rows = lines(d.rows).slice(0, 4).map((t) => { const [a, b] = t.split('|').map((s) => s.trim()); return `<div class="row"><span>${esc(a)}</span><span>${esc(b)}</span></div>`; }).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><div class="fig">${esc(d.fig)}</div><h2 class="serif" style="margin-top:10px;font-size:36px">${esc(d.headline)}</h2></div>
        <div style="position:absolute;left:44px;right:44px;top:236px">${rows}</div>
        ${d.teaser ? `<div class="serif" style="position:absolute;left:44px;top:512px;font-size:76px;line-height:1;color:#c0392b;filter:blur(12px)">${esc(d.teaser)}</div>` : ''}
        ${d.hint ? `<div style="position:absolute;right:44px;top:540px;font-size:13px;font-weight:700;color:var(--muted)">${esc(d.hint)} &rarr;</div>` : ''}${foot()}</div>`;
    },
  },
  bignum: {
    label: 'Big number + progress bar',
    fields: [EYE, FIG,
      { key: 'number', label: 'Big number (e.g. 1.3 of 8)', type: 'text' },
      { key: 'text', label: 'Sentence under it', type: 'textarea' },
      { key: 'percent', label: 'Progress bar fill (0 to 100)', type: 'number' },
      { key: 'caption', label: 'Caption under the bar', type: 'text' }],
    render(d, { i, n }) {
      const pct = Math.max(0, Math.min(100, Number(d.percent) || 0));
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><div class="fig">${esc(d.fig)}</div></div>
        <div class="serif" style="position:absolute;left:44px;top:150px;font-size:${fit(d.number, [[8, 118], [14, 84], [30, 60]])}px;line-height:1;color:#c0392b">${esc(d.number)}</div>
        <p style="position:absolute;left:44px;right:44px;top:296px;font-size:21px;line-height:1.4;font-weight:600">${esc(d.text)}</p>
        <div style="position:absolute;left:44px;top:400px;width:452px;height:18px;background:#d5dde5;border-radius:9px"><div style="width:${pct}%;height:100%;background:#c0392b;border-radius:9px"></div></div>
        <p style="position:absolute;left:44px;right:44px;top:450px;font-size:15px;color:var(--muted);line-height:1.5">${esc(d.caption)}</p>${foot()}</div>`;
    },
  },
  cta: {
    label: 'Closing slide (serif question + button + portrait)',
    fields: [EYE,
      { key: 'headline', label: 'Headline (serif)', type: 'textarea' },
      { key: 'sub', label: 'Supporting line', type: 'textarea' },
      { key: 'button', label: 'Button text (e.g. Comment STRATEGY)', type: 'text' },
      { key: 'photo', label: 'Portrait (optional)', type: 'photo' },
      { key: 'note', label: 'Small print (source, limits)', type: 'textarea' }],
    render(d, { i, n, ctx }) {
      return `<div class="s" style="background:#e3e9ef">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><h2 class="serif" style="font-size:44px">${esc(d.headline)}</h2>
          ${d.sub ? `<div style="margin-top:22px;font-size:17px;line-height:1.5;color:#44546a">${esc(d.sub)}</div>` : ''}
          ${d.button ? `<div style="margin-top:22px"><span class="cta">${esc(d.button)}</span></div>` : ''}</div>
        ${d.photo ? `<div class="circle" style="position:absolute;width:128px;height:128px;right:44px;top:372px;border:4px solid #e3e9ef;box-shadow:0 10px 24px -10px rgba(0,0,0,.35)"><img src="${esc(ctx.photoUrl(d.photo))}"></div>` : ''}
        ${small(d.note, 'bottom:78px;right:190px')}${foot()}</div>`;
    },
  },
  text: {
    label: 'Plain text slide',
    fields: [EYE, FIG,
      { key: 'headline', label: 'Headline (serif)', type: 'textarea' },
      { key: 'sub', label: 'Supporting sentence', type: 'textarea' },
      { key: 'bullets', label: 'Bullets (one per line)', type: 'lines' }],
    render(d, { i, n }) {
      const li = lines(d.bullets).map((t) => `<div class="row"><span>${esc(t)}</span></div>`).join('');
      return `<div class="s">${top(d.eyebrow, i, n)}
        <div style="position:absolute;left:44px;right:44px;top:112px"><div class="fig">${esc(d.fig)}</div><h2 class="serif" style="margin-top:10px">${esc(d.headline)}</h2>
          ${d.sub ? `<p style="margin-top:18px;font-size:19px;line-height:1.5;color:var(--muted)">${esc(d.sub)}</p>` : ''}</div>
        ${li ? `<div style="position:absolute;left:44px;right:44px;top:360px">${li}</div>` : ''}${foot()}</div>`;
    },
  },
};

module.exports = {
  id: 'corporate',
  label: 'Corporate and HR',
  description: 'Cool paper, big serif numbers, report look, a dot-grid graphic and a blurred number reveal. Data-forward.',
  css: CSS,
  coverLayout: 'cover',
  ctaLayout: 'cta',
  layouts,
};
