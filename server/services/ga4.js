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

const KEY_EVENTS = ['book_call_click', 'book_intro_call_click', 'contact_submit', 'intake_submit', 'ebook_signup'];

// Returns { sessions, events: { book_call_click, contact_submit, intake_submit, ebook_signup } },
// or null if GA4 isn't configured yet. Counts are all-time (since sinceDate) sitewide totals,
// matching the key events marked in the GA4 UI (Admin > Events > Mark as key event).
async function fetchGA4ConversionSummary({ sinceDate = '2020-01-01' } = {}) {
  if (!ga4Configured()) return null;

  const auth = getAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: sinceDate, endDate: 'today' }];

  const [sessionsRes, eventsRes] = await Promise.all([
    analyticsData.properties.runReport({
      property,
      requestBody: { dateRanges, metrics: [{ name: 'sessions' }] },
    }),
    analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: KEY_EVENTS } },
        },
      },
    }),
  ]);

  const sessions = Number(sessionsRes.data.rows?.[0]?.metricValues?.[0]?.value) || 0;

  const events = {};
  KEY_EVENTS.forEach((name) => { events[name] = 0; });
  (eventsRes.data.rows || []).forEach((row) => {
    events[row.dimensionValues[0].value] = Number(row.metricValues[0].value) || 0;
  });

  return { sessions, events };
}

module.exports = { ga4Configured, fetchGA4Stats, fetchGA4ConversionSummary };
