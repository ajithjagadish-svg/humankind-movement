// Shared Google service-account auth for both the GA4 Data API and the
// Search Console API. Both need read access granted to the SAME service
// account (added as a Viewer/user in GA4 and Search Console separately -
// see server/services/README.md for the exact setup steps), but they
// share one credential.
const { google } = require('googleapis');

function isConfigured() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
}

function getAuth(scopes) {
  if (!isConfigured()) return null;

  let credentials;
  try {
    const json = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString('utf8');
    credentials = JSON.parse(json);
  } catch (err) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is set but is not valid base64-encoded JSON.');
  }

  return new google.auth.GoogleAuth({ credentials, scopes });
}

module.exports = { isConfigured, getAuth };
