/* Silvius affiliate + email server — Operation AFFILIATE-PIVOT (2026-10-10).
   Affiliate-only: NO checkout, NO payments, NO fulfillment. We route, merchants sell.
   Endpoints:
     GET  /health                        -> {ok:true}
     GET  /go/:lane/:slug                -> 302 to merchant (server-side affiliate bridge)
     POST /api/subscribe                 -> {email, source} → double opt-in via Resend
     GET  /api/confirm?token=...         -> confirm subscription, send Email 1, schedule 2+3
     GET  /api/unsubscribe?token=...     -> one-click unsubscribe
     GET  /api/export?key=ADMIN_KEY       -> CSV of confirmed subscribers
   Retired (410): /api/checkout/session, /webhooks/stripe
   Zero dependencies (Node 18+). Storage: node:sqlite with JSON-file fallback.
   Secrets from env only. */
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8787;
const ALLOWED = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const RESEND_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'James <hello@silvius.world>';
const BASE_URL = (process.env.BASE_URL || 'https://jimgranitex-eng-github-io.onrender.com').replace(/\/$/, '');
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const FREE_PACK_URL = process.env.FREE_PACK_URL || 'https://go.silvius.world/kitchen/';
const TRIPWIRE_URL = process.env.TRIPWIRE_URL || 'https://go.silvius.world/kitchen/#tripwire';
const BUNDLE_URL = process.env.BUNDLE_URL || 'https://go.silvius.world/kitchen/#bundle';
const TAG = 'granitex60-20';

/* ---------------- affiliate bridge map (mirrors go/dog + go/prints static pages) ---------------- */
function amz(kw) {
  return `https://www.amazon.com/s?k=${kw}&tag=${TAG}&utm_source=silvius&utm_medium=affiliate&utm_campaign=silvius_bridge`;
}
const BRIDGE = {
  'dog/bandana-granit': amz('dog+bandana'),
  'dog/bowl-mat': amz('dog+bowl+mat'),
  'dog/bundle-bandana-tee': amz('dog+bandana'),
  'dog/bundle-hoodie-hoodie': amz('matching+dog+owner+hoodie'),
  'dog/fleece-blanket': amz('fleece+dog+blanket'),
  'dog/human-hoodie': amz('dog+lover+hoodie'),
  'dog/human-tee': amz('funny+dog+t+shirt'),
  'dog/mug-dog-person': amz('dog+person+mug'),
  'dog/pet-hoodie': amz('dog+hoodie'),
  'dog/pet-sweatshirt': amz('dog+sweatshirt'),
  'dog/sticker-pack': amz('dog+stickers+pack'),
  'dog/tote-paw': amz('paw+print+tote+bag'),
  'prints/blood-moon': amz('blood+moon+wall+art'),
  'prints/constellation-4': amz('constellation+star+map+wall+art'),
  'prints/dune-grammar': amz('desert+dunes+wall+art'),
  'prints/fog-line': amz('foggy+landscape+wall+art'),
  'prints/lofoten': amz('lofoten+norway+wall+art'),
  'prints/neon-rain': amz('neon+city+wall+art'),
  'prints/platform-947': amz('train+station+wall+art'),
  'prints/silent-harbor': amz('moonlit+harbor+wall+art'),
  'prints/tide-chart': amz('nautical+chart+wall+art'),
  'prints/vermilion': amz('red+abstract+wall+art'),
};

/* ---------------- storage: sqlite with JSON fallback ---------------- */
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'email.db');
const JSON_PATH = path.join(__dirname, 'email-store.json');
let db = null, jstore = null;

