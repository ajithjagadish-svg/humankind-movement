const express = require('express');
const ContactSubmission = require('../models/ContactSubmission');
const IntakeSubmission = require('../models/IntakeSubmission');
const EbookLead = require('../models/EbookLead');
const { sendResourceEmail } = require('../services/mailer');

const router = express.Router();

const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvzezebd';

// Fire-and-forget: the contact form's "email me on submit" behaviour stays
// working through Formspree, but the client never talks to Formspree
// directly anymore and the response to the visitor never waits on it.
function forwardToFormspree(body) {
  fetch(FORMSPREE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }).catch((err) => {
    console.error('Formspree forwarding failed:', err.message);
  });
}

const CONTACT_LOCALES = ['en', 'es', 'fr'];

router.post('/contact', async (req, res) => {
  const { name, email, phone, topic, location, message, locale, _gotcha } = req.body;

  // Honeypot: a bot fills every field, a human never sees this one. Pretend
  // success either way so bots don't learn to avoid it.
  if (_gotcha) return res.json({ ok: true });

  if (!name || !email || !phone || !topic || !message) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  const submissionLocale = CONTACT_LOCALES.includes(locale) ? locale : 'en';

  await ContactSubmission.create({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    topic,
    location: (location || '').trim(),
    message: message.trim(),
    locale: submissionLocale,
  });

  const localeSuffix = submissionLocale === 'en' ? '' : ` (${submissionLocale.toUpperCase()})`;
  forwardToFormspree({ name, email, phone, topic, location, message, _subject: `New contact form message from Humankind Movement${localeSuffix}` });

  res.json({ ok: true });
});

const REQUIRED_INTAKE_FIELDS = [
  'fullName',
  'email',
  'mobileNumber',
  'dateOfBirth',
  'height',
  'bodyWeight',
  'location',
  'emergencyContact',
  'healthHistory',
  'currentPainOrDiscomfort',
  'sleepHours',
  'typicalDay',
  'activityLevel',
  'fitnessEquipment',
  'goal',
  'dietaryPreference',
  'sessionPreference',
];

router.post('/intake', async (req, res) => {
  const body = req.body;

  if (body._gotcha) return res.json({ ok: true });

  const missing = REQUIRED_INTAKE_FIELDS.some((field) => !body[field]);
  if (missing || !body.agreesToReschedulingPolicy) {
    return res.status(400).json({ error: 'Please fill in all required fields and agree to the rescheduling policy.' });
  }

  await IntakeSubmission.create({
    ...body,
    lifestyleHabits: [].concat(body.lifestyleHabits || []),
    agreesToReschedulingPolicy: Boolean(body.agreesToReschedulingPolicy),
  });

  res.json({ ok: true });
});

router.post('/ebook-signup', async (req, res) => {
  const { name, email, mobileNumber, resource, _gotcha } = req.body;

  if (_gotcha) return res.json({ ok: true });

  if (!email) {
    return res.status(400).json({ error: 'Please share your email.' });
  }

  const resourceSlug = (resource || '').trim() || undefined;

  await EbookLead.create({
    name: (name || '').trim(),
    email: email.trim(),
    mobileNumber: (mobileNumber || '').trim(),
    resource: resourceSlug,
  });

  forwardToFormspree({ name, email, mobileNumber, resource, _subject: 'New free guide signup from Humankind Movement' });

  if (resourceSlug) {
    sendResourceEmail({ to: email.trim(), resourceSlug }).catch((err) => {
      console.error('sendResourceEmail failed:', err.message);
    });
  }

  res.json({ ok: true });
});

module.exports = router;
