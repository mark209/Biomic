# Daikin Authorized Service Center

Production-ready MVP for a Daikin Authorized Service Center operations and quotation workflow.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Auth, PostgreSQL, and Storage
- React Hook Form
- Zod
- jsPDF quotation exports

## Setup

1. Install dependencies with `npm install`.
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Create staff/admin users in Supabase Auth.
6. Run `npm run dev`.

## Deployment

Deploy to Vercel and add the same Supabase environment variables in the Vercel project settings.

The frontend only uses the Supabase publishable key. Do not expose service role or secret keys to the browser.
