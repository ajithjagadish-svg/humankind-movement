// The carousel standard, in code. Pure functions, no database, no rendering.
// Written 2026-11-04 after repeated reader feedback that slides read "like a bunch of statements":
// the old slides stated facts one after another with nothing joining them. The checks below turn
// the rules we already keep in memory (plain words, one idea per slide, curiosity, honest limits,
// voice) into things a machine can flag before a carousel goes out.
//
// lintCarousel({ design, slides }) -> { errors, warnings, flow, stats }
//   errors   = must fix before posting (breaks a hard rule)
//   warnings = should fix (a reader will probably stumble)
// Works for both slide shapes: library designs ({layout, data}) and the classic template.

const MAX_SLIDES = 6;
const MAX_HEADLINE_WORDS = 10;        // warn above this
const HARD_HEADLINE_WORDS = 14;       // error above this
const MAX_SLIDE_WORDS = 38;           // warn: more than this is not one idea
const MAX_SENTENCE_WORDS = 20;        // warn: a long sentence is hard on a first read
const MIN_LINK_RATIO = 0.6;           // share of slides after the cover that must join to the one before
const MAX_UNLINKED_RUN = 2;           // error: three statements in a row with nothing joining them
const MAX_GRADE = 8;                  // warn above this reading grade (Flesch-Kincaid)

// Fields that are labels, controls or art, not reading text.
const NON_TEXT = new Set(['photo', 'bgPhoto', 'bgOpacity', 'bgPosition', 'photoShape', 'focus', 'size', 'viewLabel',
  'photos', 'people', 'layout', 'variant', 'bgStyle', 'note', 'eyebrow', 'hint', 'button', 'ctaBtn',
  'art', 'artText', 'filled', 'total', 'legendOn', 'legendOff', 'noteSize', 'percent', 'chip', 'label', 'unit']);

// The one line that carries a slide's idea. Layouts name it differently.
const HEADLINE_KEYS = ['headline', 'title', 'claim', 'word', 'lead', 'big', 'number'];

