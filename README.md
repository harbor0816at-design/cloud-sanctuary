# 云上圣所 · Sanctuary

A Christian virtual church you can enter any time — Web + PWA, Chinese / English.
一座随时可以进入的线上教堂（网页 + PWA，中英双语）。

Live: https://cloud-sanctuary.vercel.app

## Structure
- `index.html` — page shell & styles
- `i18n.js` — UI strings (zh/en) and scripture (和合本 1919 / World English Bible, public domain)
- `app.js` — 3D church (Three.js r128), realtime presence (Supabase Realtime), accounts, confessional, candles, prayer wall, prayer gatherings, PayPal payment flow (switched off until configured)
- `admin.html` — prayer-wall moderation (needs admin key)
- `privacy.html` — privacy & terms (bilingual)
- `sw.js`, `manifest.webmanifest` — PWA

Static site, no build step. Deployed on Vercel.

## Backend
Supabase project `find-thief-europe` (shared), all objects prefixed `sanct_`.
Tables have RLS on with no direct anon access; everything goes through `sanct_*` RPC functions.
Payments: `sanct_config.payments_enabled` (false = free beta). PayPal edge functions
`sanct-paypal-checkout` / `sanct-paypal-capture` are still to be deployed.