function initStore() {
  try {
    const { DatabaseSync } = require('node:sqlite');
    db = new DatabaseSync(DB_PATH);
    db.exec(`CREATE TABLE IF NOT EXISTS subscribers (
      email TEXT PRIMARY KEY, status TEXT NOT NULL DEFAULT 'pending',
      confirm_token TEXT, unsub_token TEXT NOT NULL,
      source TEXT, created_at INTEGER, confirmed_at INTEGER);
      CREATE TABLE IF NOT EXISTS scheduled (
      id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL,
      template TEXT NOT NULL, send_at INTEGER NOT NULL, sent_at INTEGER);`);
    console.log('storage: sqlite', DB_PATH);
  } catch (e) {
    console.log('storage: sqlite unavailable (' + e.message + '), using JSON fallback');
    try { jstore = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')); }
    catch { jstore = { subscribers: {}, scheduled: [] }; }
  }
}
function saveJSON() { if (jstore) fs.writeFileSync(JSON_PATH, JSON.stringify(jstore)); }
function getSub(email) {
  email = email.toLowerCase();
  if (db) return db.prepare('SELECT * FROM subscribers WHERE email=?').get(email) || null;
  return jstore.subscribers[email] || null;
}
function putSub(s) {
  if (db) {
    db.prepare(`INSERT INTO subscribers (email,status,confirm_token,unsub_token,source,created_at,confirmed_at)
      VALUES (?,?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET
      status=excluded.status, confirm_token=excluded.confirm_token, source=excluded.source,
      confirmed_at=excluded.confirmed_at`).run(
      s.email, s.status, s.confirm_token, s.unsub_token, s.source, s.created_at, s.confirmed_at);
  } else { jstore.subscribers[s.email] = s; saveJSON(); }
}
function findByToken(token, field) {
  if (db) return db.prepare(`SELECT * FROM subscribers WHERE ${field}=?`).get(token) || null;
  return Object.values(jstore.subscribers).find(x => x[field] === token) || null;
}
function scheduleEmail(email, template, sendAt) {
  if (db) db.prepare('INSERT INTO scheduled (email,template,send_at) VALUES (?,?,?)').run(email, template, sendAt);
  else { jstore.scheduled.push({ email, template, send_at: sendAt, sent_at: null }); saveJSON(); }
}
function dueEmails(now) {
  if (db) return db.prepare('SELECT * FROM scheduled WHERE send_at<=? AND sent_at IS NULL').all(now);
  return jstore.scheduled.filter(x => x.send_at <= now && !x.sent_at);
}
function markSent(id, email, template) {
  const now = Date.now();
  if (db) db.prepare('UPDATE scheduled SET sent_at=? WHERE id=?').run(now, id);
  else { const x = jstore.scheduled.find(y => y.email === email && y.template === template && !y.sent_at); if (x) x.sent_at = now; saveJSON(); }
}
function allConfirmed() {
  if (db) return db.prepare("SELECT email,confirmed_at FROM subscribers WHERE status='confirmed'").all();
  return Object.values(jstore.subscribers).filter(x => x.status === 'confirmed');
}

/* ---------------- email via Resend ---------------- */
async function sendEmail(to, subject, html, unsubUrl) {
  if (!RESEND_KEY || RESEND_KEY.startsWith('{{')) {
    console.log('RESEND not configured — email skipped:', subject, '->', to);
    return { skipped: true };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + RESEND_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL, to: [to], subject, html,
      headers: unsubUrl ? { 'List-Unsubscribe': `<${unsubUrl}>` } : undefined,
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) console.error('Resend failed:', r.status, JSON.stringify(d).slice(0, 200));
  return { ok: r.ok, id: d.id };
}
function unsubFooter(unsubUrl) {
  return `<p style="font-size:12px;color:#888">You're getting this because you signed up for free presets/photo picks. <a href="${unsubUrl}">Unsubscribe</a> — one click, immediate.</p>`;
}
const TEMPLATES = {
  confirm: (s) => ({
    subject: 'Confirm your email — your free presets are waiting',
    html: `<p>One click to confirm:</p><p><a href="${BASE_URL}/api/confirm?token=${s.confirm_token}">Yes, send me the free presets</a></p><p>If you didn't ask for this, ignore it.</p>`,
  }),
  email1: (s) => ({
    subject: 'Your 4 free presets are here (+ a $1 offer, 48 hours)',
    html: `<p>Here's your free mini-pack — 4 presets, install guide:</p><p><a href="${FREE_PACK_URL}">Download the free pack</a></p><p>Install takes 2 minutes (guide covers Classic, CC, and mobile).</p><p>Quick heads-up: there's a one-time offer — the full 10-preset Golden Hour pack for $1, only for 48 hours. No pressure either way; the free pack is yours to keep.</p><p>Happy editing,<br>James</p><p>P.S. Reply with your first edit — I read every one.</p>` + unsubFooter(`${BASE_URL}/api/unsubscribe?token=${s.unsub_token}`),
  }),
  email2: (s) => ({
    subject: 'The $1 offer expires tomorrow',
    html: `<p>Quick reminder: the $1 Golden Hour pack comes off the table tomorrow. After that it's $19 on its own — or $29 for all three packs together.</p><p>If golden hour is your thing, $1 is the cheapest experiment you'll run this year: <a href="${TRIPWIRE_URL}">Get it for $1</a></p><p>Or the whole library (30 presets): <a href="${BUNDLE_URL}">Get the bundle — $29</a></p><p>30-day refund on everything. Zero risk, keep the free pack either way.</p>` + unsubFooter(`${BASE_URL}/api/unsubscribe?token=${s.unsub_token}`),
  }),
  email3: (s) => ({
    subject: 'Show me what you made',
    html: `<p>You've had the presets a week — what did you make with them?</p><p>Hit reply with a before/after (or just the after). I feature reader edits in the weekly roundup, with credit and a link to your page.</p><p>No edit yet? No worries — the install guide's 30-second tune-up section is the fastest way to fall in love with preset #1.</p><p>— James</p>` + unsubFooter(`${BASE_URL}/api/unsubscribe?token=${s.unsub_token}`),
  }),
};

/* ---------------- scheduler ---------------- */
const timers = new Map();
function scheduleDue() {
  const now = Date.now();
  for (const row of dueEmails(now)) {
    const key = (row.id || row.email + row.template);
    if (timers.has(key)) continue;
    const delay = Math.max(0, row.send_at - now);
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      const s = getSub(row.email);
      if (!s || s.status !== 'confirmed') { markSent(row.id, row.email, row.template); return; }
      const t = TEMPLATES[row.template](s);
      await sendEmail(s.email, t.subject, t.html);
      markSent(row.id, row.email, row.template);
      console.log('sequence email sent:', row.template, '->', s.email);
    }, Math.min(delay, 2147483647)));
  }
}
setInterval(scheduleDue, 60 * 60 * 1000); // hourly sweeper

