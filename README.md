# AvidiaTech App

## Environment setup

This project expects the Clerk, Supabase, and Stripe credentials to be available at build and runtime. Configure the variables in both Vercel **and** your local `.env.local` when running the app outside Vercel.

Required keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (plus any publishable key you expose to the client)

### Local development

1. Copy `.env.example` to `.env.local` and paste your secrets.
2. Run `npm run dev` to start the app with Clerk authentication wired.

You can also run `vercel env pull .env.local` to sync the variables from the Vercel project into your local file.

### Vercel deployment

Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set for **Production**, **Preview**, and **Development** environments in Vercel Project Settings → Environment Variables so middleware and edge routes can read them during the build. When these are missing, Next.js may fail to generate `.next/server/middleware.js.nft.json` (and similar) because the build aborts before emitting middleware assets.

