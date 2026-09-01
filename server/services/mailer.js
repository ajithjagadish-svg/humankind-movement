const fs = require('fs');
const path = require('path');
const resources = require('../config/resources');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

function mailerConfigured() {
  return Boolean(process.env.BREVO_API_KEY);
}

// Fire-and-forget, same pattern as forwardToFormspree in routes/forms.js:
// the signup response never waits on this, and any failure is logged, not
// surfaced to the visitor (the on-page download link still works either way).
//
// Uses Brevo's HTTP API rather than their SMTP relay: the SMTP relay only
// accepts connections from pre-authorized sender IPs, which DigitalOcean
// App Platform doesn't guarantee stays fixed on this instance size. The API
// authenticates by key over HTTPS instead, so there's no IP to whitelist or
// for this to silently break against later.
async function sendResourceEmail({ to, resourceSlug }) {
  const resource = resources[resourceSlug];
  if (!resource) {
    console.error(`sendResourceEmail: unknown resource slug "${resourceSlug}"`);
    return;
  }

  if (!mailerConfigured()) {
    console.warn(
      `sendResourceEmail: BREVO_API_KEY not configured, skipping email delivery for "${resourceSlug}". ` +
      'The on-page download link still works.'
    );
    return;
  }

  const filePath = path.join(__dirname, '..', '..', resource.file);
  if (!fs.existsSync(filePath)) {
    console.error(`sendResourceEmail: file not found at ${filePath}`);
    return;
  }

  const attachmentBase64 = fs.readFileSync(filePath).toString('base64');

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'hello@humankindmovement.in',
        name: process.env.BREVO_SENDER_NAME || 'Humankind Movement',
      },
      to: [{ email: to }],
      subject: resource.subject,
      textContent:
        `Here's your copy of "${resource.displayName}", attached.\n\n` +
        `Health before success. Awareness before action.\n\n` +
        `Humankind Movement\nhumankindmovement.in`,
      attachment: [{ content: attachmentBase64, name: resource.attachmentName }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API responded ${res.status}: ${body}`);
  }
}

// Fire-and-forget, same reasoning as sendResourceEmail: the signup response
// never waits on this, any failure is logged not surfaced.
async function sendSubscriptionConfirmEmail({ to, categoryLabel, confirmUrl }) {
  if (!mailerConfigured()) {
    console.warn(`sendSubscriptionConfirmEmail: BREVO_API_KEY not configured, skipping for "${to}".`);
    return;
  }

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'hello@humankindmovement.in',
        name: process.env.BREVO_SENDER_NAME || 'Humankind Movement',
      },
      to: [{ email: to }],
      subject: `Confirm your subscription to ${categoryLabel} posts`,
      textContent:
        `One more step - confirm you'd like to hear when we publish new ${categoryLabel} posts:\n\n` +
        `${confirmUrl}\n\n` +
        `If you didn't request this, you can ignore this email.\n\n` +
        `Humankind Movement\nhumankindmovement.in`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API responded ${res.status}: ${body}`);
  }
}

// Fire-and-forget - sent once per confirmed subscriber when a post in one of
// their subscribed categories is freshly published (see blogSubscriptions.js).
async function sendNewPostNotification({ to, post, unsubscribeUrl }) {
  if (!mailerConfigured()) {
    console.warn(`sendNewPostNotification: BREVO_API_KEY not configured, skipping for "${to}".`);
    return;
  }

  const postUrl = `https://humankindmovement.in/blog/${post.slug}`;

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || 'hello@humankindmovement.in',
        name: process.env.BREVO_SENDER_NAME || 'Humankind Movement',
      },
      to: [{ email: to }],
      subject: `New ${post.categoryLabel} post: ${post.title}`,
      textContent:
        `${post.title}\n\n${post.meta}\n\nRead it here: ${postUrl}\n\n` +
        `Humankind Movement\nhumankindmovement.in\n\n` +
        `---\nYou're getting this because you subscribed to ${post.categoryLabel} posts. ` +
        `Unsubscribe any time: ${unsubscribeUrl}`,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo API responded ${res.status}: ${body}`);
  }
}

module.exports = { sendResourceEmail, sendSubscriptionConfirmEmail, sendNewPostNotification, mailerConfigured };
