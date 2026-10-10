/* geo_route.js — TagFlow-style geo-routing for the Silvius affiliate server.
   Operation BUILD-ALL / Task 6 (2026-10-10). MIT-compatible, zero dependencies, CommonJS.

   WHY REIMPLEMENTED (not TagFlow as a module):
   TagFlow (github.com/zhuravlev-biz/tagflow, MIT) is built for Cloudflare Workers:
   it reads geo from `request.cf.country` and deploys via wrangler. Our server is a
   zero-dependency Node app on Render. Mounting TagFlow would mean a Cloudflare
   account (a new infra account in his name — blocked) plus a pnpm/TypeScript
   build chain (blocked by the dependency-light rule). Its resolution LOGIC,
   however, is tiny and dependency-free, so it is reimplemented here in its own
   spirit: country -> marketplace -> gates -> explicit fallback -> default.
   Never an untagged link, never a tag on the wrong marketplace.

   TagFlow conventions borrowed: 302 (never 301), Cache-Control: no-store,
   X-Robots-Tag: noindex, robots.txt disallows /go/, countryOverrides-style map,
   marketplaceFallbacks, defaultMarketplace, tags-per-marketplace gates.

   CURRENT MONEY TRUTH (honest numbers only):
   The only Associates tag we hold is the US tag: granitex60-20. Associates tags
   are locale-locked — the US tag earns ONLY on amazon.com. Until locale tags
   exist (and until his OneLink tap is done), the gates below route EVERYONE to
   amazon.com tagged with granitex60-20. OneLink (his tap, see ONELINK-TAP.md)
   then lets Amazon itself redirect foreign shoppers to their local storefront
   and still credit the account. The day a locale tag is added to TAGS (or set
   via env GEO_TAG_<MP>), that country's visitors route straight to the local
   storefront with the right tag — no code change beyond config. */
'use strict';

/* ---------------- config ---------------- */
// Marketplace key -> Amazon domain. Mirrors TagFlow's "marketplace" concept.
const MARKETPLACES = {
  'com':    'amazon.com',
  'ca':     'amazon.ca',
  'co.uk':  'amazon.co.uk',
  'de':     'amazon.de',
  'fr':     'amazon.fr',
  'it':     'amazon.it',
  'es':     'amazon.es',
  'com.au': 'amazon.com.au',
  'com.mx': 'amazon.com.mx',
  'in':     'amazon.in',
  'co.jp':  'amazon.co.jp',
  'sg':     'amazon.sg',
  'nl':     'amazon.nl',
  'se':     'amazon.se',
  'pl':     'amazon.pl',
  'ae':     'amazon.ae',
  'sa':     'amazon.sa',
  'com.br': 'amazon.com.br',
  'com.tr': 'amazon.com.tr',
};

const DEFAULT_MARKETPLACE = 'com';

// Associates tag per marketplace. ONLY 'com' is live today (granitex60-20).
// Add locale tags as his taps complete them (OneLink locales, India account,
// etc.). Env override supported: GEO_TAG_DE=yourtag0d-21 etc. (no code edit).
const TAGS = {
  'com': 'granitex60-20',
  'ca': null, 'co.uk': null, 'de': null, 'fr': null, 'it': null, 'es': null,
  'com.au': null, 'com.mx': null, 'in': null, 'co.jp': null, 'sg': null,
  'nl': null, 'se': null, 'pl': null, 'ae': null, 'sa': null,
  'com.br': null, 'com.tr': null,
};
for (const mp of Object.keys(TAGS)) {
  const env = process.env['GEO_TAG_' + mp.replace(/\./g, '_').toUpperCase()];
  if (env && /^[A-Za-z0-9][A-Za-z0-9-]*$/.test(env)) TAGS[mp] = env;
}

// TagFlow-style marketplace fallback chain (tried when a gate fails).
// Today everything collapses to 'com' because only 'com' has a tag.
const MARKETPLACE_FALLBACKS = {
  'ca': ['com'], 'co.uk': ['com'], 'de': ['com'], 'fr': ['com'],
  'it': ['com'], 'es': ['com'], 'com.au': ['com'], 'com.mx': ['com'],
  'in': ['com'], 'co.jp': ['com'], 'sg': ['com'], 'nl': ['com'],
  'se': ['com'], 'pl': ['com'], 'ae': ['com'], 'sa': ['com'],
  'com.br': ['com'], 'com.tr': ['com'],
};

