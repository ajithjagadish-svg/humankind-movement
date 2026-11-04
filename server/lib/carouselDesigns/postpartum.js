// Design: Postpartum and pregnancy. Blush paper, serif type, handwriting, taped notes, blur-to-clear reveal.
const { esc, lines, top, foot, small, fit } = require('./base');

const CSS = `
:root{--bg:#f8ebe3;--ink:#3b2723;--muted:#7a5f58;--accent:#c4584a;--line:rgba(59,39,35,.16)}
.grain::after{content:"";position:absolute;inset:0;opacity:.07;pointer-events:none;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/></filter><rect width='200' height='200' filter='url(%23n)'/></svg>")}
.blob{position:absolute;border-radius:50%;filter:blur(28px);opacity:.55}
h1.serif{font-weight:400;letter-spacing:-.01em}
.sub{font-size:17px;line-height:1.5;color:var(--muted);font-weight:500}
.note-card{position:absolute;background:#fffaf4;padding:12px 20px 14px;box-shadow:0 10px 22px -8px rgba(80,40,30,.28);font-size:38px;line-height:1;color:var(--ink)}
.note-card::before{content:"";position:absolute;top:-9px;left:50%;width:70px;height:20px;margin-left:-35px;background:rgba(214,170,150,.55);transform:rotate(-2deg)}
.center{position:absolute;left:44px;right:44px}
ul.l{list-style:none;display:flex;flex-direction:column;gap:14px}
ul.l li{font-size:36px;line-height:1.05;color:var(--ink);padding-left:34px;position:relative}
ul.l li::before{content:"";position:absolute;left:0;top:11px;width:20px;height:20px;border:3px solid var(--accent);border-radius:5px}
.cta{background:var(--ink);color:#f8ebe3}
.strike{position:relative;display:inline-block}.strike::after{content:"";position:absolute;left:-6px;right:-6px;top:52%;height:3px;background:var(--accent);transform:rotate(-3deg)}
`;

const UNDER = '<svg width="330" height="22" viewBox="0 0 330 22" style="display:block;margin-top:2px"><path d="M4 14 C 60 4, 120 20, 180 10 S 290 6, 326 12" fill="none" stroke="#c4584a" stroke-width="4" stroke-linecap="round"/></svg>';
const br = (s) => lines(s).map(esc).join('<br>');

const EYE = { key: 'eyebrow', label: 'Top label (e.g. A STUDY WE READ)', type: 'text' };

