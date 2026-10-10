/* POD order routing — Printful + Printify API clients.
   Keys come from process.env only (see .env.example). No key is ever logged. */
'use strict';

async function pf(path, method, body) {
  const key = process.env.PRINTFUL_API_KEY || '';
  if (!key || key.startsWith('{{')) throw new Error('PRINTFUL_API_KEY not configured');
  const r = await fetch('https://api.printful.com' + path, {
    method: method || 'GET',
    headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok || d.code !== 200) throw new Error('Printful ' + path + ': ' + JSON.stringify(d).slice(0, 200));
  return d.result;
}

async function pi(path, method, body) {
  const tok = process.env.PRINTIFY_API_TOKEN || '';
  if (!tok || tok.startsWith('{{')) throw new Error('PRINTIFY_API_TOKEN not configured');
  const r = await fetch('https://api.printify.com/v1' + path, {
    method: method || 'GET',
    headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json();
  if (!r.ok) throw new Error('Printify ' + path + ': ' + JSON.stringify(d).slice(0, 200));
  return d;
}

/* Map our cart items -> provider line items. The variant_id map is filled at
   execution from the Printful/Printify catalog (dashboard -> product -> variant).
   Until mapped, items route to the provider's draft-order queue for review. */
const VARIANT_MAP = JSON.parse(process.env.POD_VARIANT_MAP || '{}');

async function createOrder(order) {
  // order: { email, name, address{...}, items:[{sku, variant_id, qty}], external_id }
  const provider = (process.env.PRINT_PROVIDER || 'printful').toLowerCase();
  if (provider === 'printify') return createPrintifyOrder(order);
  return createPrintfulOrder(order);
}

async function createPrintfulOrder(order) {
  const items = order.items.map((i) => ({
    variant_id: i.variant_id || VARIANT_MAP[i.sku],
    quantity: i.qty,
  })).filter((i) => i.variant_id);
  const body = {
    recipient: {
      name: order.name, email: order.email,
      address1: order.address.line1, address2: order.address.line2 || '',
      city: order.address.city, state_code: order.address.state,
      country_code: order.address.country, zip: order.address.postal_code,
      phone: order.address.phone || '',
    },
    items,
    external_id: order.external_id,
    // confirm: false -> lands as DRAFT for human review on first orders
    confirm: process.env.POD_AUTO_CONFIRM === '1',
  };
  const res = await pf('/orders', 'POST', body);
  return { provider: 'printful', id: res.id, status: res.status };
}

async function createPrintifyOrder(order) {
  const shopId = process.env.PRINTIFY_SHOP_ID || '';
  if (!shopId || shopId.startsWith('{{')) throw new Error('PRINTIFY_SHOP_ID not configured');
  const items = order.items.map((i) => ({
    product_id: i.product_id, variant_id: i.variant_id || VARIANT_MAP[i.sku], quantity: i.qty,
  })).filter((i) => i.variant_id);
  const body = {
    external_id: order.external_id,
    line_items: items,
    shipping_method: 1,
    send_shipping_notification: true,
    address_to: {
      first_name: order.name.split(' ')[0], last_name: order.name.split(' ').slice(1).join(' ') || '-',
      email: order.email, phone: order.address.phone || '',
      country: order.address.country, region: order.address.state,
      address1: order.address.line1, address2: order.address.line2 || '',
      city: order.address.city, zip: order.address.postal_code,
    },
  };
  const res = await pi('/shops/' + shopId + '/orders.json', 'POST', body);
  return { provider: 'printify', id: res.id, status: 'created' };
}

module.exports = { createOrder, VARIANT_MAP };
