// Auto-generates the "Sunlight and Vitamin D" section of a client's plan
// from their location alone - geocodes the location text to a latitude via
// OpenStreetMap Nominatim (free, no API key, one request per lookup - well
// inside their usage policy for this volume), then applies deterministic
// rules from the "Nutrition Chart" project research (desktop project,
// Vitamin D & Sunlight tab): UVB:UVA ratio peaks at solar noon, and above
// roughly 35 degrees latitude the sun angle is too low for cutaneous
// synthesis for several winter months regardless of time of day. This is
// rule-based, not an LLM guess - the only untrusted input is the geocode.

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'HumankindMovementApp/1.0 (contact: ajithjagadish@gmail.com)';

async function geocodeLocation(location) {
  const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(location)}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`Geocoding lookup failed (${res.status}).`);
  const results = await res.json();
  if (!results.length) throw new Error(`Could not find "${location}" - try a more specific city and country.`);
  return {
    lat: parseFloat(results[0].lat),
    lon: parseFloat(results[0].lon),
    displayName: results[0].display_name,
  };
}

// The temperate/high boundary sits at 40 rather than the more common 45 -
// Toronto (43.7N) and Detroit (42.3N) were both established as effectively
// Apr-Sep only for skin synthesis in this project's own vetted research
// (Grigalavicius 2015, Yamamoto 2024), which only fits the stricter "high"
// treatment, not an 8-month "temperate" window.
function latitudeBand(absLat) {
  if (absLat < 23.5) return 'tropical';
  if (absLat < 35) return 'subtropical';
  if (absLat < 40) return 'temperate';
  return 'high';
}

// Effective months for cutaneous vitamin D synthesis, by band, expressed as
// month numbers (1-12) for the NORTHERN hemisphere - mirrored 6 months for
// the south.
const EFFECTIVE_MONTHS_NORTH = {
  tropical: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  subtropical: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  temperate: [3, 4, 5, 6, 7, 8, 9, 10],
  high: [4, 5, 6, 7, 8, 9],
};

const EXPOSURE_MINUTES = {
  tropical: '10-15 minutes',
  subtropical: '10-15 minutes',
  temperate: '15-20 minutes',
  high: '20-25 minutes',
};

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function shiftMonths(months, offset) {
  return months.map((m) => ((m - 1 + offset + 12) % 12) + 1);
}

// months must form a single contiguous run on the 12-month circle - true
// for every list this file builds, including ones that wrap the year
// boundary (Oct-Mar). A plain min/max over the numbers breaks on a wrap
// (Oct..Mar would read back as "January to December"), so this finds the
// run's start/end by looking for the missing neighbour instead of sorting.
function monthRangeLabel(months) {
  if (months.length === 12) return 'year-round';
  const set = new Set(months);
  const prev = (m) => (m === 1 ? 12 : m - 1);
  const next = (m) => (m === 12 ? 1 : m + 1);
  const start = months.find((m) => !set.has(prev(m)));
  const end = months.find((m) => !set.has(next(m)));
  return `${MONTH_NAMES[start - 1]} to ${MONTH_NAMES[end - 1]}`;
}

function generateGuidanceText({ lat, displayName }, now = new Date()) {
  const hemisphere = lat >= 0 ? 'N' : 'S';
  const absLat = Math.abs(lat);
  const band = latitudeBand(absLat);
  const effectiveMonths = hemisphere === 'N' ? EFFECTIVE_MONTHS_NORTH[band] : shiftMonths(EFFECTIVE_MONTHS_NORTH[band], 6);
  const ineffectiveMonths = MONTH_NAMES.map((_, i) => i + 1).filter((m) => !effectiveMonths.includes(m));
  const currentMonth = now.getMonth() + 1;
  const inSeason = effectiveMonths.includes(currentMonth);
  const shortLocation = displayName.split(',').slice(0, 2).join(',');

  const lines = [];
  lines.push(`${shortLocation} sits at roughly ${absLat.toFixed(1)} degrees ${hemisphere}.`);

  if (band === 'tropical' || band === 'subtropical') {
    lines.push(`At this latitude, midday sun is effective for cutaneous vitamin D synthesis year-round. ${EXPOSURE_MINUTES[band]} of midday sun (roughly 11:00 AM-1:00 PM local time) on arms and face, a few times a week, is enough.`);
  } else {
    lines.push(`From ${monthRangeLabel(effectiveMonths)}, ${EXPOSURE_MINUTES[band]} of midday sun (roughly 11:00 AM-1:00 PM local time) on arms and face is enough - no sunscreen needed for that window.`);
    lines.push(`From ${monthRangeLabel(ineffectiveMonths)}, the sun angle is too low here for skin synthesis regardless of time of day - rely on a vitamin D3 supplement with your largest fat-containing meal instead (see Drinks and Supplements).`);
  }

  lines.push(`This month (${MONTH_NAMES[currentMonth - 1]}): ${inSeason ? `in season - aim for that midday window when you can.` : `out of season here - lean on the D3 supplement rather than chasing sun exposure.`}`);
  lines.push('This is general guidance based on latitude, not a measurement - a 25(OH)D blood test is the only way to know your actual level.');

  return lines.join(' ');
}

async function generateSunlightGuidance(location) {
  const geo = await geocodeLocation(location);
  return generateGuidanceText(geo);
}

module.exports = { geocodeLocation, generateGuidanceText, generateSunlightGuidance };
