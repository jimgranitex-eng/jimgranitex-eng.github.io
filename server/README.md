# Silvius Store Server — runbook

Checkout + POD fulfillment backend for `shop.silvius.world` (op 05) and
`prints.silvius.world` (op 06). Zero npm dependencies — plain Node 18+.

## What it does

1. `POST /api/checkout/session` — storefront cart calls this; the server creates
   a Stripe Checkout Session (secret key never leaves the server) and returns
   the hosted checkout URL. Customer pays on Stripe (SAQ-A).
2. `POST /webhooks/stripe` — Stripe fires `checkout.session.completed`; the
   server verifies the signature and routes the order to Printful or Printify
   via `pod.js`. First orders land as **DRAFT** (`POD_AUTO_CONFIRM` unset) for
   human review — flip to auto-confirm after the $1 test order passes.
3. `GET /health` — liveness.

## Deploy (his VPS or any Node host — his tap on the host)

```bash
cd server
cp .env.example .env        # fill every {{PLACEHOLDER}} from his taps
node server.js              # or pm2 start server.js --name silvius-store
```

Then set the storefronts' `checkoutSessionEndpoint` in
`shop/assets/js/config.js` and `prints/assets/js/config.js` to
`https://<host>/api/checkout/session`, and register the webhook URL
`https://<host>/webhooks/stripe` in the Stripe dashboard
(Developers → Webhooks → Add endpoint, event `checkout.session.completed`).

## Env reference

| Var | Source (his tap) |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (restricted key: checkout sessions write) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Webhooks → the endpoint's signing secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → API keys (also pasted into storefront config.js) |
| `PRINT_PROVIDER` | `printful` or `printify` |
| `PRINTFUL_API_KEY` | Printful dashboard → Settings → API |
| `PRINTIFY_API_TOKEN` / `PRINTIFY_SHOP_ID` | Printify → My Profile → API tokens; shop id from the shop URL |
| `POD_VARIANT_MAP` | JSON map of our SKU → provider variant_id, filled from the provider catalog at setup |
| `POD_AUTO_CONFIRM` | leave unset (draft review) until the test order passes, then `1` |

## Failure behavior (zero-contact safe)

- POD routing throws → the error is logged and the order stays in the Stripe
  dashboard for manual fulfillment. No order is ever silently dropped.
- Webhook signature mismatch → 400, no action taken.
- Session endpoint down → storefronts fall back to per-product Stripe Payment
  Links automatically (see `assets/js/cart.js`).
