/* Floodgate footprint-v2 — digital fingerprint layer (Operation FLOODGATE, 2026-10-09).
   Extends the ThroneX footprint v1 blueprint WITHOUT touching the original file.
   Every event now carries op-level identity so clicks, buttons, and visits are
   attributable to a specific income operation, placement, and campaign:
     op         — one of the 16 ready/ op slugs, e.g. "01-preset-packs", "video-luts"
     placement  — the traffic surface, e.g. "ig_story", "yt_description", "email_welcome"
     campaign   — the campaign id, e.g. "01-preset-packs_launch_202610"
   ALSO closes the attribution loop on arrival: utm_source/medium/campaign/content/term
   and fbclid/gclid are captured from the landing URL once per page and stapled to
   EVERY event in the page session — so an ad click (Meta/Google) can be matched to a
   later purchase event by (page_id) and (click_id/ad click id).

   Privacy-safe, zero-contact: no cookies, no browser storage writes, no external
   telemetry beyond the house collector + the visitor's own configured pixels.
   Tracking must never break the page: quiet try/catch everywhere. */
(function () {
  'use strict';

  var COLLECTOR = 'https://script.google.com/macros/s/AKfycbx7hvwe79pQtH3J6mvMnlQQLOkGIKI27fucKcAhjcqDGQ3q2Y5lCqJZ8VgsKXxmhV-2RQ/exec';

  /* The 16 ready/ op slugs — events with an op outside this list are still
     recorded but flagged 'unknown_op' so typos surface instead of vanishing. */
  var OP_SLUGS = [
    '01-preset-packs', '02-etsy-shop', '03-kdp-guides', '04-affiliate-expansion',
    '05-dog-store', '06-fine-art-prints', '07-money-moves-newsletter', '08-mini-course',
    '09-seo-site', '10-community', '11-stock-video', '12-low-content', '13-silvius-paid',
    '14-email-crm', '15-storm-dashboard-sales', 'video-luts'
  ];

  var pageId = 'p-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  var seq = 0;

  function newClickId() {
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  /* ---- attribution context: captured ONCE per page from the landing URL ---- */
  var ARRIVAL = (function () {
    var a = { utm_source: '', utm_medium: '', utm_campaign: '', utm_content: '', utm_term: '', ad_click_id: '' };
    try {
      var q = new URLSearchParams((location.search || ''));
      a.utm_source = q.get('utm_source') || '';
      a.utm_medium = q.get('utm_medium') || '';
      a.utm_campaign = q.get('utm_campaign') || '';
      a.utm_content = q.get('utm_content') || '';
      a.utm_term = q.get('utm_term') || '';
      var fbclid = q.get('fbclid'), gclid = q.get('gclid');
      a.ad_click_id = (fbclid ? 'fbclid=' + fbclid : '') + (gclid ? (fbclid ? '|' : '') + 'gclid=' + gclid : '');
    } catch (e) {}
    return a;
  })();

  /* ---- op/placement/campaign identity: body defaults + per-element overrides ---- */
  function bodyAttr(name) {
    try {
      var b = document.body;
      return (b && b.dataset && b.dataset[name]) || '';
    } catch (e) { return ''; }
  }

  function opContext(el) {
    var op = bodyAttr('txOp') || bodyAttr('fgOp');
    var placement = bodyAttr('txPlacement') || bodyAttr('fgPlacement');
    var campaign = bodyAttr('txCampaign') || bodyAttr('fgCampaign');
    if (el && el.getAttribute) {
      op = el.getAttribute('data-op') || op;
      placement = el.getAttribute('data-placement') || placement;
      campaign = el.getAttribute('data-campaign') || campaign;
    }
    return { op: op || 'unset', placement: placement || 'unset', campaign: campaign || 'unset' };
  }

  function routeInfo() {
    var lane = '', page = '';
    try {
      var b = document.body;
      if (b && b.dataset) {
        lane = b.dataset.txLane || '';
        page = b.dataset.txPage || '';
      }
      var m = /^#\/([a-z]+)/i.exec(location.hash || '');
      if (m) {
        if (!lane) lane = m[1].toLowerCase();
        if (!page) page = m[1].toLowerCase();
      }
    } catch (e) {}
    return { lane: lane || 'unknown', page: page || 'unknown' };
  }

  function domainPath(url) {
    try {
      var u = new URL(url, location.origin);
      return u.hostname + (u.pathname || '/');
    } catch (e) { return 'unparseable'; }
  }

  function send(eventName, fields, el) {
    fields = fields || {};
    seq++;
    var route = routeInfo();
    var ctx = opContext(el);
    var known = ctx.op === 'unset' || OP_SLUGS.indexOf(ctx.op) >= 0;
    var payload = {
      event: eventName,
      click_id: fields.click_id || newClickId(),
      page_id: pageId,
      seq: seq,
      /* --- floodgate fingerprint (new in v2) --- */
      op: ctx.op,
      placement: ctx.placement,
      campaign: ctx.campaign,
      utm_source: fields.utm_source || ARRIVAL.utm_source,
      utm_medium: fields.utm_medium || ARRIVAL.utm_medium,
      utm_campaign: fields.utm_campaign || ARRIVAL.utm_campaign,
      utm_content: fields.utm_content || ARRIVAL.utm_content,
      utm_term: fields.utm_term || ARRIVAL.utm_term,
      ad_click_id: fields.ad_click_id || ARRIVAL.ad_click_id,
      /* --- v1 fields (unchanged contract) --- */
      lane: fields.lane || route.lane,
      page: fields.page || route.page,
      pid: fields.pid || '',
      name: String(fields.name || '').slice(0, 60),
      href: fields.href || (fields.dest ? domainPath(fields.dest) : ''),
      tag: fields.tag || '',
      asin: fields.asin || '',
      ts: new Date().toISOString()
    };
    if (!known) payload.op_flag = 'unknown_op';
    if (fields.reason) payload.reason = String(fields.reason).slice(0, 80);
    if (fields.outbound) payload.outbound = String(fields.outbound).slice(0, 40);
    if (fields.value != null) payload.value = Number(fields.value) || 0;
    if (fields.currency) payload.currency = String(fields.currency).slice(0, 8);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(payload);
      window.dispatchEvent(new CustomEvent('tx_footprint', { detail: payload }));
      window.dispatchEvent(new CustomEvent('fg_footprint', { detail: payload }));
    } catch (e) {}
    try {
      var body = JSON.stringify(payload);
      if (navigator.sendBeacon) {
        navigator.sendBeacon(COLLECTOR, new Blob([body], { type: 'text/plain;charset=utf-8' }));
      } else if (window.fetch) {
        window.fetch(COLLECTOR, {
          method: 'POST', body: body, keepalive: true, mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
      }
    } catch (e) {}
    return payload.click_id;
  }

  /* Public API — same shape as v1, plus op/placement/campaign/value support:
     window.__txFootprint('purchase', { name:'tripwire', value:1, currency:'USD' }) */
  window.__txFootprint = function (eventName, fields) {
    try { return send(eventName, fields || {}, null); }
    catch (e) { return null; }
  };
  window.__fgFootprint = window.__txFootprint;

  /* Declarative events: <button data-fg-event="purchase" data-value="29" data-name="bundle"> */
  document.addEventListener('click', function (event) {
    var el = event && event.target;
    while (el && el !== document) {
      if (el.hasAttribute && el.hasAttribute('data-fg-event')) break;
      el = el.parentNode;
    }
    if (!el || el === document) return;
    try {
      var fields = {
        click_id: newClickId(),
        name: el.getAttribute('data-name') || String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        value: el.getAttribute('data-value') || null,
        currency: el.getAttribute('data-currency') || 'USD'
      };
      send(el.getAttribute('data-fg-event') || 'custom', fields, el);
    } catch (e) {}
  }, true);

  function firePageView() {
    try { send('page_view', {}, null); } catch (e) {}
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', firePageView);
  else firePageView();

  function closestTrack(el) {
    while (el && el !== document) {
      if (el.hasAttribute && el.hasAttribute('data-track')) return el;
      el = el.parentNode;
    }
    return null;
  }

  document.addEventListener('click', function (event) {
    var el = closestTrack(event && event.target);
    if (!el) return;
    try {
      var href = el.getAttribute('href') || '';
      var clickId = newClickId();
      var fields = {
        click_id: clickId,
        pid: el.getAttribute('data-pid') || '',
        name: el.getAttribute('data-name') || String(el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        tag: el.getAttribute('data-tag') || '',
        asin: el.getAttribute('data-asin') || '',
        outbound: /^https?:/i.test(href) ? 'external' : 'internal'
      };
      if (href.indexOf('#/go?') === 0) {
        var q = new URLSearchParams(href.slice(href.indexOf('?') + 1));
        if (q.get('to')) {
          fields.pid = q.get('pid') || fields.pid;
          fields.name = q.get('name') || fields.name;
          fields.href = domainPath(q.get('to'));
          fields.tag = q.get('tag') || fields.tag;
          fields.asin = q.get('asin') || fields.asin;
          fields.lane = q.get('lane') || '';
          fields.outbound = 'amazon';
          if (href.indexOf('cid=') < 0) el.setAttribute('href', href + '&cid=' + encodeURIComponent(clickId));
        }
      } else if (/^https?:/i.test(href)) {
        fields.href = domainPath(href);
        /* carry the page's fingerprint to the vendor hop where we can't run JS */
        if (href.indexOf('utm_source=') < 0 && (ARRIVAL.utm_source || ctx0().op !== 'unset')) {
          var c = ctx0();
          var join = href.indexOf('?') < 0 ? '?' : '&';
          var carry = '';
          if (c.op !== 'unset') carry += join + 'fg_op=' + encodeURIComponent(c.op) + '&fg_placement=' + encodeURIComponent(c.placement) + '&fg_campaign=' + encodeURIComponent(c.campaign);
          if (ARRIVAL.utm_source) carry += (carry ? '&' : join) + 'utm_source=' + encodeURIComponent(ARRIVAL.utm_source) + '&utm_medium=' + encodeURIComponent(ARRIVAL.utm_medium) + '&utm_campaign=' + encodeURIComponent(ARRIVAL.utm_campaign);
          try { el.setAttribute('href', href + carry); } catch (e2) {}
        }
      }
      send('click', fields, el);
    } catch (e) {}
  }, true);

  function ctx0() { return opContext(null); }
})();
