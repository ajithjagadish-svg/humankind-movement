// Prints the UTM-tagged version of a site link for every platform, so each social post,
// bio link or broadcast can be traced in GA4 (Acquisition > Traffic acquisition).
//
//   node server/scripts/utm.js /blog/knee-pain-on-stairs
//   node server/scripts/utm.js /blog/knee-pain-on-stairs --campaign=knee_stairs
//   node server/scripts/utm.js /blog/knee-pain-on-stairs --only=instagram,linkedin
//   node server/scripts/utm.js /blog/knee-pain-on-stairs --content=reel
//
// Only use these on links that point at the site FROM OUTSIDE. Never on links between pages
// of the site itself: they would restart the visit and hide the real source.
const SITE = 'https://humankindmovement.in';

// source/medium chosen so GA4's default channel groups sort them correctly
// (social -> Organic Social, email -> Email, referral -> Referral).
const CHANNELS = {
  instagram: { source: 'instagram', medium: 'social' },
  linkedin: { source: 'linkedin', medium: 'social' },
  facebook: { source: 'facebook', medium: 'social' },
  threads: { source: 'threads', medium: 'social' },
  x: { source: 'x', medium: 'social' },
  youtube: { source: 'youtube', medium: 'social' },
  whatsapp: { source: 'whatsapp', medium: 'social' },
  gbp: { source: 'gbp', medium: 'referral' },
  substack: { source: 'substack', medium: 'email' },
  newsletter: { source: 'newsletter', medium: 'email' },
};

const clean = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

function utmLink(path, channel, { campaign, content } = {}) {
  const ch = CHANNELS[channel];
  if (!ch) throw new Error(`Unknown channel "${channel}". Use one of: ${Object.keys(CHANNELS).join(', ')}`);
  const url = new URL(path.startsWith('http') ? path : SITE + (path.startsWith('/') ? path : '/' + path));
  const slug = url.pathname.split('/').filter(Boolean).pop() || 'home';
  url.searchParams.set('utm_source', ch.source);
  url.searchParams.set('utm_medium', ch.medium);
  url.searchParams.set('utm_campaign', clean(campaign || slug).slice(0, 60));
  if (content) url.searchParams.set('utm_content', clean(content));
  return url.toString();
}

module.exports = { utmLink, CHANNELS };

if (require.main === module) {
  const args = process.argv.slice(2);
  const path = args.find((a) => !a.startsWith('--'));
  const opt = (name) => (args.find((a) => a.startsWith(`--${name}=`)) || '').split('=')[1];
  if (!path) { console.error('Usage: node server/scripts/utm.js /blog/<slug> [--campaign=x] [--content=reel] [--only=instagram,linkedin]'); process.exit(1); }
  const only = opt('only') ? opt('only').split(',') : Object.keys(CHANNELS);
  for (const ch of only) console.log(`${ch.padEnd(11)} ${utmLink(path, ch, { campaign: opt('campaign'), content: opt('content') })}`);
}