/* ---------------- http ---------------- */
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
function validEmail(e) { return typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()); }

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  if (req.method === 'OPTIONS') {
    const h = {};
    if (ALLOWED.includes(origin)) { h['Access-Control-Allow-Origin'] = origin; h['Access-Control-Allow-Headers'] = 'Content-Type'; }
    res.writeHead(204, h); res.end(); return;
  }
  const url = new URL(req.url, 'http://x');
  try {
    // health
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { ok: true }, origin);

    // server-side affiliate bridge: /go/<lane>/<slug> -> 302
    if (req.method === 'GET' && url.pathname.startsWith('/go/')) {
      const key = url.pathname.slice(4);
      const dest = BRIDGE[key];
      if (!dest) return send(res, 404, { error: 'unknown bridge' }, origin);
      console.log('bridge 302', key);
      res.writeHead(302, { Location: dest }); res.end(); return;
    }

    // retired commerce endpoints (affiliate pivot 2026-10-10)
    if ((req.method === 'POST' && url.pathname === '/api/checkout/session') ||
        (req.method === 'POST' && url.pathname === '/webhooks/stripe')) {
      return send(res, 410, { error: 'retired',
        message: 'Direct checkout is retired. This operation is affiliate-only: we route to merchants, we never take payments.' }, origin);
    }

    // subscribe (double opt-in)
    if (req.method === 'POST' && url.pathname === '/api/subscribe') {
      const { email, source } = JSON.parse(await readBody(req));
      if (!validEmail(email)) return send(res, 400, { error: 'invalid email' }, origin);
      const em = email.trim().toLowerCase();
      const existing = getSub(em);
      if (existing && existing.status === 'confirmed')
        return send(res, 200, { ok: true, message: "You're already on the list." }, origin);
      const s = {
        email: em, status: 'pending',
        confirm_token: crypto.randomBytes(24).toString('hex'),
        unsub_token: (existing && existing.unsub_token) || crypto.randomBytes(24).toString('hex'),
        source: String(source || '').slice(0, 120), created_at: Date.now(), confirmed_at: null,
      };
      putSub(s);
      const t = TEMPLATES.confirm(s);
      await sendEmail(em, t.subject, t.html);
      console.log('subscribe pending', em, s.source);
      return send(res, 200, { ok: true, message: 'Check your inbox to confirm your email.' }, origin);
    }

    // confirm
    if (req.method === 'GET' && url.pathname === '/api/confirm') {
      const token = url.searchParams.get('token') || '';
      const s = findByToken(token, 'confirm_token');
      if (!s || s.status === 'unsubscribed') {
        res.writeHead(400, { 'Content-Type': 'text/html' }); res.end('<p>Invalid or expired confirmation link.</p>'); return;
      }
      if (s.status !== 'confirmed') {
        s.status = 'confirmed'; s.confirmed_at = Date.now(); s.confirm_token = null; putSub(s);
        const t1 = TEMPLATES.email1(s);
        await sendEmail(s.email, t1.subject, t1.html);
        scheduleEmail(s.email, 'email2', Date.now() + 3 * 864e5);
        scheduleEmail(s.email, 'email3', Date.now() + 7 * 864e5);
        scheduleDue();
        console.log('confirmed', s.email);
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>You\'re in!</h1><p>Your free presets are on the way — check your inbox. The $1 offer details are in the email.</p>');
      return;
    }

    // unsubscribe (one click)
    if (req.method === 'GET' && url.pathname === '/api/unsubscribe') {
      const token = url.searchParams.get('token') || '';
      const s = findByToken(token, 'unsub_token');
      if (s) { s.status = 'unsubscribed'; putSub(s); console.log('unsubscribed', s.email); }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>Unsubscribed</h1><p>You\'re off the list — immediate, no questions.</p>');
      return;
    }

    // CSV export (admin)
    if (req.method === 'GET' && url.pathname === '/api/export') {
      if (!ADMIN_KEY || url.searchParams.get('key') !== ADMIN_KEY)
        return send(res, 403, { error: 'forbidden' }, origin);
      const rows = allConfirmed();
      const csv = 'email,confirmed_at\n' + rows.map(r =>
        `"${r.email}","${new Date(r.confirmed_at).toISOString()}"`).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="subscribers.csv"' });
      res.end(csv); return;
    }

    return send(res, 404, { error: 'not found' }, origin);
  } catch (e) {
    console.error(e.message);
    return send(res, 500, { error: 'server error' }, origin);
  }
});

initStore();
scheduleDue();
server.listen(PORT, () => console.log('silvius-affiliate-server on :' + PORT));