// Words that join a slide to the one before it, when they open a sentence.
const CONNECTORS = [
  'but', 'so', 'and', 'because', 'that is why', "that's why", 'which is why', 'this is why', 'for that reason',
  'then', 'next', 'first', 'second', 'third', 'finally', 'now', 'still', 'yet', 'also', 'instead', 'however',
  'even so', 'meanwhile', 'plus', 'otherwise', 'here is why', "here's why", 'in short', 'the result', 'the catch',
  'the answer', 'the reason', 'so what', 'what does that mean',
];
const CONNECTOR_RE = new RegExp('(^|[.!?]\\s+)(' + CONNECTORS.map((c) => c.replace(/'/g, "['’]")).join('|') + ')\\b', 'i');

// Study and clinic words that a stranger stumbles on. Allowed in the small print (note), not on the slide.
const JARGON = [
  'randomised', 'randomized', 'crossover', 'cohort', 'meta-analysis', 'meta analysis', 'cross-sectional', 'longitudinal',
  'interoception', 'interoceptive', 'vagal', 'vagus', 'heart rate variability', 'hrv', 'autonomic', 'sympathetic',
  'parasympathetic', 'proprioception', 'proprioceptive', 'biomechanics', 'biomechanical', 'neuroplasticity', 'cortisol',
  'diastasis', 'myofascial', 'hypertrophy', 'plyometric', 'plyometrics', 'effect size', 'confidence interval', 'p-value',
  'statistically', 'significant', 'cohen', 'regression', 'placebo', 'intervention', 'participants', 'respondents',
  'psychophysiological', 'physiological', 'physiologic', 'pathology', 'etiology', 'comorbid', 'comorbidity',
  'sample', 'samples', 'cohorts', 'protocol', 'modality', 'modalities', 'utilise', 'utilize',
];

// Hard brand rules from memory. Each is an error if it appears on a slide.
const HARD_RULES = [
  { re: /\bweak (core|back|glutes?|pelvic floor|hips?|abs)\b/i, msg: 'Weakness language ("weak core", "weak back"). Say coordination instead; the root cause is coordination, starting with breath.' },
  { re: /\bcertified (specialist|coach|trainer)\b|\bNSCA\b/i, msg: 'Credential wording is not allowed here. The title is Founder and Human Biomechanics Coach.' },
  { re: /\bdo (your |some |ten |10 )?kegels?\b|\bkegels? (will|can) fix\b/i, msg: 'This prescribes Kegels. We never prescribe them; the method is breath first.' },
  { re: /—|–/, msg: 'An em dash or en dash is in the text. Use a full stop or a comma.' },
  { re: /\bfact[- ]?check(ed)?\b/i, msg: 'A "fact check" slide or phrase. We do not build fact-check slides; state what the research shows instead.' },
  { re: /\bread the full (article|post|blog)\b|\bread more\b/i, msg: 'A "read the full article" style action. The close must be something done in the app (Save, a comment word, a self-test).' },
];

// Softer voice and honesty checks. Each is a warning.
const SOFT_RULES = [
  { re: /\b(I|I'm|I've|I'll|my|me)\b/, msg: 'First person singular. Branded copy says "we", not "I" (personal-lane carousels are the exception).' },
  { re: /\bwe read the (research|study|paper|evidence)\b/i, msg: '"We read the research" is a crutch line. Say it once in different words in the small print (published research, not our own study).' },
  { re: /\b(not medical advice|not doctors|coaches, not|consult your doctor|ask your doctor|see a (qualified )?professional)\b/i, msg: 'A disclaimer is sitting in the main text. Move it to the small print (note) on the last slide.' },
  { re: /\bamazing|game[- ]changer|revolutionary|miracle|secret|hack\b/i, msg: 'Hype word. Say what happened in plain facts.' },
  { re: /\byoga\b/i, msg: '"Yoga" appears. We do not claim yoga; use it only as a quoted keyword or cliche.' },
  { re: /\b(always|never|everyone|nobody|guaranteed|cure[sd]?|proves?|proof)\b/i, msg: 'A strong claim word (always/never/proves/cure). Check the source supports that much, or soften it.' },
];

function words(s) { return (String(s || '').match(/[A-Za-z0-9À-ɏ'’%$-]+/g) || []); }
function sentences(s) { return String(s || '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean); }
function syllables(w) {
  w = w.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
function grade(text) {
  const ws = words(text), ss = sentences(text);
  if (!ws.length || !ss.length) return 0;
  const syl = ws.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (ws.length / ss.length) + 11.8 * (syl / ws.length) - 15.59;
}

// One slide as {headline, body, note, eyebrow, button, all} regardless of design shape.
function readSlide(sl) {
  const classic = !sl.data;
  const d = sl.data || sl;
  const str = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').join(' ') : (typeof v === 'string' ? v : ''));
  let headlineKey = HEADLINE_KEYS.find((k) => str(d[k]).trim());
  let headline = headlineKey ? str(d[headlineKey]) : '';
  if (!headline && (d.line1 || d.line2)) { headline = (str(d.line1) + ' ' + str(d.line2)).trim(); headlineKey = 'line1'; }
  const parts = [];
  Object.keys(d).forEach((k) => {
    if (NON_TEXT.has(k) || k === headlineKey || (headlineKey === 'line1' && k === 'line2')) return;
    if (classic && k === 'chatBubbles') { (d[k] || []).forEach((b) => b && b.text && parts.push(b.text)); return; }
    const v = d[k];
    if (typeof v === 'string' || Array.isArray(v)) parts.push(str(v));
  });
  const body = parts.join(' ').trim();
  return { headline, body, note: str(d.note), eyebrow: str(d.eyebrow), button: str(d.button || d.ctaBtn), all: (headline + ' ' + body).trim() };
}

function endsWithQuestion(s) { return /\?\s*$/.test(String(s || '').trim()); }

function lintCarousel(carousel) {
  const errors = [], warnings = [];
  const slides = (carousel && carousel.slides) || [];
  const read = slides.map(readSlide);
  const n = read.length;
  const add = (list, slide, msg) => list.push(slide ? 'Slide ' + slide + ': ' + msg : msg);

  if (n > MAX_SLIDES) add(errors, 0, 'More than ' + MAX_SLIDES + ' slides (' + n + '). The standard is ' + MAX_SLIDES + ' or fewer.');
  if (n < 3) add(warnings, 0, 'Fewer than 3 slides. A carousel needs a question, an answer and a close.');

  // Per-slide checks
  read.forEach((s, i) => {
    const no = i + 1;
    if (!s.headline) add(errors, no, 'No headline. Every slide needs one idea in one line.');
    const hw = words(s.headline).length;
    if (hw > HARD_HEADLINE_WORDS) add(errors, no, 'Headline is ' + hw + ' words. Aim for about 8 and never more than ' + HARD_HEADLINE_WORDS + '.');
    else if (hw > MAX_HEADLINE_WORDS) add(warnings, no, 'Headline is ' + hw + ' words. About 8 reads on the first try.');
    const bw = words(s.all).length;
    if (bw > MAX_SLIDE_WORDS) add(warnings, no, bw + ' words on the slide. More than ' + MAX_SLIDE_WORDS + ' is usually two ideas; split it or cut it.');
    sentences(s.all).forEach((sent) => {
      const c = words(sent).length;
      if (c > MAX_SENTENCE_WORDS) add(warnings, no, 'A sentence is ' + c + ' words long ("' + sent.slice(0, 48) + '..."). Break it up.');
    });
    // Jargon belongs in the small print only.
    const low = ' ' + s.all.toLowerCase().replace(/[^a-z0-9% -]/g, ' ') + ' ';
    const hit = JARGON.filter((j) => low.includes(' ' + j + ' ') || low.includes(' ' + j + 's ')).slice(0, 4);
    if (hit.length) add(warnings, no, 'Study or clinic words a stranger may not know: ' + hit.join(', ') + '. Say it in everyday words (or keep it to the small print).');
    HARD_RULES.forEach((r) => { if (r.re.test(s.all + ' ' + s.button + ' ' + s.note + ' ' + s.eyebrow)) add(errors, no, r.msg); });
    SOFT_RULES.forEach((r) => { if (r.re.test(s.all)) add(warnings, no, r.msg); });
  });

  // Reading level across the whole carousel
  const allText = read.map((s) => s.all).join(' ');
  const g = grade(allText);
  if (g > MAX_GRADE) add(warnings, 0, 'Reading level is about grade ' + g.toFixed(1) + '. The target is grade ' + MAX_GRADE + ' or lower: shorter sentences, shorter words.');

  // Flow: does each slide join to the one before it?
  const flow = { linked: 0, total: Math.max(0, n - 1), ratio: 1, perSlide: [], longestRun: 0 };
  let run = 0;
  read.forEach((s, i) => {
    if (i === 0) { flow.perSlide.push({ n: 1, linked: null, why: 'cover' }); return; }
    const prev = read[i - 1];
    let why = '';
    if (CONNECTOR_RE.test(s.headline + ' ' + s.body)) why = 'connector';
    else if (endsWithQuestion(prev.headline) || endsWithQuestion(prev.body)) why = 'answers the question before it';
    else if (endsWithQuestion(s.headline)) why = 'opens a question';
    const linked = !!why;
    flow.perSlide.push({ n: i + 1, linked, why: why || 'a plain statement with nothing joining it to the slide before' });
    if (linked) { flow.linked++; run = 0; } else { run++; flow.longestRun = Math.max(flow.longestRun, run); }
  });
  flow.ratio = flow.total ? flow.linked / flow.total : 1;
  if (flow.total >= 3 && flow.ratio < MIN_LINK_RATIO) {
    add(warnings, 0, 'Only ' + flow.linked + ' of ' + flow.total + ' slides join to the one before (But, So, And, Because, That is why, or an answer to a question). It will read like a list of statements. Aim for at least ' + Math.ceil(MIN_LINK_RATIO * flow.total) + '.');
  }
  if (flow.longestRun > MAX_UNLINKED_RUN) {
    add(errors, 0, flow.longestRun + ' slides in a row are plain statements with nothing joining them. Add a "But", "So", "And" or turn one into a question the next slide answers.');
  }

  // Cover: should open a question, not announce a topic.
  if (n) {
    const cover = read[0];
    if (!endsWithQuestion(cover.headline) && !endsWithQuestion(cover.body) && !/\d/.test(cover.all)) {
      add(warnings, 1, 'The cover neither asks a question nor gives a number. Start with the outcome the reader wants and hold back the answer.');
    }
    // Close: last slide needs an in-app action and honest small print when a study is used.
    const last = read[n - 1];
    if (n >= 3 && !last.button && !/\b(save|comment|share|send|reply|try)\b/i.test(last.all)) {
      add(warnings, n, 'The close has no low-effort action (Save, a comment word, a self-test). Give one.');
    }
    const usesStudy = /\b(study|trial|review|report|survey|researchers?)\b/i.test(allText);
    const hasSource = read.some((s) => /\b(source|doi|et al|journal|published)\b/i.test(s.note) || /\b(19|20)\d\d\b/.test(s.note));
    if (usesStudy && !hasSource) add(warnings, n, 'The carousel cites a study but the small print has no source. Add the source and the limits (note field) on the last slide.');
  }

  const stats = { slides: n, words: words(allText).length, grade: Number(g.toFixed(1)) };
  return { errors, warnings, flow, stats, ok: errors.length === 0 };
}

// Short badge text for lists and the dashboard.
function summary(carousel) {
  const r = lintCarousel(carousel);
  if (r.errors.length) return { level: 'fix', text: r.errors.length + ' to fix' };
  if (r.warnings.length) return { level: 'review', text: r.warnings.length + ' to review' };
  return { level: 'ok', text: 'checks pass' };
}

module.exports = { lintCarousel, summary, readSlide, grade, CONNECTORS, JARGON, MAX_SLIDES, MIN_LINK_RATIO };
