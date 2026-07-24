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

module.exports = { sendResourceEmail, mailerConfigured };
