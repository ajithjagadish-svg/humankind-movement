# Blog expansion drafts: review notes (2026-09-20)

12 of the highest-scoring thin posts, each expanded by inserting new sections into the existing text. Nothing original was removed or reworded, except one added link sentence in the corporate post. Nothing is published. Titles and meta descriptions are unchanged.

To preview: `node server/scripts/apply-blog-expansions.js` (dry run).
To publish all: `node server/scripts/apply-blog-expansions.js --apply`
To publish some: `node server/scripts/apply-blog-expansions.js --apply --only=slug-a,slug-b`

Every source below was looked up on PubMed and read from its abstract. DOIs are linked in each post's footnotes.

| Post | Words | New sources | Notes for you |
|---|---|---|---|
| pelvic-floor-work-beyond-kegels | 507 to 1055 | Hodges 2007; Cochrane (Dumoulin 2018) | Adds an honest paragraph that pelvic floor training works for leaking (56% vs 6% cured). It says leaking should be assessed by a pelvic health physio, and that your breath work sits alongside. It does not prescribe Kegels. Adds a no-squeeze breath exercise. |
| why-i-ask-about-sleep-first | 411 to 751 | Milewski 2014; Gao 2019 | The evidence is from adolescent athletes, and the text says so. Also says a sleep problem may be medical (snoring, stopping breathing). Added h2s to text that had none. Added a /services link (had none). |
| postpartum-recovery-is-not-bouncing-back | 533 to 749 | ACOG Committee Opinion 736 | US guidance: postpartum care is ongoing, contact by 3 weeks, full visit by 12 weeks. |
| chrononutrition-... | 507 to 789 | Jakubowicz 2013 | One 2013 trial in women with metabolic syndrome. Added a caution for people on diabetes medicine, pregnant, breastfeeding, or with a history of disordered eating. |
| knee-pain-on-stairs | 595 to 772 | none | No new citation. The only human-knee sources I found had no readable abstract, so I did not cite them. Adds a warm-up test and when to get the knee checked. Original footnote is still an animal study (already flagged in the post). |
| the-12-week-study-... | 391 to 656 | Henson 2020 | Light activity lowered post-meal insulin and glucose, standing did not. Insulin drop was larger in South Asian participants (23.5% vs 9.3%). One-day lab studies, and the text says so. |
| return-to-exercise-timeline | 506 to 814 | ACOG 736; D'Onofrio 2026 | The 2026 review is framed around female soccer players, but its conclusion is general (6 to 12 weeks after a clinical and functional check, no consistent guidelines). Adds a walking, stairs, carrying, strength, running ladder. |
| come-back-to-yourself-practically | 443 to 610 | none (philosophy post) | Adds h2s and three check-ins. Stays unresolved on purpose. Adds a /services link and a note to see a doctor or counsellor if low for weeks. |
| what-17-trials-say-... | 382 to 600 | none new | Adds limits ("about 37 children per trial" is 626 divided by 17) and a home section. The existing footnote to the 2026 meta-analysis was not re-verified this round. |
| diastasis-recti-... | 513 to 823 | Marttila 2026; Capoccia Giovannini 2026 | Finnish study: average gap about 2.7 cm in women who had given birth, about 1.5 cm in those who had not. Meta-analysis: exercise narrows the gap by about 8 mm, but no difference in a function questionnaire. **Check:** the Finnish abstract lists these group averages right after the "3 cm above the navel" figure, so the exact measuring site for the group averages is not certain. |
| rebuilding-the-core-after-birth | 516 to 855 | Capoccia 2026; Bigdeli 2025; Hodges 2007 | **Please read:** the existing text says a crunch "can push pressure outward". I could not find research showing crunches harm a healed midline, and the reviews found no clear winner between exercise types. The new section is honest about that and moves your argument to sequence. You may want to soften the original sentence too. |
| corporate-wellness-... | 384 to 676 | Song and Baicker 2019 (JAMA); 2021 (Health Affairs) | A large randomised trial found reported behaviours improved, but blood pressure, cholesterol, spending and absence did not. Average completion was 1.3 of 8 modules. I frame this as a reason to grade outcomes, not as proof wellness fails. Existing lines about a "yoga class" and "yoga instructor" are left as they were (cliché references, not claims). |

## Things I deliberately did not do
- Did not change the wording of any of your original paragraphs.
- Did not add anecdotes or client stories.
- Did not add any claim I could not find in an abstract.
- The hip-mobility post (a style reference, not in this batch) still says "biomechanics certification". That is tied to the credential-wording decision.

## Voice checks run
No em dashes added, no "weak" language, no yoga claims, no Kegel prescription, one /services link in every post.
