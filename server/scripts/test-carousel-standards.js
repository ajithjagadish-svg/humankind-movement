// Unit tests for server/lib/carouselStandards.js. No database. Run: node server/scripts/test-carousel-standards.js
const assert = require('assert');
const { lintCarousel, summary } = require('../lib/carouselStandards');
let pass = 0;
const t = (name, fn) => { try { fn(); pass++; console.log('ok   ' + name); } catch (e) { console.error('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; } };
const lib = (rows) => ({ design: 'nervous', slides: rows.map(([headline, text, extra]) => ({ layout: 'text', data: Object.assign({ headline, text }, extra || {}) })) });

// The 2026-10 wording that readers called "a bunch of statements", and its 2026-11-04 rewrite.
const OLD = lib([
  ['Do short breaks make people work better?', 'A 2022 review pulled together 22 groups of workers, 2,335 people in all.'],
  ['Short breaks gave small gains.', 'More energy and less tiredness. Small effects.'],
  ['For work output, no clear overall effect.', 'The difference was too small to be sure of.'],
  ['The clearer change was on simpler tasks.', 'Breaks did help performance on less demanding work.'],
  ['A quiet room is not a magic fix.', 'People need to know how to rest in it.'],
  ['Talk to us.', 'A first call is about when your energy drops.', { button: 'Comment RECOVERY' }],
]);
const NEW = lib([
  ['Do short breaks help people work better?', 'A 2022 review gathered 22 groups of people, 2,335 in all. So what did it find?'],
  ['First, people felt better.', 'After a short break they had a bit more energy and felt less tired. But the change was small.'],
  ['But did they get more done?', 'Not clearly. Across all kinds of work, the difference was too small to be sure of.'],
  ['Easy tasks were different.', 'On work that needs less thinking, breaks did help the work itself. And longer breaks helped a little more.'],
  ['So a quiet room is not enough.', 'A room only helps if people know how to rest in it, and feel it is OK to use it.'],
  ['That is why we start with your energy.', 'A first call is about when your energy drops. Then a workshop shows people how to use a short break.', { button: 'Comment RECOVERY', note: 'Source: Albulescu et al., PLoS One, 2022.' }],
]);

t('old statement-list wording fails the flow check', () => { const r = lintCarousel(OLD); assert(r.errors.some((e) => /in a row/.test(e)), r.errors.join('|')); assert(r.flow.ratio < 0.6); });
t('rewritten connected wording passes with no errors', () => { const r = lintCarousel(NEW); assert.deepStrictEqual(r.errors, []); assert.strictEqual(r.flow.linked, 5); });
t('a question on one slide counts as joined when the next slide answers it', () => {
  const r = lintCarousel(lib([['Why does it hurt?', 'x'], ['The hips are doing the work.', 'y']])); assert.strictEqual(r.flow.perSlide[1].linked, true); });
t('more than 6 slides is an error', () => { const r = lintCarousel(lib(Array(7).fill(['But why?', 'Because.']))); assert(r.errors.some((e) => /More than 6/.test(e))); });
t('em dash is an error', () => { const r = lintCarousel(lib([['Short breaks — do they work?', 'ok'], ['But they do.', 'ok'], ['So try one.', 'ok']])); assert(r.errors.some((e) => /dash/.test(e))); });
t('weakness language is an error', () => { const r = lintCarousel(lib([['A weak core is the problem.', 'ok'], ['But why?', 'ok'], ['So try this.', 'ok']])); assert(r.errors.some((e) => /Weakness/.test(e))); });
t('"read the full article" close is an error', () => { const r = lintCarousel(lib([['Why?', 'ok'], ['So.', 'ok', { button: 'Read the full article' }]])); assert(r.errors.some((e) => /read the full/i.test(e))); });
t('missing headline is an error', () => { const r = lintCarousel(lib([['', 'text only'], ['But why?', 'ok'], ['So.', 'ok']])); assert(r.errors.some((e) => /No headline/.test(e))); });
t('study jargon is a warning, not an error', () => { const r = lintCarousel(lib([['A randomised crossover trial', 'ok'], ['But it was small.', 'ok'], ['So.', 'ok']])); assert(r.warnings.some((e) => /randomised/.test(e))); assert(!r.errors.some((e) => /randomised/.test(e))); });
t('disclaimer in the main text is flagged; in the note it is not', () => {
  const a = lintCarousel(lib([['Why?', 'We are not doctors.'], ['So.', 'ok']])); assert(a.warnings.some((e) => /small print/.test(e)));
  const b = lintCarousel(lib([['Why?', 'ok'], ['So.', 'ok', { note: 'We are not doctors.' }]])); assert(!b.warnings.some((e) => /small print/.test(e))); });
t('first person singular is a warning', () => { const r = lintCarousel(lib([['Why I stopped?', 'ok'], ['But I did.', 'ok'], ['So.', 'ok']])); assert(r.warnings.some((e) => /First person/.test(e))); });
t('a study with no source in the small print is a warning', () => { const r = lintCarousel(lib([['What did the study find?', 'A study of 40 people.'], ['But it was small.', 'ok'], ['So try it.', 'ok', { button: 'Save this' }]])); assert(r.warnings.some((e) => /no source/.test(e))); });
t('classic-template slides are read too', () => {
  const r = lintCarousel({ design: 'classic', slides: [{ headline: 'Why does it hurt?', sub: 'x', bullets: ['a'] }, { headline: 'But the back is fine.', sub: 'y' }, { headline: 'So move.', ctaBtn: 'Save this' }] });
  assert.strictEqual(r.flow.linked, 2); assert.deepStrictEqual(r.errors, []); });
t('summary badge levels', () => { assert.strictEqual(summary(OLD).level, 'fix'); assert.notStrictEqual(summary(NEW).level, 'fix'); });
t('empty carousel does not crash', () => { lintCarousel({}); lintCarousel({ slides: [] }); });
console.log('\n' + pass + ' passed' + (process.exitCode ? ', some FAILED' : ''));