const layouts = {
  cover: {
    label: 'Cover (serif headline + handwritten answer)',
    fields: [EYE,
      { key: 'headline', label: 'Headline (serif)', type: 'text' },
      { key: 'hand', label: 'Handwritten line (one line per row)', type: 'lines' },
      { key: 'sub', label: 'Small supporting line', type: 'textarea' }],
    render(d, { i, n }) {
      const size = fit(d.headline, [[22, 62], [40, 52], [80, 44]]);
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="blob" style="width:300px;height:300px;right:-90px;bottom:60px;background:#f0b9a8"></div>
        <div class="center" style="top:150px"><h1 class="serif" style="font-size:${size}px;line-height:1.02">${esc(d.headline)}</h1>
          <div class="hand" style="font-size:50px;line-height:1;color:var(--accent);margin-top:14px">${br(d.hand)}</div>${d.hand ? UNDER : ''}
          ${d.sub ? `<p class="sub" style="margin-top:22px;max-width:30ch">${esc(d.sub)}</p>` : ''}</div>${foot()}</div>`;
    },
  },
  notes: {
    label: 'Taped notes (up to 4 short items)',
    fields: [EYE,
      { key: 'headline', label: 'Handwritten headline', type: 'text' },
      { key: 'items', label: 'Notes (one per line, up to 4, keep them short)', type: 'lines' },
      { key: 'sub', label: 'Line under the notes', type: 'text' }],
    render(d, { i, n }) {
      const four = lines(d.items).length > 3;
      const pos = four ? [[56, 236, -4], [196, 316, 3], [70, 396, -2], [200, 470, 2]] : [[56, 262, -4], [200, 352, 3], [84, 442, -2], [210, 520, 2]];
      const notes = lines(d.items).slice(0, 4).map((t, k) => `<div class="note-card hand" style="left:${pos[k][0]}px;top:${pos[k][1]}px;transform:rotate(${pos[k][2]}deg)">${esc(t)}</div>`).join('');
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="center" style="top:112px"><div class="hand" style="font-size:46px;line-height:1.02;color:var(--ink)">${esc(d.headline)}</div></div>${notes}
        ${d.sub ? `<p class="sub center" style="top:${lines(d.items).length > 3 ? 566 : 556}px;font-size:14.5px;line-height:1.35">${esc(d.sub)}</p>` : ''}${foot()}</div>`;
    },
  },
  reveal: {
    label: 'Reveal (question + blurred answer, clear on the next slide)',
    fields: [EYE,
      { key: 'headline', label: 'Handwritten question', type: 'text' },
      { key: 'word', label: 'Blurred word', type: 'text' },
      { key: 'hint', label: 'Hint under it', type: 'text' }],
    render(d, { i, n }) {
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="center" style="top:120px"><div class="hand" style="font-size:60px;line-height:1;color:var(--ink)">${esc(d.headline)}</div></div>
        <div class="center hand" style="top:270px;font-size:150px;line-height:1;color:var(--accent);filter:blur(13px);text-align:center">${esc(d.word)}</div>
        <div class="center hand" style="top:520px;font-size:34px;color:var(--muted);text-align:right">${esc(d.hint)} &rarr;</div>${foot()}</div>`;
    },
  },
  answer: {
    label: 'Answer (big handwritten word + serif sentence + crossed-out line)',
    fields: [EYE,
      { key: 'word', label: 'Big handwritten word', type: 'text' },
      { key: 'text', label: 'Sentence under it (serif)', type: 'textarea' },
      { key: 'struck', label: 'Crossed-out phrase', type: 'text' },
      { key: 'after', label: 'Words after the crossed-out phrase', type: 'text' },
      { key: 'small', label: 'Small print', type: 'text' }],
    render(d, { i, n }) {
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="center" style="top:116px"><div class="hand" style="font-size:150px;line-height:.9;color:var(--accent)">${esc(d.word)}</div>
          <p class="serif" style="font-size:34px;line-height:1.15;margin-top:26px">${esc(d.text)}</p>
          ${d.struck ? `<p class="hand" style="font-size:42px;margin-top:22px;color:var(--ink)"><span class="strike">${esc(d.struck)}</span> ${esc(d.after)}</p>` : ''}</div>
        ${small(d.small, 'bottom:80px')}${foot()}</div>`;
    },
  },
  checklist: {
    label: 'Handwritten checklist (+ optional photo)',
    fields: [EYE,
      { key: 'headline', label: 'Handwritten intro', type: 'text' },
      { key: 'bullets', label: 'Checklist (one per line, up to 4)', type: 'lines' },
      { key: 'photo', label: 'Photo (optional)', type: 'photo' },
      { key: 'photoLabel', label: 'Handwritten label by the photo', type: 'text' }],
    render(d, { i, n, ctx }) {
      const li = lines(d.bullets).slice(0, 4).map((t) => `<li>${esc(t)}</li>`).join('');
      const photo = d.photo ? `<div class="circle" style="position:absolute;width:120px;height:120px;right:44px;bottom:90px;border:5px solid #fffaf4;box-shadow:0 10px 24px -10px rgba(60,30,20,.4)"><img src="${esc(ctx.photoUrl(d.photo))}"></div>` : '';
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="center" style="top:112px"><div class="hand" style="font-size:44px;line-height:1.05;color:var(--accent)">${esc(d.headline)}</div></div>
        <div class="center" style="top:210px"><ul class="l hand">${li}</ul></div>${photo}
        ${d.photoLabel ? `<div class="hand" style="position:absolute;left:44px;bottom:112px;font-size:30px;color:var(--muted)">${esc(d.photoLabel)}</div>` : ''}${foot()}</div>`;
    },
  },
  cta: {
    label: 'Closing slide (serif headline + button + small print)',
    fields: [EYE,
      { key: 'headline', label: 'Headline (serif)', type: 'text' },
      { key: 'sub', label: 'Supporting line', type: 'textarea' },
      { key: 'button', label: 'Button text (e.g. Comment SLEEP)', type: 'text' },
      { key: 'note', label: 'Small print (source, limits, disclaimer)', type: 'textarea' }],
    render(d, { i, n }) {
      return `<div class="s grain" style="background:#f1d6ca">${top(d.eyebrow, i, n)}
        <div class="center" style="top:120px"><h1 class="serif" style="font-size:50px;line-height:1.04">${esc(d.headline)}</h1>
          ${d.sub ? `<p class="sub" style="margin-top:20px;color:#5b403a">${esc(d.sub)}</p>` : ''}
          ${d.button ? `<div style="margin-top:22px"><span class="cta">${esc(d.button)}</span></div>` : ''}</div>
        ${small(d.note, 'bottom:78px' + (d.noteSize ? ';font-size:' + d.noteSize + 'px;line-height:1.4' : ''))}${foot()}</div>`;
    },
  },
  text: {
    label: 'Plain text slide',
    fields: [EYE,
      { key: 'headline', label: 'Headline (serif)', type: 'text' },
      { key: 'sub', label: 'Supporting sentence', type: 'textarea' },
      { key: 'bullets', label: 'Bullets (one per line)', type: 'lines' }],
    render(d, { i, n }) {
      const li = lines(d.bullets).map((t) => `<li>${esc(t)}</li>`).join('');
      return `<div class="s grain">${top(d.eyebrow, i, n)}
        <div class="center" style="top:130px"><h1 class="serif" style="font-size:${fit(d.headline, [[30, 52], [60, 42], [120, 34]])}px;line-height:1.06">${esc(d.headline)}</h1>
          ${d.sub ? `<p class="sub" style="margin-top:20px">${esc(d.sub)}</p>` : ''}
          ${li ? `<ul class="l hand" style="margin-top:22px">${li}</ul>` : ''}</div>${foot()}</div>`;
    },
  },
};

module.exports = {
  id: 'postpartum',
  label: 'Postpartum and pregnancy',
  description: 'Blush paper, serif type, handwriting, taped notes and a blur-to-clear reveal. Warm and personal.',
  css: CSS,
  coverLayout: 'cover',
  ctaLayout: 'cta',
  layouts,
};