/* Curated ISO-3166 country -> marketplace map (TagFlow-style serving
   relationships). Unknown / unmapped countries fall through to DEFAULT.
   Ranked markets follow LINK-1000X.md §12.5: CA, UK, ES, IN, AU, MX, DE, FR,
   IT first; OneLink-7 (JP, SG, NL, SA, PL, SE, AU); JP/BR parked but mapped
   so the config needs no edit when unparked. */
const COUNTRY_MARKETPLACE = {
  US: 'com',
  // North America
  CA: 'ca', MX: 'com.mx',
  // UK + Ireland
  GB: 'co.uk', IE: 'co.uk',
  // DACH
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // France + Benelux/Francophone
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  // Italy + micro-states
  IT: 'it', SM: 'it', VA: 'it',
  // Iberia
  ES: 'es', PT: 'es', AD: 'es',
  // Benelux / Nordics / Central EU
  NL: 'nl', SE: 'se', NO: 'se', DK: 'se', FI: 'se', IS: 'se', PL: 'pl',
  // Oceania
  AU: 'com.au', NZ: 'com.au',
  // Asia
  IN: 'in', JP: 'co.jp', SG: 'sg', MY: 'sg', PH: 'sg', TH: 'sg', ID: 'sg', VN: 'sg',
  // Middle East
  AE: 'ae', SA: 'sa', QA: 'sa', KW: 'sa', OM: 'sa', BH: 'sa',
  // South America
  BR: 'com.br',
  // Turkey
  TR: 'com.tr',
};

/* AliExpress global catch-all (§12.5 #9): honest until we hold an AliExpress
   affiliate account. While ALIEXPRESS_ID is null the router never emits
   AliExpress links — it falls back to the tagged amazon.com default. */
const ALIEXPRESS_ID = process.env.ALIEXPRESS_AFFILIATE_ID || null;

/* ---------------- detection ---------------- */
function sanitizeCountryCode(cc) {
  if (typeof cc !== 'string') return null;
  const v = cc.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(v) ? v : null;
}

/* Priority: 1) ?cc= query (client hint from bridge pages + testing),
   2) CF-IPCountry (Cloudflare in front — free when it is),
   3) X-Visitor-Country (generic CDN header),
   4) default. Accept-Language guessing is NOT used by default (TagFlow
   doesn't do it either; language != billing country). */
function detectCountry(reqLike) {
  try {
    const url = new URL(reqLike.url || '/', 'http://x');
    const q = sanitizeCountryCode(url.searchParams.get('cc'));
    if (q) return { cc: q, source: 'query' };
  } catch { /* ignore */ }
  const h = reqLike.headers || {};
  for (const name of ['cf-ipcountry', 'x-visitor-country']) {
    const v = sanitizeCountryCode(h[name]);
    if (v) return { cc: v, source: name };
  }
  return { cc: null, source: 'default' };
}

/* ---------------- resolution (TagFlow gate chain) ---------------- */
function resolveMarketplace(cc) {
  const candidate = (cc && COUNTRY_MARKETPLACE[cc]) || DEFAULT_MARKETPLACE;
  // Gate 1: marketplace must have a tag. Walk fallbacks, then default.
  const chain = [candidate, ...(MARKETPLACE_FALLBACKS[candidate] || []), DEFAULT_MARKETPLACE];
  for (const mp of chain) {
    if (TAGS[mp]) return { marketplace: mp, domain: MARKETPLACES[mp], tag: TAGS[mp],
      reason: mp === candidate ? 'direct' : 'fallback', candidate };
  }
  // Gate 2 (should be unreachable while 'com' keeps its tag): no tag anywhere.
  return { marketplace: DEFAULT_MARKETPLACE, domain: MARKETPLACES[DEFAULT_MARKETPLACE],
    tag: TAGS[DEFAULT_MARKETPLACE], reason: 'no-tag-anywhere', candidate };
}

/* Full route: country -> tagged destination. Exposes everything the /go/
   handler needs. `keyword` is the product search keyword the bridge holds. */
function route({ cc = null, keyword = '' } = {}) {
  const code = sanitizeCountryCode(cc);
  const r = resolveMarketplace(code);
  return {
    country: code, source: code ? 'country' : 'default',
    marketplace: r.marketplace, domain: r.domain, tag: r.tag,
    reason: code ? r.reason : 'default',
    url: destinationUrl(r.domain, r.tag, keyword),
  };
}

