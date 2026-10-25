# Creative Kart — Functional Demo

React + TypeScript + Vite mobile-first storefront for owner review. This is a demo, not production.

## Run on Android / Termux
Install Node.js and Git in Termux, clone the repo, run npm install, then npm run dev -- --host 0.0.0.0. Open the local URL shown by Vite. For a production build run npm run build. GitHub Actions uploads the dist artifact.

## Included demo flows
Catalogue, search, category filtering, product details, cart quantity/stock checks, INR totals, WhatsApp message generation, Instagram link and copyable summary, browser-local enquiries, demo admin at /admin, product editing, featured toggle, enquiry status, contact settings, manifest and offline fallback page.

## Important limitations
The demo admin password is demo1234 and is checked in browser code. It is NOT secure authentication. Data persists only in the same browser via localStorage. No real backend, protected API, secure session, database, image upload or live courier integration is configured. No service worker/offline cache is included. Demo content and contacts are placeholders. Do not use real customer data. This demo is not approved for production or public deployment.

Before production, configure a real server-side backend, hashed admin password, secure sessions, authorization on every admin API, persistent database, storage, input validation, privacy policy and real store details. No payment gateway is included.