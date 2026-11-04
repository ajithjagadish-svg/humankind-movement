// Shared pieces for the category carousel designs (postpartum, corporate, neurodivergent, nervous system,
// movement). One source of truth: the admin editor preview (HTML in an iframe) and the PNG renderers
// (puppeteer, server route and CLI script) all call renderSlidePage() in ./index.js, so what you see in the
// editor is what gets exported. The original "classic" template is NOT here; it still lives in
// server/views/admin/carousel-editor.ejs and server/scripts/render-one-carousel.js.
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', '..', 'assets');
const PHOTO_DIR = path.join(ASSETS, 'carousel-photos');
const FONT_DIR = path.join(ASSETS, 'fonts');
const HANDLE = '@humankind_movement';

// Logo mark: exact paths from assets/img/logo.svg (see the "never redraw the logo" rule).
const MARK = '<svg class="mark" viewBox="328 294 152 153" xmlns="http://www.w3.org/2000/svg"><rect class="mv" x="398.7" y="294.3" width="11.7" height="59.4"/><rect class="mv" x="398.7" y="387" width="11.7" height="59.4"/><rect class="mh" x="328.5" y="364.5" width="59.4" height="11.7"/><rect class="mh" x="420.3" y="364.5" width="59.4" height="11.7"/></svg>';

function esc(v) {
  return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// A textarea "one per line" field is stored as an array; accept a string too.
function lines(v) {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  return String(v || '').split('\n').map((s) => s.trim()).filter(Boolean);
}

function listPhotos() {
  try {
    return fs.readdirSync(PHOTO_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f)).map((f) => f.replace(/\.[^.]+$/, '')).sort();
  } catch (e) { return []; }
}

function photoFileName(name) {
  let hit = null;
  try { hit = fs.readdirSync(PHOTO_DIR).find((f) => f.replace(/\.[^.]+$/, '') === name); } catch (e) { /* photos are private and not in git, so the folder may not exist on a server */ }
  return hit || null;
}

// ctx.mode 'preview' => URLs served by the admin routes; 'file' => file:// URLs for puppeteer.
function makeCtx(mode) {
  return {
    mode,
    photoUrl(name) {
      if (!name) return '';
      if (/^(https?:|\/|file:)/.test(name)) return mode === 'file' && name.startsWith('/assets/') ? 'file://' + path.join(__dirname, '..', '..', '..', name) : name;
      const f = photoFileName(name);
      if (!f) return '';
      return mode === 'file' ? 'file://' + path.join(PHOTO_DIR, f) : '/admin/carousel-photos/' + encodeURIComponent(f);
    },
    fontUrl() {
      return mode === 'file' ? 'file://' + path.join(FONT_DIR, 'Caveat.ttf') : '/admin/carousel-fonts/Caveat.ttf';
    },
  };
}

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{margin:0;background:#888}
.s{width:540px;height:675px;position:relative;overflow:hidden;font-family:"Avenir Next","Avenir",-apple-system,"Helvetica Neue",Arial,sans-serif;color:var(--ink);background:var(--bg)}
.hand{font-family:"Caveat","Bradley Hand",cursive}
.serif{font-family:"Didot","Bodoni 72","Baskerville",Georgia,serif}
.cond{font-family:"Avenir Next Condensed","Avenir Next",Arial Narrow,sans-serif;font-weight:800;text-transform:uppercase;letter-spacing:.01em}
.foot{position:absolute;left:44px;right:44px;bottom:30px;display:flex;justify-content:space-between;align-items:center;z-index:5;padding-top:14px;border-top:1px solid var(--line)}
.brand{display:flex;align-items:center;gap:9px}
.mark{width:22px;height:22px}
.mark .mv{fill:var(--ink)}.mark .mh{fill:var(--accent)}
.wm{font-size:12.5px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--ink)}
.hd{font-size:12.5px;font-weight:500;color:var(--muted)}
.top{position:absolute;left:44px;right:44px;top:38px;display:flex;justify-content:space-between;align-items:baseline;z-index:5}
.eye{font-size:13.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--accent)}
.cnt{font-size:13.5px;font-weight:600;color:var(--muted);letter-spacing:.04em}
.small{position:absolute;left:44px;right:44px;bottom:78px;font-size:13.5px;line-height:1.4;color:var(--muted);z-index:5}
.cta{display:inline-block;font-weight:700;font-size:15px;padding:12px 22px;border-radius:99px}
.circle{border-radius:50%;overflow:hidden}
.circle img{width:100%;height:100%;object-fit:cover;display:block}
`;

function foot() {
  return `<div class="foot"><div class="brand">${MARK}<span class="wm">Humankind Movement</span></div><span class="hd">${HANDLE}</span></div>`;
}
function top(eye, i, n) {
  return `<div class="top"><span class="eye">${esc(eye)}</span><span class="cnt">${i + 1} / ${n}</span></div>`;
}
function small(text, extra) {
  return text ? `<p class="small" style="${extra || ''}">${esc(text)}</p>` : '';
}

function page(ctx, css, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:"Caveat";src:url("${ctx.fontUrl()}");}${BASE_CSS}${css}</style></head><body>${body}</body></html>`;
}

// Text-size helper: pick a font size by text length so long headlines still fit.
function fit(text, rules) {
  const len = String(text || '').length;
  for (const [maxLen, size] of rules) if (len <= maxLen) return size;
  return rules[rules.length - 1][1];
}

// A dot grid, `filled` of `total`, `cols` per row. Used for "20 of 160" style graphics.
function dotGrid(filled, total, cols, step, size, colors) {
  let d = '';
  for (let i = 0; i < total; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    const style = i < filled ? `background:${colors.on};` : `border:${colors.borderW || 2}px solid ${colors.off};`;
    d += `<i style="position:absolute;left:${col * step[0]}px;top:${row * step[1]}px;width:${size}px;height:${size}px;border-radius:50%;${style}"></i>`;
  }
  return d;
}

module.exports = { ASSETS, PHOTO_DIR, FONT_DIR, HANDLE, MARK, esc, lines, listPhotos, photoFileName, makeCtx, BASE_CSS, foot, top, small, page, fit, dotGrid };
