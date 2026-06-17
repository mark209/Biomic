# Render Deployment Guide

## 1. Architecture

This repository is a single-root Next.js application with a separate static landing page folder.

- Landing page frontend: Render Static Site from `static-site/`, built into `static-site-dist/`.
- Service portal web app: Render Web Service running the Next.js app with `next start`.
- Database/auth/storage: existing Supabase project.

There is no separate Express/Fastify/Django-style backend in this repository. The service portal uses Next.js middleware plus Supabase Auth, PostgreSQL, Row Level Security, and Storage. Because the admin portal depends on Next middleware and Supabase SSR cookie handling, it should be deployed as a Render Web Service, not as a Render Static Site.

## 2. Project Structure Found

- Root app: `.`.
- Main app package file: `package.json`.
- Next.js app routes: `app/`.
- UI components: `components/`.
- Supabase helpers and business logic: `lib/`.
- Supabase schema/migrations: `supabase/`.
- Static landing page source: `static-site/`.
- Static landing page build output: `static-site-dist/`, generated and ignored by git.

## 3. Frontend Static Site Setup

Use this for the public landing page only.

- Root directory: `.`
- Build command: `npm ci && npm run build:static`
- Publish directory: `static-site-dist`
- Environment variables:
  - `STATIC_PORTAL_URL=https://your-backend-web-service.onrender.com`

The static site uses `STATIC_PORTAL_URL` at build time to generate `config.js`. Portal links such as Book Service and Portal Login are not hardcoded in source; they are generated from this value.

SPA-style rewrite:

- Source: `/*`
- Destination: `/index.html`

This rewrite is included in `render.yaml` and `render.static.yaml`.

## 4. Backend Web Service Setup

Use this for the actual Daikin Service Portal / admin system.

- Root directory: `.`
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Port handling: Next.js `next start` respects Render's `PORT` environment variable.

Environment variables:

- `NODE_VERSION=22.11.0`
- `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key`

These Supabase variables use the `NEXT_PUBLIC_` prefix because the current app uses Supabase's publishable browser key directly with Row Level Security. Do not add Supabase service-role keys to the frontend or this repository.

## 5. Authentication Notes

Authentication is Supabase Auth using SSR/browser clients from `@supabase/ssr`.

- Client login uses `supabase.auth.signInWithPassword`.
- Middleware/proxy checks Supabase session claims for `/admin`.
- Admin access also requires `staff` or `admin` role evidence from auth metadata or `profiles.role`.
- Session cookies are managed by Supabase SSR helpers.

Render does not require CORS configuration for this Next.js portal because the app talks directly to Supabase, not to a separate custom API service in this repository.

Supabase project configuration to verify:

- Add the Render Web Service URL to Supabase Auth allowed site/redirect URLs if your login flow requires it.
- Ensure staff users have `profiles.role = 'staff'` or `'admin'`, or trusted auth metadata with that role.
- Apply required Supabase migrations before production use.

## 6. Database Notes

The current database is Supabase PostgreSQL.

- No Render PostgreSQL database is required for this codebase.
- No schema reset is required.
- Do not expose database connection strings to the static site or Next public environment variables.
- Do not run destructive migrations.

If you choose to move from Supabase to a Render database later, that would be a separate backend/database migration project and is not covered by this deployment prep.

## 7. CORS Notes

There is no custom backend API in this repository that needs CORS configuration.

If a future Express/API service is added, configure it to allow:

- `http://localhost:3000`
- the Render Static Site URL
- the Render Web Service URL if needed
- any custom production domain

Do not use wildcard CORS with credentialed cookies.

## 8. Blueprint Deployment

`render.yaml` defines:

- `biomic-whiz-trading`: Render Web Service for the Next.js portal.
- `biomic-whiz-landing`: Render Static Site for the static landing page.

Secrets/private values use `sync: false`, so you must fill them in the Render Dashboard.

## 9. Render Dashboard Setup

Recommended order:

1. Push this repository to GitHub/GitLab/Bitbucket.
2. Open Render Dashboard.
3. Create a new Blueprint from the repository, or create services manually using the settings below.
4. Deploy the Web Service first.
5. Copy the Web Service URL.
6. Set `STATIC_PORTAL_URL` on the Static Site to the Web Service URL.
7. Redeploy the Static Site.
8. Verify links from the landing page open `/request-quotation` and `/admin/login` on the Web Service.

Manual Web Service settings:

- Service type: Web Service
- Name: `biomic-whiz-trading`
- Root directory: `.`
- Runtime: Node
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment:
  - `NODE_VERSION=22.11.0`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Manual Static Site settings:

- Service type: Static Site
- Name: `biomic-whiz-landing`
- Root directory: `.`
- Build command: `npm ci && npm run build:static`
- Publish directory: `static-site-dist`
- Environment:
  - `STATIC_PORTAL_URL=https://your-backend-web-service.onrender.com`
- Rewrite:
  - `/*` to `/index.html`

## 10. Testing Checklist After Deployment

Web Service:

- Open `/`.
- Open `/request-quotation`.
- Submit a test inquiry.
- Open `/admin/login`.
- Log in with a staff/admin Supabase user.
- Confirm `/admin`, `/admin/customers`, `/admin/inquiries`, `/admin/quotation-builder`, `/admin/quotations`, `/admin/service-schedule`, and other sidebar routes load.
- Save a quotation.
- Confirm protected routes redirect unauthenticated users to `/admin/login`.

Static Site:

- Open the Static Site root URL.
- Click Book Service.
- Confirm it opens the Web Service `/request-quotation`.
- Click Portal Login.
- Confirm it opens the Web Service `/admin/login`.
- Refresh the Static Site root and nested/static paths to confirm rewrites do not 404.

Supabase:

- Confirm production URL is allowed in Supabase Auth configuration.
- Confirm RLS policies are applied.
- Confirm staff users have correct roles.
- Confirm storage bucket `inquiry-photos` exists with expected policies.

## 11. Troubleshooting

Build fails with missing Supabase env vars:

- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the Web Service environment.

Admin redirects back to login after successful sign-in:

- Confirm the logged-in user has `profiles.role = 'staff'` or `'admin'`.
- Confirm the latest Supabase migration has been applied.

Landing page links point to the wrong portal:

- Set `STATIC_PORTAL_URL` on the Static Site.
- Redeploy the Static Site because this value is used at build time.

Nested admin route refresh fails:

- Make sure you are using the Render Web Service URL for the Next app, not the Static Site URL.

Static Site refresh fails:

- Confirm the Render rewrite `/*` to `/index.html` exists.

## 12. Production Cleanup Checklist

- No hardcoded `localhost` URLs were found.
- Static landing source no longer hardcodes the previous Render URL.
- `.env.example` contains placeholders only.
- `.env.local` is ignored by git.
- No service-role key is required by the frontend.
- Build, lint, typecheck, and tests should pass before deploying.
