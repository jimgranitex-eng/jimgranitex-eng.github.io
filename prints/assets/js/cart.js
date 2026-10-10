/* Silvius Prints Store — cart UI (localStorage). Zero-contact: no account needed. */
(function () {
  'use strict';
  var KEY = 'silviusprints_cart_v1';
  var CFG = window.STORE_CONFIG || {};

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } }
  function save(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} updateBadge(); }

  function updateBadge() {
    var n = load().reduce(function (s, i) { return s + (i.qty || 0); }, 0);
    document.querySelectorAll('.cart-count').forEach(function (el) { el.textContent = n; });
  }

  function money(cents) { return '$' + (cents / 100).toFixed(2); }

  window.GDCart = {
    add: function (item) {
      var items = load();
      var found = items.find(function (i) { return i.id === item.id && i.variant === item.variant; });
      if (found) found.qty += item.qty || 1;
      else items.push({ id: item.id, name: item.name, variant: item.variant || '', price: item.price, qty: item.qty || 1, img: item.img || '' });
      save(items);
      if (window.__fgFootprint) window.__fgFootprint('add_to_cart', { name: item.name, value: (item.price / 100), currency: 'USD' });
      return items;
    },
    remove: function (id, variant) { save(load().filter(function (i) { return !(i.id === id && i.variant === variant); })); },
    setQty: function (id, variant, qty) {
      var items = load();
      items.forEach(function (i) { if (i.id === id && i.variant === variant) i.qty = Math.max(0, qty | 0); });
      save(items.filter(function (i) { return i.qty > 0; }));
    },
    items: load,
    total: function () { return load().reduce(function (s, i) { return s + i.price * i.qty; }, 0); },
    money: money,
    /* Checkout: prefer server-created Checkout Session; fall back to
       per-product Payment Links; else honest "opens soon" state. */
    checkout: function () {
      var items = load();
      if (!items.length) return;
      var ep = CFG.checkoutSessionEndpoint || '';
      if (ep && ep.indexOf('{{') !== 0) {
        fetch(ep, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: items, page_id: (window.__txFootprint && 'n/a') || '' })
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (d && d.url) { location.href = d.url; }
          else fallbackLinks(items);
        }).catch(function () { fallbackLinks(items); });
      } else { fallbackLinks(items); }
    }
  };

  function fallbackLinks(items) {
    var links = CFG.paymentLinks || {};
    var missing = items.filter(function (i) { var u = links[i.id] || ''; return !u || u.indexOf('{{') === 0; });
    if (missing.length) {
      alert('Checkout for "' + missing[0].name + '" opens as soon as its payment link is connected. The $1 test order tap covers this.');
      return;
    }
    /* Multi-item: open each product's payment link (single-checkout activates
       with the session endpoint). One item: direct redirect. */
    if (items.length === 1) { location.href = links[items[0].id]; return; }
    var list = items.map(function (i) { return '<li><a href="' + links[i.id] + '">' + escapeHtml(i.name) + ' × ' + i.qty + ' — checkout</a></li>'; }).join('');
    var div = document.createElement('div');
    div.innerHTML = '<h2>Check out each item</h2><p>Combined one-step checkout activates when the checkout server is connected. For now, each item checks out on its own secure Stripe page:</p><ul>' + list + '</ul>';
    document.querySelector('.cart-totals').appendChild(div);
  }

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  document.addEventListener('DOMContentLoaded', updateBadge);
})();
