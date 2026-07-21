const express = require('express');
const ContactSubmission = require('../models/ContactSubmission');
const IntakeSubmission = require('../models/IntakeSubmission');

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

router.post('/contact', async (req, res) => {
  const { name, email, phone, topic, location, message, _gotcha } = req.body;

  // Honeypot: a bot fills every field, a human never sees this one. Pretend
  // success either way so bots don't learn to avoid it.
  if (_gotcha) return res.json({ ok: true });

  if (!name || !email || !phone || !topic || !message) {
    return res.status(400).json({ error: 'Please fill in all required fields.' });
  }

  await ContactSubmission.create({
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    topic,
    location: (location || '').trim(),
    message: message.trim(),
  });

  forwardToFormspree({ name, email, phone, topic, location, message, _subject: 'New contact form message from Humankind Movement' });

  res.json({ ok: true });
});

router.post('/intake', async (req, res) => {
  const { fullName, email, phone, primaryGoals, _gotcha } = req.body;

  if (_gotcha) return res.json({ ok: true });

  if (!fullName || !email || !phone || !primaryGoals) {
    return res.status(400).json({ error: 'Please fill in your name, email, phone, and goals.' });
  }

  await IntakeSubmission.create(req.body);

  res.json({ ok: true });
});

module.exports = router;
