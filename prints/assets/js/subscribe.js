/* Affiliate-pivot: self-built newsletter subscribe (replaces Kit).
   Attaches to forms with [data-subscribe]; POSTs to the Silvius server. */
(function () {
  'use strict';
  function onSubmit(e) {
    e.preventDefault();
    var f = e.target;
    var email = (f.querySelector('input[type=email]') || {}).value || '';
    var msg = f.querySelector('.nl-msg');
    var btn = f.querySelector('button[type=submit]');
    if (!email || email.indexOf('@') < 0) { if (msg) { msg.hidden = false; msg.textContent = 'Enter a valid email.'; } return; }
    if (btn) btn.disabled = true;
    fetch(f.action, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, source: location.pathname }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        if (msg) { msg.hidden = false; msg.textContent = x.d.message || (x.ok ? 'Check your inbox to confirm.' : 'Something went wrong.'); }
        if (x.ok) f.reset();
        try { if (window.__fgFootprint) window.__fgFootprint('newsletter_subscribe', { ok: !!x.ok }); } catch (e) {}
      })
      .catch(function () { if (msg) { msg.hidden = false; msg.textContent = 'Something went wrong — try again.'; } })
      .finally(function () { if (btn) btn.disabled = false; });
  }
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('form[data-subscribe]').forEach(function (f) {
      if (!f.querySelector('.nl-msg')) {
        var p = document.createElement('p'); p.className = 'nl-msg'; p.hidden = true;
        p.style.cssText = 'font-size:.85rem;margin-top:.4rem'; f.appendChild(p);
      }
      f.addEventListener('submit', onSubmit);
    });
  });
})();
