// IndexNow - lets Bing/Yandex (not Google - see note below) know a URL
// changed so they can crawl it right away instead of waiting for their next
// scheduled pass. Zero setup cost beyond the key file (served by
// marketing.js at /<INDEXNOW_KEY>.txt, which is IndexNow's ownership-proof
// mechanism - the key is not a secret, it's meant to be publicly fetchable).
//
// Deliberately NOT using Google's Indexing API here: that API is
// contractually restricted to JobPosting/BroadcastEvent structured data
// (https://developers.google.com/search/apis/indexing-api/v3/quickstart) -
// Google has said it will ignore submissions for other content types, and
// using it for a blog post is outside its terms. The Search Console URL
// Inspection API (see urlInspection.js) is read-only and has no "request
// indexing" endpoint; that action only exists as a manual button in the
// Search Console UI. So for Google specifically, indexing stays passive
// (wait for Googlebot) - this only speeds up Bing/Yandex.
const HOST = 'humankindmovement.in';
const KEY = 'd1306b4b16741aae3d15e834fb307b28';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';

function indexNowKey() {
  return KEY;
}

// Fire-and-forget: submit one or more absolute or site-relative URLs.
// Never throws - a failed/slow IndexNow call should never block a publish.
async function submitUrls(urls) {
  const urlList = urls.map((u) => (u.startsWith('http') ? u : `https://${HOST}${u}`));
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList }),
    });
    return { ok: res.status >= 200 && res.status < 300, status: res.status };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

module.exports = { indexNowKey, submitUrls };
