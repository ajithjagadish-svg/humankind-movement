// Short, shareable links that redirect to a UTM-tagged page, so a link pasted into a group
// chat stays short and GA4 still sees the source. Add one line per campaign.
// Pattern: humankindmovement.in/<code> -> page + utm_source / utm_medium / utm_campaign.
const SHORT_LINKS = {
  // Kannadigara Professional Network (WhatsApp group), shared 2026-10-14
  kpn: '/?utm_source=whatsapp&utm_medium=social&utm_campaign=kannadiga_network',
};

function shortLinks(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const code = req.path.replace(/^\/+|\/+$/g, '').toLowerCase();
  const target = Object.prototype.hasOwnProperty.call(SHORT_LINKS, code) ? SHORT_LINKS[code] : null;
  if (!target) return next();
  // 302, not 301: the destination or tags may change, and browsers must not cache it forever.
  return res.redirect(302, target);
}

module.exports = { shortLinks, SHORT_LINKS };
