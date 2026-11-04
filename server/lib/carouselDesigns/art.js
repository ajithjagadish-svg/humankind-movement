// Optional quiet artwork for blank areas of a slide: set `art` (a name below) in a slide's data. Hand-drawn style line art in the
// postpartum palette (terracotta #c4584a on blush). No faces. Positions are CSS px on the 540x675 slide.
const ACC = '#c4584a';
const BLUSH = '#efc4b4';

function wavePath(w, h, cycles, amp) {
  const pts = [];
  for (let x = 0; x <= w; x += 4) pts.push([x, h / 2 - amp * Math.sin((2 * Math.PI * cycles * x) / w)]);
  return pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
}

// Side view of someone lying on their back, knees bent, with two soft arcs over the belly (a gentle breath). No face.
function lying(w) {
  return `<svg width="${w}" height="${Math.round(w * 0.3)}" viewBox="0 0 360 108" fill="none" stroke="${ACC}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="180" cy="90" rx="176" ry="20" fill="${BLUSH}" stroke="none" opacity=".5"/>
    <path d="M10 94 H350" stroke-width="1.6" opacity=".3"/>
    <rect x="10" y="78" width="54" height="15" rx="7" fill="${BLUSH}" stroke="none" opacity=".9"/>
    <ellipse cx="36" cy="72" rx="16" ry="13" fill="#f8ebe3"/>
    <path d="M54 80 C 80 66, 116 64, 150 72"/>
    <path d="M58 90 C 90 92, 126 92, 152 90" opacity=".5"/>
    <path d="M150 72 C 172 66, 192 52, 208 38 C 214 33, 222 36, 226 44 C 232 58, 238 74, 244 88"/>
    <path d="M150 90 C 176 80, 196 62, 214 50 C 220 46, 226 50, 230 58 C 236 70, 242 82, 248 90" opacity=".4"/>
    <path d="M240 90 C 246 82, 254 82, 262 88 C 266 91, 270 92, 274 92"/>
    <path d="M92 60 C 106 46, 126 46, 140 60" opacity=".65"/>
    <path d="M82 50 C 98 26, 138 26, 154 50" opacity=".35"/>
  </svg>`;
}

const ART = {
  // Cover: the lying figure, bottom left, over the blush blob.
  'lying-cover': () => `<div style="position:absolute;left:34px;bottom:96px;z-index:1;pointer-events:none">${lying(330)}</div>`,
  // Checklist: the lying figure centred under the list.
  'lying-list': () => `<div style="position:absolute;left:96px;top:490px;z-index:1;pointer-events:none">${lying(348)}</div>`,
  // One slow breath line with a pale circle and "in" / "out" cues (two breaths).
  'breath-line': () => `<div style="position:absolute;left:44px;right:44px;top:392px;height:190px;z-index:1;pointer-events:none">
    <svg width="452" height="190" viewBox="0 0 452 190" fill="none">
      <circle cx="338" cy="76" r="60" fill="${BLUSH}" opacity=".5"/>
      <path d="${wavePath(452, 150, 2, 52)}" stroke="${ACC}" stroke-width="3.2" stroke-linecap="round" transform="translate(0,8)"/>
    </svg>
    <div class="hand" style="position:absolute;left:42px;top:-4px;font-size:30px;color:${ACC}">in</div>
    <div class="hand" style="position:absolute;left:150px;top:146px;font-size:30px;color:${ACC}">out</div>
    <div class="hand" style="position:absolute;left:266px;top:-4px;font-size:30px;color:${ACC};opacity:.8">in</div>
  </div>`,
  // Three facts as big numerals (study slide). Pass facts via art text: "88|mothers, one hospital;3|supervised one-hour sessions;0|comparison group"
  'numerals': (d) => {
    const cols = String(d.artText || '88|mothers, one hospital;3|supervised one-hour sessions;0|comparison group').split(';').map((c) => c.split('|'));
    const html = cols.map(([n, t], k) => `<div style="flex:1;padding:0 12px;${k ? 'border-left:1.5px solid rgba(196,88,74,.45)' : 'padding-left:0'}">
      <div class="serif" style="font-size:72px;line-height:1;color:#3b2723">${n}</div>
      <div style="font-size:15px;line-height:1.25;color:#7a5f58;font-weight:600;margin-top:6px">${t}</div></div>`).join('');
    return `<div style="position:absolute;left:44px;right:44px;top:440px;display:flex;z-index:1;pointer-events:none">${html}</div>`;
  },
  // A loose breath underline for the closing slide.
  'breath-underline': () => `<div style="position:absolute;left:44px;right:44px;top:380px;z-index:1;pointer-events:none"><svg width="452" height="90" viewBox="0 0 452 90" fill="none"><circle cx="112" cy="42" r="46" fill="${BLUSH}" opacity=".45"/><path d="${wavePath(452, 60, 2.5, 20)}" stroke="${ACC}" stroke-width="3" stroke-linecap="round" opacity=".85" transform="translate(0,10)"/></svg></div>`,
  // A quiet crescent moon with a few stars (sleep).
  'moon': () => `<div style="position:absolute;left:44px;top:380px;z-index:1;pointer-events:none"><svg width="452" height="190" viewBox="0 0 452 190" fill="none"><circle cx="300" cy="96" r="78" fill="${BLUSH}" opacity=".5"/><path d="M286 40 C 236 50, 214 110, 252 150 C 276 172, 318 166, 338 140 C 296 150, 262 114, 286 40 Z" stroke="${ACC}" stroke-width="3.2" stroke-linejoin="round" fill="#f8ebe3"/><path d="M130 60 l0 22 M119 71 l22 0" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/><path d="M372 54 l0 16 M364 62 l16 0" stroke="${ACC}" stroke-width="3" stroke-linecap="round"/><path d="M96 126 l0 12 M90 132 l12 0" stroke="${ACC}" stroke-width="2.6" stroke-linecap="round" opacity=".7"/></svg></div>`,
  // A short breath wave under a headline (taped-notes slide).
  'breath-short': () => `<div style="position:absolute;left:44px;top:176px;z-index:1;pointer-events:none"><svg width="250" height="44" viewBox="0 0 250 44" fill="none"><path d="${wavePath(250, 36, 1.5, 12)}" stroke="${ACC}" stroke-width="3" stroke-linecap="round" opacity=".8" transform="translate(0,4)"/></svg></div>`,
};

module.exports = { ART };
