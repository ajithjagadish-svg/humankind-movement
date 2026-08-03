// Search Console URL Inspection API - reports Google's last-recorded
// indexing status for a specific URL (coverage state, verdict, last crawl
// time). Uses the same service account already configured for
// searchConsole.js; that account must be added as at least a Restricted
// user on the property for this to work (already true, since
// searchanalytics.query works).
const { google } = require('googleapis');
const { isConfigured, getAuth } = require('./googleAuth');

function urlInspectionConfigured() {
  return isConfigured() && Boolean(process.env.SEARCH_CONSOLE_SITE_URL);
}

// Returns the raw indexStatusResult for a single URL, or null if not configured.
async function inspectUrl(url) {
  if (!urlInspectionConfigured()) return null;

  const auth = getAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.urlInspection.index.inspect({
    requestBody: {
      inspectionUrl: url,
      siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
    },
  });

  return res.data.inspectionResult.indexStatusResult;
}

module.exports = { urlInspectionConfigured, inspectUrl };
