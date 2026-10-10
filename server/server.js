/* Silvius store server — Stripe Checkout sessions + webhook -> POD routing.
   Zero dependencies (Node 18+). Secrets from .env only. PCI posture: SAQ-A —
   card data never touches this server; Stripe hosts checkout. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const { createOrder } = require('./pod');

const PORT = process.env.PORT || 8787;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

function send(res, code, obj, origin) {
  const h = { 'Content-Type': 'application/json' };
  if (origin && ALLOWED.includes(origin)) h['Access-Control-Allow-Origin'] = origin;
  res.writeHead(code, h); res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) req.destroy(); });
    req.on('end', () => resolve(b)); req.on('error', reject);
  });
}
function stripe(path, method, params, idem) {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key || key.startsWith('{{')) throw new Error('STRIPE_SECRET_KEY not configured');
  const form = new URLSearchParams(params).toString();
  return fetch('https://api.stripe.com/v1' + path, {
    method: method || 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(key + ':').toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idem ? { 'Idempotency-Key': idem } : {}),
    },
    body: form,
  }).then(r => r.json().then(d => ({ ok: r.ok, d })));
}
function verifyStripeSignature(raw, sig, secret) {
  // Stripe-Signature: t=...,v1=...
  const parts = Object.fromEntries(sig.split(',').map(p => p.split('=')));
  const expected = crypto.createHmac('sha256', secret).update(parts.t + '.' + raw).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1 || ''));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    const h = {};
    if (ALLOWED.includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Access-Control-Allow-Headers'] = 'Content-Type'; }
    res.writeHead(204, h); res.end(); return;
  }
  try {
    if (req.method === 'POST' && req.url === '/api/checkout/session') {
      const { items, success_url, cancel_url } = JSON.parse(await readBody(req));
      if (!Array.isArray(items) || !items.length) return send(res, 400, { error: 'empty cart' }, origin);
      const params = {
        mode: 'payment',
        'success_url': success_url || (origin + '/success.html?session_id={CHECKOUT_SESSION_ID}'),
        'cancel_url': cancel_url || (origin + '/cart.html'),
        'customer_creation': 'always',
        'shipping_address_collection[allowed_countries][0]': 'US',
        'shipping_address_collection[allowed_countries][1]': 'GB',
      };
      items.forEach((i, n) => {
        params[`line_items[${n}][price_data][currency]`] = 'usd';
        params[`line_items[${n}][price_data][product_data][name]`] = String(i.name).slice(0, 120);
        params[`line_items[${n}][price_data][unit_amount]`] = String(Math.round(i.price));
        params[`line_items[${n}][quantity]`] = String(i.qty || 1);
        params[`line_items[${n}][price_data][product_data][metadata][sku]`] = String(i.id).slice(0, 80);
      });
      const { ok, d } = await stripe('/checkout/sessions', 'POST', params, 'cart-' + Date.now());
      if (!ok || !d.url) return send(res, 502, { error: 'stripe session failed' }, origin);
      return send(res, 200, { url: d.url, id: d.id }, origin);
    }
    if (req.method === 'POST' && req.url === '/webhooks/stripe') {
      const raw = await readBody(req);
      const sig = req.headers['stripe-signature'] || '';
      const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
      if (!secret || secret.startsWith('{{')) return send(res, 500, { error: 'webhook secret not configured' }, origin);
      if (!verifyStripeSignature(raw, sig, secret)) return send(res, 400, { error: 'bad signature' }, origin);
      const ev = JSON.parse(raw);
      if (ev.type === 'checkout.session.completed') {
        const s = ev.data.object;
        // Fetch line items to build the POD order
        const key = process.env.STRIPE_SECRET_KEY;
        const li = await fetch(`https://api.stripe.com/v1/checkout/sessions/${s.id}/line_items`, {
          headers: { 'Authorization': 'Basic ' + Buffer.from(key + ':').toString('base64') },
        }).then(r => r.json());
        try {
          const result = await createOrder({
            email: (s.customer_details || {}).email,
            name: ((s.customer_details || {}).name) || 'Customer',
            address: (s.shipping_details || {}).address || (s.customer_details || {}).address || {},
            items: (li.data || []).map(x => ({ sku: (x.price.product && '') || x.description, qty: x.quantity })),
            external_id: 'stripe:' + s.id,
          });
          console.log('POD order routed', s.id, JSON.stringify(result));
        } catch (e) {
          console.error('POD routing failed for', s.id, e.message);
          // order stays visible in Stripe dashboard for manual fulfillment — nothing is lost
        }
      }
      return send(res, 200, { received: true }, origin);
    }
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true }, origin);
    return send(res, 404, { error: 'not found' }, origin);
  } catch (e) {
    console.error(e.message);
    return send(res, 500, { error: 'server error' }, origin);
  }
});

server.listen(PORT, () => console.log('silvius-store-server on :' + PORT));
