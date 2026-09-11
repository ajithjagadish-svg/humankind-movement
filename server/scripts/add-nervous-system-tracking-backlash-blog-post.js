// Sourced from a LinkedIn post by Dominique Antiglio (sophrologist) that
// referenced the Global Wellness Summit's 2026 trends report. Rewritten
// entirely from primary sources rather than paraphrasing her post - all
// three factual claims (orthosomnia, the GWS report's specific trends and
// language, and the allostatic-load physiology) were independently verified
// via PubMed and the report's own site before writing this. See chat log
// 2026-09-11 for the verification pass. Left as draft pending review.
require('dotenv').config();
const { connectDB } = require('../config/db');
const BlogPost = require('../models/BlogPost');

const BODY_HTML = `<p>A client of mine bought a sleep tracker to fix her sleep. Within a few weeks she was lying awake at night, not because anything was actually wrong with her sleep, but because she was checking whether her score would be good enough by morning. That is not a coincidence, and it is not rare. Sleep clinicians have a name for it now: orthosomnia, an anxious fixation on getting a "correct" sleep score that ends up creating the very insomnia the tracker was bought to solve.<sup class="fn"><a href="#fn1" id="fnref1">1</a></sup></p>

<h2>What a 150-Page Industry Report Just Admitted</h2>
<p>This year the Global Wellness Summit published its Future of Wellness report, a 150-plus page forecast built with input from experts across the wellness industry.<sup class="fn"><a href="#fn2" id="fnref2">2</a></sup> One of its ten named trends for 2026 is what it calls the over-optimization backlash: after a decade of scoring every night of sleep and tracking every step, the report says wellbeing had quietly turned into something people perform correctly instead of something they actually feel.</p>
<p>The part that stood out to me most is a separate trend the same report names as one of the defining frontiers of the coming years: nervous system regulation. The report's own language is blunt about why. Constant digital stimulation, blurred work boundaries, and nonstop social media keep a lot of people in a near-constant state of activation, a chronic low-grade fight-or-flight that never fully switches off.</p>

<h2>Why That State Actually Costs You Something</h2>
<p><span class="hl">A nervous system that never fully stands down is not a mild inconvenience. It has a measurable physiological cost.</span> Chronic activation of the stress response is linked to elevated inflammatory markers, disrupted sleep architecture, higher cortisol, and measurable effects on memory and cognitive function.<sup class="fn"><a href="#fn3" id="fnref3">3</a></sup> None of that shows up on a sleep score or a step count. It shows up as the very things people are trying to track their way out of.</p>

<h2>Where This Actually Shows Up in Coaching</h2>
<p>In my own work, the pattern is consistent with what the report describes. People arrive with detailed data about their health and very little sense of what their own body actually feels like from the inside. They can tell me their resting heart rate. They usually cannot tell me where they are holding tension, or whether their breath is doing something different right now than it was ten minutes ago.</p>
<p>The body does not repair itself while it is bracing. Regulation, actually coming back to a calmer state instead of just measuring whether you are in one, is not a wellness extra. It is the floor that everything else, sleep, strength, recovery, gets built on. That is exactly where <a href="/services/one-to-one-coaching">one-to-one coaching</a> starts, before we ever talk about a program.</p>

<div class="footnotes"><ol>
<li id="fn1">Baron KG, Abbott S, Jao N, Manalo N, Mullen R. Orthosomnia: Are Some Patients Taking the Quantified Self Too Far? <em>J Clin Sleep Med.</em> 2017;13(2):351-354. <a href="https://doi.org/10.5664/jcsm.6472" target="_blank" rel="noopener">doi:10.5664/jcsm.6472</a>. <a href="#fnref1">↩</a></li>
<li id="fn2">Global Wellness Summit. The Future of Wellness: 2026 Trends. Published January 27, 2026. <a href="https://www.globalwellnesssummit.com/2026trends/" target="_blank" rel="noopener">globalwellnesssummit.com/2026trends</a>. <a href="#fnref2">↩</a></li>
<li id="fn3">McEwen BS. Sleep deprivation as a neurobiologic and physiologic stressor: Allostasis and allostatic load. <em>Metabolism.</em> 2006;55(10 Suppl 2):S20-S23. <a href="https://doi.org/10.1016/j.metabol.2006.07.008" target="_blank" rel="noopener">doi:10.1016/j.metabol.2006.07.008</a>. <a href="#fnref3">↩</a></li>
</ol></div>`;

async function main() {
  await connectDB();

  const slug = 'health-tracking-nervous-system-backlash';
  const existingDupe = await BlogPost.findOne({ slug });
  if (existingDupe) throw new Error(`A post with slug "${slug}" already exists.`);

  const post = await BlogPost.create({
    slug,
    title: 'Why More Health Tracking Can Quietly Make You Less Well',
    meta: 'A 2026 industry report built with hundreds of experts names a real sleep condition and calls nervous system regulation the next wellness frontier.',
    keyword: 'nervous system regulation wellness tracking',
    category: 'nervous-system',
    categoryLabel: 'Time Alone & Nervous System',
    bodyHtml: BODY_HTML,
    readMins: 3,
    status: 'draft',
    notes: 'Sourced from a LinkedIn post by sophrologist Dominique Antiglio referencing the Global Wellness Summit 2026 report - all three claims (orthosomnia, the report\'s specific trends/language, and allostatic-load physiology) independently re-verified via PubMed and the report\'s own site rather than trusting the LinkedIn paraphrase. Left as draft pending review. Companion carousel needs a real photo of Ajith before it can be rendered/scheduled.',
  });

  console.log('Created BlogPost:', post._id.toString(), '| slug:', post.slug, '| title len:', post.title.length, '| meta len:', post.meta.length);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
