// `description` is the short blurb used on the /blog listing. `metaDescription`
// (120-155 chars) and `intro` are used on the topic hub page. `service` is the
// single most relevant service page for a reader who finishes a post in that topic.
module.exports = [
  {
    key: 'philosophy',
    label: 'Philosophy',
    description: "The thinking behind the coaching - essays on what health actually means when it isn't about a number on a scale or a personal record.",
    metaDescription: "Essays on what health means when it isn't a number on a scale or a personal record. The thinking behind Humankind Movement's coaching.",
    intro: [
      'Most advice treats health as something to earn: a target weight, a personal best, a streak. Our philosophy starts somewhere else. Health comes before success, and awareness comes before action.',
      "These essays work through that idea in plain language. Why willpower is the wrong tool, why progress rarely looks like a milestone, and what it means to build a relationship with yourself before you build a routine. If you want the framework that ties them together, read <a href=\"/the-method\">the Humankind Method</a>.",
    ],
    service: 'one-to-one-coaching',
  },
  {
    key: 'movement',
    label: 'Movement',
    description: 'How the body actually moves, and what most advice about strength, mobility, and pain gets wrong.',
    metaDescription: 'How the body actually moves, and what most advice on strength, mobility and pain gets wrong. Practical essays from a coach who starts with how you move.',
    intro: [
      'Pain, stiffness and plateaus rarely have a single cause. Before we decide what to change, we look at how you breathe, coordinate and load your body.',
      "These posts explain that thinking. What mobility and flexibility actually are, why the place that hurts isn't always the source, and how to train around an injury without losing confidence in your body.",
    ],
    service: 'one-to-one-coaching',
  },
  {
    key: 'sleep',
    label: 'Sleep & Recovery',
    description: "Sleep and recovery aren't a reward for training hard. They're half of the work.",
    metaDescription: 'Sleep and recovery are half of the work, not a reward for training hard. Essays on what poor sleep is telling you and how to respond to it.',
    intro: [
      'We ask about sleep before we ask about training, because sleep decides how much of any programme your body can actually use.',
      'These essays cover what poor sleep is trying to tell you, why recovery is a skill you can practise, and how to make small changes that hold up when life gets busy.',
    ],
    service: 'one-to-one-coaching',
  },
  {
    key: 'food',
    label: 'Food & Nourishment',
    description: 'Food as fuel for a body that has to keep functioning, not a set of rules to follow perfectly.',
    metaDescription: 'Food as fuel for a body that has to keep functioning, not a list of rules. Essays on hunger cues, food awareness and eating for your nervous system.',
    intro: [
      'Food rules tend to create guilt more than health. Here we look at hunger, habit and feeling, why clean eating can quietly do harm, and how to notice what your body is actually asking for.',
      "Nothing here is a meal plan. It's a way of paying attention that a plan can then be built on.",
    ],
    service: 'one-to-one-coaching',
  },
  {
    key: 'nervous-system',
    label: 'Time Alone & Nervous System',
    description: "The fourth pillar most fitness content skips - what your nervous system needs when nobody's watching.",
    metaDescription: 'The pillar most fitness content skips: what your nervous system needs when nobody is watching. Essays on stillness, regulation and time alone.',
    intro: [
      'Time alone, stillness and regulation are part of health, not a break from it.',
      'These essays explain how stress, pushing through and constant stimulation show up in the body, and why regulation starts with the body rather than with willpower.',
    ],
    service: 'one-to-one-coaching',
  },
  {
    key: 'postpartum',
    label: 'Postpartum Recovery',
    description: "Recovery after pregnancy and birth isn't a six-week deadline or a bounce-back goal. It's a coordination process with its own timeline.",
    metaDescription: 'Postpartum recovery is a coordination process with its own timeline, not a six-week deadline. Essays on core, pelvic floor and returning to movement.',
    intro: [
      'Recovery after pregnancy and birth is not a deadline or a bounce-back goal. It is a process of rebuilding coordination, starting with breath, at your own pace.',
      'These posts cover diastasis recti, pelvic floor work beyond Kegels, when to return to exercise, and the mental side of recovery. This is education, not medical advice: speak to your doctor or pelvic health physiotherapist about your own situation.',
    ],
    service: 'postpartum-support',
  },
  {
    key: 'neurodivergent',
    label: 'Neurodivergent Coaching',
    description: "Movement coaching built around how a neurodivergent body and mind actually work, not compliance with someone else's program.",
    metaDescription: 'Movement coaching built around how neurodivergent bodies and minds actually work, not compliance. Evidence-informed essays for individuals, parents and coaches.',
    intro: [
      'Many neurodivergent people are not avoiding exercise. The way exercise is usually taught is avoiding them. We coach around sensory needs, instructions that make sense, and strengths first.',
      'These essays cover autism, ADHD and movement, what the research says, and how coaches and parents can adapt what they do.',
    ],
    service: 'neurodivergent-coaching',
  },
];
