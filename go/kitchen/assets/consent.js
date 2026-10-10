/* Cookie consent — implements ready/_privacy/CONSENT-BANNER-SPEC.md
   Default-deny in EEA/UK. Analytics (GA4, footprint-v2 collector) + Marketing
   (Meta Pixel) stay HELD until consent for that category. Strictly-necessary
   (cart localStorage, checkout) always runs. Consent record kept 1 year. */
(function () {
  'use strict';
  var KEY = 'gd_consent_v1';
  var BANNER_VERSION = '2026-10-09';
  var EEA = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','IS','NO','LI','GB','CH'];
  var CFG = window.STORE_CONFIG || {};

  function tzCountry() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      /* coarse map: enough for default-deny routing; not a legal oracle */
      var map = { 'Europe/': 'EU', 'GB': 'GB', 'America/': 'US', 'US/': 'US', 'Asia/': 'ROW', 'Australia/': 'ROW', 'Pacific/': 'ROW', 'Africa/': 'ROW', 'Atlantic/': 'ROW', 'Indian/': 'ROW', 'Antarctica/': 'ROW' };
      for (var k in map) if (tz.indexOf(k) === 0 || tz === k) return map[k];
      return 'ROW';
    } catch (e) { return 'ROW'; }
  }

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function save(rec) { rec.v = BANNER_VERSION; rec.ts = new Date().toISOString(); try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) {} }

  function applyConsent(rec) {
    /* Gate pixels: only inject after consent. footprint-v2 page_view already
       fired cookieless — the collector POST is the behavioral measurement,
       so we block its network send pre-consent in EEA/UK via the hold flag. */
    window.__consent = rec || { analytics: false, marketing: false, functional: false };
    if (rec && rec.analytics) enableAnalytics();
    if (rec && rec.marketing) enableMarketing();
  }

  function enableAnalytics() {
    var ga = CFG.ga4Id || '';
    if (ga && ga.indexOf('{{') !== 0 && !document.querySelector('script[data-ga]')) {
      var s = document.createElement('script'); s.async = true; s.setAttribute('data-ga', '1');
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date()); window.gtag('config', ga);
    }
    window.__fp_hold = false; /* release footprint collector */
  }

  function enableMarketing() {
    var px = CFG.metaPixelId || '';
    if (px && px.indexOf('{{') !== 0 && !window.fbq) {
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', px); window.fbq('track', 'PageView');
    }
  }

  function showBanner() {
    if (document.querySelector('.consent-banner')) return;
    var bar = document.createElement('div');
    bar.className = 'consent-banner'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML = '<div class="wrap"><p><strong>We use cookies — your call.</strong> ' +
      'We use cookies to run checkout, remember your preferences, measure which pages work, and (with your permission) measure our ads. ' +
      'In the EU we wait for your OK before any measuring starts.</p>' +
      '<button class="btn" data-c="accept">Accept all</button>' +
      '<button class="btn ghost" data-c="reject">Reject all</button>' +
      '<button class="btn ghost" data-c="custom">Customize</button></div>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      var c = b.getAttribute('data-c');
      if (c === 'accept') { save({ necessary: true, functional: true, analytics: true, marketing: true }); applyConsent(load()); bar.remove(); }
      else if (c === 'reject') { save({ necessary: true, functional: false, analytics: false, marketing: false }); applyConsent(load()); bar.remove(); }
      else showPanel(bar);
    });
  }

  function showPanel(bar) {
    var ov = document.createElement('div');
    ov.className = 'consent-panel';
    ov.innerHTML = '<div class="dialog" role="dialog" aria-modal="true" aria-labelledby="ct">' +
      '<h2 id="ct">Cookie settings</h2>' +
      row('necessary', 'Strictly necessary', 'Checkout, security, load balancing. Always on; the site can\'t work without these.', true, true) +
      row('functional', 'Functional', 'Remembers forms and preferences.', false, false) +
      row('analytics', 'Analytics', 'Google Analytics + our own attribution script (footprint-v2.js, no cookies, no storage). Helps us see which pages work. Off until you allow.', false, false) +
      row('marketing', 'Marketing', 'Meta Pixel: measures our ads and builds audiences. Off until you allow.', false, false) +
      '<p style="margin-top:1rem;display:flex;gap:.6rem;flex-wrap:wrap">' +
      '<button class="btn" data-c="save">Save my choices</button>' +
      '<button class="btn secondary" data-c="close">Close</button></p></div>';
    function row(id, label, desc, checked, locked) {
      return '<div class="consent-row"><div><strong>' + label + '</strong><div class="desc">' + desc + '</div></div>' +
        '<label class="switch"><input type="checkbox" data-k="' + id + '"' + (checked ? ' checked' : '') + (locked ? ' disabled' : '') +
        ' aria-label="' + label + '"><span class="track"><span class="thumb"></span></span></label></div>';
    }
    document.body.appendChild(ov);
    ov.querySelector('[data-c="close"]').focus();
    ov.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.getAttribute('data-c') === 'save') {
        var rec = { necessary: true };
        ov.querySelectorAll('input[type=checkbox]').forEach(function (i) { rec[i.getAttribute('data-k')] = i.checked || i.disabled; });
        save(rec); applyConsent(load()); ov.remove(); if (bar) bar.remove();
      } else { ov.remove(); }
    });
    ov.addEventListener('keydown', function (e) { if (e.key === 'Escape') ov.remove(); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var rec = load();
    window.__fp_hold = true; /* hold collector until consent decision */
    if (rec && rec.v === BANNER_VERSION) { applyConsent(rec); return; }
    /* US/ROW: banner still shows once (spec), tags held until choice */
    showBanner();
    /* footer re-open hook */
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[data-consent-open]'); if (!a) return;
      e.preventDefault(); showPanel(null);
    });
  });
})();