/* Same URL shape the bridges already use: amazon search, tagged, UTM'd. */
function destinationUrl(domain, tag, keyword) {
  const kw = String(keyword || '').replace(/\+/g, ' ');
  return `https://www.${domain}/s?k=${encodeURIComponent(kw).replace(/%20/g, '+')}` +
    `&tag=${tag}&utm_source=silvius&utm_medium=affiliate&utm_campaign=silvius_bridge`;
}

/* TagFlow compliance defaults for the 302 response. */
function complianceHeaders() {
  return { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' };
}

/* ---------------- config validation (CI / self-test) ---------------- */
function validateConfig() {
  const problems = [];
  if (!TAGS[DEFAULT_MARKETPLACE]) problems.push('default marketplace has no tag');
  for (const [cc, mp] of Object.entries(COUNTRY_MARKETPLACE))
    if (!MARKETPLACES[mp]) problems.push(`country ${cc} maps to unknown marketplace ${mp}`);
  for (const mp of Object.keys(MARKETPLACES))
    if (!(mp in TAGS)) problems.push(`marketplace ${mp} missing from TAGS`);
  return problems;
}

function selfTest() {
  const assert = require('assert');
  // TagFlow invariant: never untagged, never a tag on the wrong marketplace.
  const every = Object.entries(COUNTRY_MARKETPLACE);
  assert.ok(every.length > 40, 'country map should be substantial');
  const seen = new Set();
  for (const [cc] of every) {
    const r = route({ cc, keyword: 'dog bandana' });
    assert.ok(r.tag, `no tag for ${cc}`);
    assert.ok(r.url.includes(r.domain), `domain mismatch for ${cc}`);
    assert.ok(r.url.includes('tag=' + r.tag), `tag missing in URL for ${cc}`);
    assert.ok(/^[a-z0-9.-]+$/.test(r.domain), `bad domain for ${cc}`);
    seen.add(r.marketplace + '|' + r.tag);
  }
  // Fallback behavior today: everything resolves to tagged amazon.com.
  const de = route({ cc: 'DE', keyword: 'x' });
  assert.strictEqual(de.domain, 'amazon.com', 'DE should fall back to .com until a DE tag exists');
  assert.strictEqual(de.tag, 'granitex60-20');
  assert.strictEqual(de.reason, 'fallback');
  const us = route({ cc: 'US', keyword: 'x' });
  assert.strictEqual(us.reason, 'direct');
  const unknown = route({ cc: 'ZZ', keyword: 'x' });
  assert.strictEqual(unknown.marketplace, 'com', 'unmapped country code resolves to default marketplace');
  assert.strictEqual(unknown.domain, 'amazon.com');
  assert.strictEqual(unknown.tag, 'granitex60-20');
  const none = route({ keyword: 'x' });
  assert.strictEqual(none.country, null);
  assert.strictEqual(none.reason, 'default');
  assert.strictEqual(none.url, destinationUrl('amazon.com', 'granitex60-20', 'x'));
  // URL shape parity with the existing bridges.
  assert.ok(none.url.startsWith('https://www.amazon.com/s?k=x&tag=granitex60-20&utm_source=silvius'),
    'URL shape must match existing bridge links');
  // Detection priority.
  assert.deepStrictEqual(detectCountry({ url: '/go/x?cc=de', headers: {} }).cc, 'DE');
  assert.deepStrictEqual(detectCountry({ url: '/go/x', headers: { 'cf-ipcountry': 'fr' } }).cc, 'FR');
  assert.deepStrictEqual(detectCountry({ url: '/go/x?cc=xx!', headers: {} }).cc, null);
  assert.deepStrictEqual(validateConfig(), []);
  console.log('geo_route self-test OK —', every.length, 'countries checked, all resolve to a tagged URL');
}

module.exports = {
  MARKETPLACES, TAGS, DEFAULT_MARKETPLACE, COUNTRY_MARKETPLACE,
  MARKETPLACE_FALLBACKS, ALIEXPRESS_ID,
  sanitizeCountryCode, detectCountry, resolveMarketplace, route,
  destinationUrl, complianceHeaders, validateConfig,
};

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else console.log(JSON.stringify(route({ cc: process.argv[2] || null, keyword: process.argv[3] || '' }), null, 2));
}
