/* GRANIT DOG STORE — client config.
   SAFE FOR THE BROWSER: publishable key + per-product Payment Links only.
   Secret keys, webhook secrets, Printful/Printify API keys live SERVER-SIDE
   in ~/workspace/opendeploy/server/.env (never in this file, never in chat).
   {{PLACEHOLDERS}} are filled from his taps (MASTER-TAPS.md). */
window.STORE_CONFIG = {
  storeName: "Silvius Prints",
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
    "silent-harbor:poster18": "{{PL_SILENT_HARBOR_POSTER18}}",
    "silent-harbor:framed18": "{{PL_SILENT_HARBOR_FRAMED18}}",
    "silent-harbor:canvas24": "{{PL_SILENT_HARBOR_CANVAS24}}",
    "blood-moon:poster18": "{{PL_BLOOD_MOON_POSTER18}}",
    "blood-moon:framed18": "{{PL_BLOOD_MOON_FRAMED18}}",
    "constellation-4:poster12": "{{PL_CONSTELLATION_4_POSTER12}}",
    "constellation-4:framed12": "{{PL_CONSTELLATION_4_FRAMED12}}",
    "fog-line:poster18": "{{PL_FOG_LINE_POSTER18}}",
    "fog-line:framed24": "{{PL_FOG_LINE_FRAMED24}}",
    "fog-line:canvas18": "{{PL_FOG_LINE_CANVAS18}}",
    "dune-grammar:poster18": "{{PL_DUNE_GRAMMAR_POSTER18}}",
    "dune-grammar:framed18": "{{PL_DUNE_GRAMMAR_FRAMED18}}",
    "lofoten:poster18": "{{PL_LOFOTEN_POSTER18}}",
    "lofoten:canvas24": "{{PL_LOFOTEN_CANVAS24}}",
    "vermilion:poster12": "{{PL_VERMILION_POSTER12}}",
    "vermilion:framed18": "{{PL_VERMILION_FRAMED18}}",
    "vermilion:canvas18": "{{PL_VERMILION_CANVAS18}}",
    "tide-chart:poster24": "{{PL_TIDE_CHART_POSTER24}}",
    "tide-chart:framed24": "{{PL_TIDE_CHART_FRAMED24}}",
    "neon-rain:poster18": "{{PL_NEON_RAIN_POSTER18}}",
    "neon-rain:framed18": "{{PL_NEON_RAIN_FRAMED18}}",
    "platform-947:poster18": "{{PL_PLATFORM_947_POSTER18}}",
    "platform-947:canvas12": "{{PL_PLATFORM_947_CANVAS12}}",
  },
  /* Analytics IDs — his taps (T-TRACK-1, T-TRACK-2). Empty = tags stay held. */
  metaPixelId: "{{META_PIXEL_ID}}",
  ga4Id: "{{GA4_MEASUREMENT_ID}}",
  /* Newsletter (Kit) — his tap */
  kitFormAction: "{{KIT_FORM_ACTION}}"
};
