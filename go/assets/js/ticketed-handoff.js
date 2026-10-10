/* TICKETED-HANDOFF v1 — guided affiliate handoff (2026-10-10).
 *
 * HARD NOs (non-negotiable):
 *  - We NEVER collect Amazon credentials.
 *  - We NEVER ask the customer to "sign in" on our page.
 *  - We NEVER proxy Amazon's checkout.
 *  Sign-in and checkout happen on Amazon's side only — always.
 *
 * What this does (the compliant "walk him to the door with the ticket"):
 *  1. Reads window.__TH_CONFIG.merchant (the tagged Amazon URL).
 *  2. Decodes any HTML entities baked into the JS string (&amp; -> &).
 *  3. Detects device -> picks the optimal handoff strategy and sets the
 *     "Continue to Amazon" button to it:
 *       - mobile  : tagged https URL. iOS Universal Links / Android App Links
 *                   open the Amazon app WITH the full URL (tag intact). We do
 *                   not attempt custom URL schemes — they risk breaking
 *                   attribution and are undocumented for associates.
 *       - desktop : tagged https URL, same tab (current behavior).
 *  4. Fires footprint.js affiliate_click BEFORE navigation — our own copy of
 *     the ticket, with handoff metadata (device, strategy). If Amazon's side
 *     ever drops attribution, our click log still proves the referral.
 *  5. Also logs affiliate_handoff_click when the visitor taps the button
 *     early (before the auto-redirect).
 *  6. Auto-redirects after 1600ms, preserving the existing interstitial beat.
 *
 * Pages configure via:
 *   <script>window.__TH_CONFIG = { merchant: 'https://...tag=granitex60-20...',
 *                                 product: 'slug', op: 'op-slug' };</script>
 *   <script src=".../ticketed-handoff.js"></script>
 *
 * Tracking never breaks the page: quiet try/catch everywhere.
 */
(function () {
  'use strict';

  var REDIRECT_MS = 1600;

  function cfg() {
    try { return window.__TH_CONFIG || {}; } catch (e) { return {}; }
  }

  /* Decode HTML entities that may be baked into the JS merchant string
     (e.g. "&amp;" from an HTML-escaped source). Safe on plain URLs. */
  function decodeEntities(s) {
    try {
      var t = document.createElement('textarea');
      t.innerHTML = String(s || '');
      return t.value;
    } catch (e) { return String(s || ''); }
  }

  function isMobile() {
    try {
      var ua = navigator.userAgent || '';
      if (/Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua)) return true;
      if (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820) return true;
    } catch (e) {}
    return false;
  }

  function track(eventName, extra) {
    try {
      if (!window.__fgFootprint) return;
      var c = cfg();
      var payload = {
        product: c.product || '',
        merchant: 'amazon',
        op: c.op || ''
      };
      for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k]; }
      window.__fgFootprint(eventName, payload);
    } catch (e) {}
  }

  function handoffUrl() {
    var raw = decodeEntities(cfg().merchant || '');
    // Strategy selection is metadata-first today: the tagged https URL is the
    // attribution-maximal handoff on both device classes (OS universal/app
    // links carry the tag into the Amazon app on mobile). Custom schemes are
    // deliberately NOT attempted (undocumented, attribution-risky).
    return { url: raw, strategy: isMobile() ? 'universal-link' : 'web', device: isMobile() ? 'mobile' : 'desktop' };
  }

  function init() {
    var h = handoffUrl();
    if (!h.url) return;

    // Point the visible button at the optimal handoff URL.
    try {
      var go = document.querySelector('a.go');
      if (go) {
        go.href = h.url;
        go.setAttribute('rel', 'noopener');
        go.addEventListener('click', function () {
          track('affiliate_handoff_click', { device: h.device, strategy: h.strategy });
        });
      }
    } catch (e) {}

    // Our own copy of the ticket: fires BEFORE any navigation.
    track('affiliate_click', { device: h.device, strategy: h.strategy, handoff: 'ticketed-v1' });

    // Preserve the interstitial beat, then walk him to the door.
    setTimeout(function () { try { location.href = h.url; } catch (e) {} }, REDIRECT_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
