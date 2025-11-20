import Link from 'next/link';

// Import Clerk's server-side auth helper. This lets us check if a user
// is authenticated when rendering the home page. If a user is signed in,
// we'll send them straight to the dashboard; otherwise we'll prompt
// them to sign up.
import { auth } from '@clerk/nextjs/server';

// Tell Next.js that this page is always dynamically rendered. Without
// this flag, the page could be statically generated at build time and
// wouldn't be able to check the current auth state.
export const dynamic = 'force-dynamic';

// Marketing copy for the three product pillars displayed on the landing
// page. Keeping these in an array makes the JSX cleaner below.
const pillars = [
  {
    title: 'Product data intelligence',
    copy: 'Extract, enrich, and format product data with opinionated workflows for descriptions, specs, and SEO‑ready content.',
  },
  {
    title: 'Operational guardrails',
    copy: 'Tenant‑aware access, usage metering, and Stripe‑ready subscription states keep teams aligned on limits and rollout.',
  },
  {
    title: 'Developer ergonomics',
    copy: 'Next.js App Router, Clerk auth, and Supabase migrations ship with API stubs so engineers can plug in services fast.',
  },
];

// Additional feature bullets shown near the bottom of the page.
const capabilities = [
  'Centralized dashboard for analytics, imports, feeds, and automation.',
  'Role‑based access with owner overrides and subscription gating baked in.',
  'Translation, clustering, and variant workflows that keep catalogs consistent.',
  'Usage counters and quotas ready for metered billing and diagnostics.',
];

// The main landing page component. Because it's async, we can await
// Clerk's auth() call to determine whether a user is signed in. That
// allows us to set the "Get Started" link dynamically: guests go to
// /sign‑up, whereas authenticated users go straight to /dashboard.
export default async function Home() {
  const { userId } = await auth();
  const getStartedHref = userId ? '/dashboard' : '/sign-up';

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-20">
        <section className="grid items-center gap-10 lg:grid-cols-2">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm font-semibold text-blue-200 ring-1 ring-white/10">
              Secured by Clerk • Subscription ready
            </p>
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                AvidiaTech product data automation
              </h1>
              <p className="text-lg text-slate-200">
                Ingest, enrich, and monitor every SKU in one workspace. Clerk guards access, Supabase tracks tenants, and Stripe handles upgrades so your team can ship features—not boilerplate.
              </p>
            </div>
            {/* CTA buttons */}
            <div className="flex flex-wrap items-center gap-4">
              {/* Dynamic "Get Started" button: signed-in users go to dashboard, others to sign-up */}
              <Link
                href={getStartedHref}
                className="inline-flex items-center justify-center rounded-lg bg-blue-500 px-5 py-3 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:bg-blue-400"
              >
                Get Started
              </Link>
              {/* Static "Open Dashboard" button */}
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-base font-semibold text-white transition hover:border-white/40 hover:bg-white/5"
              >
                Open Dashboard
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {pillars.map((item) => (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
                  <p className="text-sm font-semibold text-blue-200">{item.title}</p>
                  <p className="mt-2 text-sm text-slate-200">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-blue-900/30">
            <div className="rounded-2xl bg-slate-950 p-6 ring-1 ring-white/10">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Secure access</span>
                <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-emerald-200">Clerk live</span>
              </div>
              <div className="mt-4 space-y-3 text-slate-100">
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-200">Tenant-aware dashboard</span>
                  <span className="text-xs text-blue-200">Protected</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-200">Usage + quotas</span>
                  <span className="text-xs text-blue-200">Metered</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-200">Owner overrides</span>
                  <span className="text-xs text-emerald-200">Unlimited</span>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span className="text-sm text-slate-200">Stripe billing</span>
                  <span className="text-xs text-amber-200">Upgrade ready</span>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-inner">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <h2 className="text-2xl font-semibold text-white">Built for production launches</h2>
              <p className="text-base text-slate-200">
                Every workflow is wired for real tenants: authentication with Clerk, owner bypass rules, usage counters, and subscription checks that guard premium actions while still logging activity.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-sm text-slate-200">
              {capabilities.map((item) => (
                <span key={item} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 ring-1 ring-white/15">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
