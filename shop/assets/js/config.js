/* GRANIT DOG STORE — client config.
   SAFE FOR THE BROWSER: publishable key + per-product Payment Links only.
   Secret keys, webhook secrets, Printful/Printify API keys live SERVER-SIDE
   in ~/workspace/opendeploy/server/.env (never in this file, never in chat).
   {{PLACEHOLDERS}} are filled from his taps (MASTER-TAPS.md). */
window.STORE_CONFIG = {
  storeName: "Granit Dog",
  supportEmail: "{{SUPPORT_EMAIL}}",
  companyName: "{{COMPANY_NAME}}",
  /* Stripe publishable key (pk_live_...) — public by design */
  stripePublishableKey: "{{STRIPE_PUBLISHABLE_KEY}}",
  /* Server endpoint that creates Stripe Checkout Sessions (Node stub in
     ~/workspace/opendeploy/server/). Until deployed, checkout falls back
     to per-product Payment Links below. */
  checkoutSessionEndpoint: "{{CHECKOUT_SESSION_ENDPOINT}}",
  /* Per-product Stripe Payment Links (created in his Stripe dashboard —
     dashboard.stripe.com/payment-links → New; one per product). */
  paymentLinks: {
    "bandana-granit":        "{{PL_BANDANA}}",
    "pet-hoodie":            "{{PL_PET_HOODIE}}",
    "pet-sweatshirt":        "{{PL_PET_SWEATSHIRT}}",
    "human-tee":             "{{PL_HUMAN_TEE}}",
    "human-hoodie":          "{{PL_HUMAN_HOODIE}}",
    "tote-paw":              "{{PL_TOTE}}",
    "mug-dog-person":        "{{PL_MUG}}",
    "fleece-blanket":        "{{PL_BLANKET}}",
    "bowl-mat":              "{{PL_BOWLMAT}}",
    "sticker-pack":          "{{PL_STICKERS}}",
    "bundle-bandana-tee":    "{{PL_BUNDLE_BANDANA_TEE}}",
    "bundle-hoodie-hoodie":  "{{PL_BUNDLE_HOODIE_HOODIE}}"
  },
  /* Analytics IDs — his taps (T-TRACK-1, T-TRACK-2). Empty = tags stay held. */
  metaPixelId: "{{META_PIXEL_ID}}",
  ga4Id: "{{GA4_MEASUREMENT_ID}}",
  /* Newsletter (Kit) — his tap */
  kitFormAction: "{{KIT_FORM_ACTION}}"
};
