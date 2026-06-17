# Render Deployment Guide

This project is deployed as a single Render Web Service.

## Web Service

- Service name: `biomic-whiz-trading`
- Runtime: Node
- Root directory: `.`
- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Auto deploy: enabled

## Environment Variables

Set these in the Render Web Service dashboard:

- `NODE_VERSION=22.11.0`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The app uses Supabase Auth, Row Level Security, and Storage directly from the Next.js web service. Do not add Supabase service-role keys to the frontend or this repository.

## Production Checks

- Confirm the Render Web Service URL is allowed in Supabase Auth redirect/site settings.
- Confirm staff users have `profiles.role = 'staff'` or `'admin'`.
- Apply Supabase migrations before production use.
- Verify `/`, `/request-quotation`, `/admin/login`, and protected admin routes after deploy.
