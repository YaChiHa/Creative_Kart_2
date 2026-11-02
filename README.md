# Creative Kart

Mobile-first family-storefront built with React, TypeScript and Vite. Customers browse products and contact the store to enquire or arrange a purchase. There is no online payment checkout and no delivery-tracking promise.

## Run locally on Android / Termux

1. Keep the project inside Termux's private home directory (not shared Downloads) so npm can create symlinks.
2. Run `npm install`.
3. Run `npm run dev -- --host 0.0.0.0`.
4. Open the local URL printed by Vite, usually `http://localhost:5173`.

## Cloud backend setup (required for cross-device sync)

The app uses Supabase for shared products, store contact settings, owner authentication and enquiries.

1. Create a Supabase project.
2. Open the SQL Editor and run the complete `supabase/schema.sql` file.
3. In Supabase Authentication, create the owner's email/password user. Disable public sign-ups after creating the owner account.
4. Copy that user's Auth UUID. In SQL Editor run:
   `insert into public.admin_users (user_id) values ('OWNER_AUTH_USER_UUID');`
5. Copy `.env.example` to `.env.local` and fill in the Supabase Project URL and public anon/publishable key from Project Settings → API.
6. For local development restart Vite after changing environment variables. For a hosted deployment, add the same two variables to the hosting provider's environment settings and redeploy.
7. Sign in at `/admin` using the owner's Supabase email and password. Product, stock, contact settings and enquiries then use the shared database and realtime updates.

**Security:** Never use the Supabase service-role/secret key in this browser app. The schema enables Row Level Security. Only UUIDs explicitly inserted into `admin_users` receive admin write access. Keep the owner password private and use a strong unique password.

## Demo fallback

Without Supabase environment variables, the app runs in local demo mode and stores changes in the current browser only. The demo password is `demo1234`; this is not secure authentication. Do not use real customer data in demo mode.

## GitHub Actions

The workflow runs TypeScript/Vite production build on pushes, pull requests and manual dispatch, then uploads the `dist/` artifact. A successful build validates compilation and bundling; it does not prove Supabase credentials, database policies or a live deployment are configured.

## Current scope

- Shared cloud products and contact settings with realtime refresh (when configured)
- Supabase email/password owner authentication and RLS-protected admin writes
- Product editing, featured products, stock counts and low-stock visibility
- Customer enquiries saved centrally and visible to the owner
- WhatsApp and Instagram contact; customers arrange purchase details directly with the store
- No online payments and no courier/tracking claims

Before accepting real customer data, configure Supabase, test RLS using a non-admin session, add a privacy policy and confirm store contact/operating details.
