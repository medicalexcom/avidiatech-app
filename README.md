# AvidiaTech App

## Environment setup

This project expects the Clerk, Supabase, and Stripe credentials to be available at build and runtime. The deployment is already configured with these values in Vercel, and the app reads them from `process.env` at runtime.

Required keys:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `STRIPE_SECRET_KEY` (plus any publishable key you expose to the client)

### Local development

Use `vercel dev` to mirror the Vercel environment when running locally, or export the needed variables in your shell before starting the app:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=... CLERK_SECRET_KEY=... npm run dev
```

### Vercel deployment

Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are set for **Production**, **Preview**, and **Development** environments in Vercel Project Settings → Environment Variables so middleware and edge routes can read them during the build. When these are missing, Next.js may fail to generate `.next/server/middleware.js.nft.json` (and similar) because the build aborts before emitting middleware assets.

