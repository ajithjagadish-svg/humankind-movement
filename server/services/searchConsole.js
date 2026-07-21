// Server-side Google Search Console access - this is what actually answers
// "how is this post doing in search" (impressions, clicks, average
// position), which GA4 alone doesn't tell you.
const { google } = require('googleapis');
const { isConfigured, getAuth } = require('./googleAuth');

function searchConsoleConfigured() {
  return isConfigured() && Boolean(process.env.SEARCH_CONSOLE_SITE_URL);
}

// Returns { '/blog/some-slug': { clicks, impressions, ctr, position } },
// or null if Search Console isn't configured yet.
async function fetchSearchConsoleStats({ days = 90 } = {}) {
  if (!searchConsoleConfigured()) return null;

  const auth = getAuth(['https://www.googleapis.com/auth/webmasters.readonly']);
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const res = await searchconsole.searchanalytics.query({
    siteUrl: process.env.SEARCH_CONSOLE_SITE_URL,
    requestBody: {
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      dimensions: ['page'],
      rowLimit: 1000,
    },
  });

  const stats = {};
  (res.data.rows || []).forEach((row) => {
    const url = row.keys[0];
    let path;
    try {
      path = new URL(url).pathname;
    } catch (err) {
      return;
    }
    if (!path.startsWith('/blog/')) return;
    stats[path] = {
      clicks: row.clicks || 0,
      impressions: row.impressions || 0,
      ctr: row.ctr || 0,
      position: row.position || 0,
    };
  });
  return stats;
}

module.exports = { searchConsoleConfigured, fetchSearchConsoleStats };
