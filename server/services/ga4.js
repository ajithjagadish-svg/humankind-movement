// Server-side GA4 Data API access via a Google service account - replaces
// the old dashboard.html's broken client-side OAuth flow. Never touches
// the browser; credentials live only in server env vars.
const { google } = require('googleapis');
const { isConfigured, getAuth } = require('./googleAuth');

function ga4Configured() {
  return isConfigured() && Boolean(process.env.GA4_PROPERTY_ID);
}

// Returns { '/blog/some-slug': { pageviews, engagementSeconds } }, or null
// if GA4 isn't configured yet.
async function fetchGA4Stats({ sinceDate = '2020-01-01' } = {}) {
  if (!ga4Configured()) return null;

  const auth = getAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

  const res = await analyticsData.properties.runReport({
    property: `properties/${process.env.GA4_PROPERTY_ID}`,
    requestBody: {
      dateRanges: [{ startDate: sinceDate, endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'userEngagementDuration' },
        { name: 'activeUsers' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'BEGINS_WITH', value: '/blog/' },
        },
      },
      limit: 1000,
    },
  });

  const stats = {};
  (res.data.rows || []).forEach((row) => {
    const path = row.dimensionValues[0].value;
    const pageviews = Number(row.metricValues[0].value) || 0;
    const engagementDuration = Number(row.metricValues[1].value) || 0;
    const activeUsers = Number(row.metricValues[2].value) || 0;
    stats[path] = {
      pageviews,
      engagementSeconds: activeUsers ? Math.round(engagementDuration / activeUsers) : 0,
    };
  });
  return stats;
}

module.exports = { ga4Configured, fetchGA4Stats };
