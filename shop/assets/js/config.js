/* STORE PICKS — client config (affiliate-only, no checkout, no cart).
   SAFE FOR THE BROWSER: affiliate tag + subscribe endpoint only.
   Server secrets (Resend API key, admin key) live SERVER-SIDE in the
   Render service environment — never in this file, never in chat.
   {{PLACEHOLDERS}} are filled from his taps. */
window.STORE_CONFIG = {
  supportEmail: "{{SUPPORT_EMAIL}}",
  companyName: "{{COMPANY_NAME}}",
  /* Analytics IDs — his taps. Empty = tags stay held. */
  metaPixelId: "{{META_PIXEL_ID}}",
  ga4Id: "{{GA4_MEASUREMENT_ID}}",
  /* Affiliate bridge: static pages under go/<lane>/<slug>.html */
  affiliateTag: "granitex60-20",
  affiliateMerchant: "amazon",
  /* Self-built newsletter (replaces Kit) — Silvius server */
  subscribeEndpoint: "https://jimgranitex-eng-github-io.onrender.com/api/subscribe"
};
