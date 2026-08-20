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

const TIME_SERIES_EVENTS = ['book_intro_call_click', 'contact_submit', 'intake_submit', 'ebook_signup'];

// Returns [{ date: 'YYYY-MM-DD', sessions, events: { book_intro_call_click, ... } }, ...]
// for the trailing `days` days (oldest first), or null if GA4 isn't configured.
// Sessions and conversion events are kept in the same row but are deliberately
// NOT meant to be charted on one shared axis - sessions run in the hundreds,
// conversions in the single/low-double digits, so a bar chart mixing both
// makes the conversion bars an invisible sliver next to sessions. Chart these
// as two separate line charts instead (see analytics.ejs).
async function fetchGA4TimeSeries({ days = 30 } = {}) {
  if (!ga4Configured()) return null;

  const auth = getAuth(['https://www.googleapis.com/auth/analytics.readonly']);
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const property = `properties/${process.env.GA4_PROPERTY_ID}`;
  const dateRanges = [{ startDate: `${days}daysAgo`, endDate: 'today' }];

  const [sessionsRes, eventsRes] = await Promise.all([
    analyticsData.properties.runReport({
      property,
      requestBody: { dateRanges, dimensions: [{ name: 'date' }], metrics: [{ name: 'sessions' }] },
    }),
    analyticsData.properties.runReport({
      property,
      requestBody: {
        dateRanges,
        dimensions: [{ name: 'date' }, { name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          filter: { fieldName: 'eventName', inListFilter: { values: TIME_SERIES_EVENTS } },
        },
      },
    }),
  ]);

  const byDate = {};
  const toIso = (ga4Date) => `${ga4Date.slice(0, 4)}-${ga4Date.slice(4, 6)}-${ga4Date.slice(6, 8)}`;
  const emptyEvents = () => TIME_SERIES_EVENTS.reduce((acc, name) => ({ ...acc, [name]: 0 }), {});

  (sessionsRes.data.rows || []).forEach((row) => {
    const date = toIso(row.dimensionValues[0].value);
    byDate[date] = byDate[date] || { date, sessions: 0, events: emptyEvents() };
    byDate[date].sessions = Number(row.metricValues[0].value) || 0;
  });
  (eventsRes.data.rows || []).forEach((row) => {
    const date = toIso(row.dimensionValues[0].value);
    const eventName = row.dimensionValues[1].value;
    byDate[date] = byDate[date] || { date, sessions: 0, events: emptyEvents() };
    byDate[date].events[eventName] = Number(row.metricValues[0].value) || 0;
  });

  return Object.values(byDate).sort((a, b) => (a.date < b.date ? -1 : 1));
}

module.exports = { ga4Configured, fetchGA4Stats, fetchGA4ConversionSummary, fetchGA4TimeSeries };
