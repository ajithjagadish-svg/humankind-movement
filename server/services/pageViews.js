const PageView = require('../models/PageView');

// Search engine and social-preview crawlers hit these pages routinely -
// counting them would make "traffic" numbers meaningless.
const BOT_UA_PATTERN =
  /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|preview/i;

// Fire-and-forget: never let tracking failure affect the actual page response.
function trackPageView(pagePath, req) {
  const userAgent = req.get('user-agent') || '';
  if (BOT_UA_PATTERN.test(userAgent)) return;

  const date = new Date().toISOString().slice(0, 10);
  PageView.findOneAndUpdate(
    { path: pagePath, date },
    { $inc: { count: 1 } },
    { upsert: true }
  ).catch(() => {});
}

async function getPageViewSummary(pagePath) {
  const rows = await PageView.find({ path: pagePath }).sort({ date: 1 }).lean();
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return { total, byDate: rows.map((r) => ({ date: r.date, count: r.count })) };
}

module.exports = { trackPageView, getPageViewSummary };
