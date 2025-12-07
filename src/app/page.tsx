"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

const pillars = [
  {
    title: "Ingest once. Reuse everywhere.",
    copy: "Turn any manufacturer URL into clean, structured product data that fuels SEO pages, feeds, and exports.",
  },
  {
    title: "Opinionated, not generic.",
    copy: "Battle-tested workflows for medical and technical catalogs—built to prevent messy, half-baked product pages.",
  },
  {
    title: "Ready for teams, not side projects.",
    copy: "Multi-tenant by design with roles, quotas, and audit trails wired in from day one.",
  },
];

const stats = [
  { label: "SKUs processed", value: "1M+", hint: "Designed for very large catalogs" },
  { label: "Modules", value: "15+", hint: "Extract, Describe, SEO & more" },
  { label: "Time saved", value: "10–20 hrs/wk", hint: "Per ops or content lead" },
];

const modules = [
  {
    name: "AvidiaExtract",
    badge: "Scraping & normalization",
    copy: "Ingest manufacturer URLs and normalize specs, manuals, and images into clean JSON.",
    tag: "Data-first",
  },
  {
    name: "AvidiaDescribe",
    badge: "AI product copy",
    copy: "Generate compliant, on-brand descriptions from your structured product data.",
    tag: "SEO-aware",
  },
  {
    name: "AvidiaSEO",
    badge: "Full SEO workflow",
    copy: "Titles, meta, H1s, and internal links built from your ingest—no copy-paste required.",
    tag: "Search-ready",
  },
  {
    name: "AvidiaMatch",
    badge: "Catalog intelligence",
    copy: "Match, dedupe, and cluster SKUs across vendors and channels without spreadsheets.",
    tag: "Ops-grade",
  },
];

const audiences = [
  {
    title: "Store & brand owners",
    copy: "Ship SEO-ready product pages without living in Google Sheets. Keep brand rules intact as your catalog grows.",
  },
  {
    title: "Ops & content teams",
    copy: "Swap fire-drills for flows. Let AvidiaTech handle variants, specs, and approvals while you spot-check edge cases.",
  },
  {
    title: "Developers & data teams",
    copy: "You get APIs, webhooks, and a clear schema instead of ad-hoc scraping scripts and brittle cron jobs.",
  },
];

const howItWorks = [
  {
    step: "1. Drop a manufacturer URL",
    copy: "AvidiaExtract scrapes and normalizes specs, docs, variants, and media into a single, reusable product payload.",
  },
  {
    step: "2. Let AI do the heavy lifting",
    copy: "AvidiaDescribe and AvidiaSEO apply your custom instructions to generate descriptions, titles, and metadata.",
  },
  {
    step: "3. Sync everywhere you sell",
    copy: "Push structured output to your store, PIM, or feeds. Monitor changes and rerun flows when vendors update content.",
  },
];

const capabilities = [
  "Multi-tenant dashboard with analytics, imports, and automation flows.",
  "Role-based access, owner overrides, and subscription-aware feature gates.",
  "Translation, clustering, and variant tooling to keep catalogs coherent.",
  "Usage counters, quotas, and logs ready for metered billing and diagnostics.",
];

export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  // Redirect signed-in users straight into the workspace
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  // Lightweight, no-auth AvidiaDescribe sample demo
  const [demoUrl, setDemoUrl] = useState(
    "https://vendor.com/products/infusion-pump-9000"
  );
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<"idle" | "running" | "done">(
    "idle"
  );
  const [demoRunsLeft, setDemoRunsLeft] = useState(1);
  const [demoError, setDemoError] = useState<string | null>(null);

  const handleDemoRun = () => {
    if (!demoUrl.trim()) {
      setDemoError("Add a manufacturer URL to preview a sample description.");
      return;
    }

    if (demoRunsLeft <= 0) {
      setDemoError(
        "Sample limit reached. Create a free workspace to generate full SEO outputs."
      );
      return;
    }

    setDemoError(null);
    setDemoStatus("running");

    // Mock async behavior – later you can swap this for a real public API call.
    setTimeout(() => {
      setDemoOutput(
        `Sample SEO description for product at ${demoUrl}.\n\nAvidiaDescribe would generate a compliant, search-aware paragraph here based on your ingestion and custom GPT instructions. In your workspace, this becomes a full HTML + SEO JSON payload ready to sync to your store.`
      );
      setDemoStatus("done");
      setDemoRunsLeft((prev) => prev - 1);
    }, 700);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-6">
        {/* HEADER */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-cyan-500 via-emerald-400 to-amber-400 shadow-sm shadow-cyan-500/40" />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                AvidiaTech
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Product Data OS
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <a
              href="https://avidiatech.com"
              className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-50"
            >
              Back to main site
            </a>
            <a
              href="/docs"
              className="hidden text-slate-600 hover:text-slate-900 sm:inline dark:text-slate-300 dark:hover:text-slate-50"
            >
              Docs
            </a>
            <a
              href="/support"
              className="hidden text-slate-600 hover:text-slate-900 sm:inline dark:text-slate-300 dark:hover:text-slate-50"
            >
              Support
            </a>
            <a
              href="/sign-in"
              className="rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-900"
            >
              Sign in
            </a>
            <a
              href="/sign-up"
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-100"
            >
              Create free workspace
            </a>
          </nav>
        </header>

        {/* BODY CONTENT */}
        <div className="flex flex-1 flex-col gap-16 pb-12 lg:pb-16">
          {/* HERO (with Describe demo) */}
          <section className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
            {/* Left side: copy + CTAs */}
            <div className="space-y-8">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                  New
                </span>
                <span>AvidiaTech · Product data automation for serious catalogs</span>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                  Turn messy manufacturer URLs into
                  <span className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
                    {" "}
                    revenue-ready product pages.
                  </span>
                </h1>
                <p className="max-w-xl text-base sm:text-lg text-slate-600 dark:text-slate-200">
                  AvidiaTech ingests, enriches, and monitors your entire catalog—so you
                  can launch new products, regions, and channels without rewriting the
                  same description three times.
                </p>
              </div>

              {/* Primary CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <a
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-6 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-110"
                >
                  Get Started – free trial
                </a>

                <a
                  href="/sign-in?redirect_url=/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm sm:text-base font-semibold text-slate-800 backdrop-blur transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Open Dashboard
                </a>

                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  No credit card required to explore modules. Upgrade only when you’re
                  ready to ship.
                </p>
              </div>

              {/* Social proof / quick stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                {stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {stat.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {stat.hint}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side: hybrid “Try AvidiaDescribe” + workspace signals */}
            <div className="relative">
              <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-cyan-200/40 via-emerald-200/30 to-amber-200/40 blur-3xl dark:from-cyan-500/20 dark:via-fuchsia-500/10 dark:to-amber-400/10" />
              <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
                {/* Top bar */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Workspace preview</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                    Guardrails active
                  </span>
                </div>

                {/* Flow strip */}
                <div className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Pipeline snapshot
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-medium text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100">
                      AvidiaExtract · URL ingests
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-full bg-fuchsia-50 px-3 py-1 text-[11px] font-medium text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-100">
                      AvidiaDescribe · AI copy
                    </span>
                    <span className="text-slate-400">→</span>
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-800 dark:bg-amber-500/20 dark:text-amber-100">
                      AvidiaSEO · pages & feeds
                    </span>
                  </div>
                </div>

                {/* Two-column inner content */}
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {/* Left: no-auth AvidiaDescribe sample */}
                  <div className="space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/70">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Try AvidiaDescribe (sample)
                    </p>
                    <div className="space-y-2">
                      <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Manufacturer URL
                      </label>
                      <input
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                        value={demoUrl}
                        onChange={(e) => setDemoUrl(e.target.value)}
                        placeholder="https://vendor.com/products/your-sku"
                      />
                      <button
                        onClick={handleDemoRun}
                        disabled={demoStatus === "running"}
                        className="mt-1 w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {demoStatus === "running"
                          ? "Generating sample…"
                          : "Generate sample description"}
                      </button>
                      {demoError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-300">
                          {demoError}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Sample runs remaining</span>
                        <span className="font-medium">
                          {demoRunsLeft} / 1
                        </span>
                      </div>
                      <p>
                        This is a preview only. In your workspace, AvidiaDescribe
                        uses your ingest + custom GPT instructions to produce full
                        HTML + SEO JSON.
                      </p>
                    </div>
                  </div>

                  {/* Right: sample output / workspace signals */}
                  <div className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      Sample output
                    </p>
                    <div className="h-32 overflow-hidden rounded-lg border border-slate-200 bg-white p-3 text-[11px] leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <pre className="whitespace-pre-wrap text-[11px]">
                        {demoOutput ??
                          `Paste a manufacturer URL on the left and click “Generate sample description”. 
                          
We’ll simulate what AvidiaDescribe would return using your ingestion rules. In the real workspace, this becomes structured HTML + SEO JSON you can sync to your store or feeds.`}
                      </pre>
                    </div>
                    <div className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>Ingest</span>
                        <span className="text-emerald-600 dark:text-emerald-300">
                          ✓ Wired to your engine
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>AI description</span>
                        <span className="text-emerald-600 dark:text-emerald-300">
                          ✓ Custom GPT instructions
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>SEO checks</span>
                        <span className="text-amber-600 dark:text-amber-300">
                          • Enforced in workspace
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  Like what you see? Create a free workspace to unlock full modules,
                  saved ingestions, and exports.
                </p>
              </div>
            </div>
          </section>

          {/* MODULES – show capabilities early */}
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  Start with one module or run the full stack.
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  Every module is useful on its own. Together, they replace half a
                  dozen brittle scripts and spreadsheets.
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Coming soon: Monitor, Variants, Translate, Studio, and more—already
                wired for tenants and billing.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {modules.map((mod) => (
                <div
                  key={mod.name}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        {mod.name}
                      </p>
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        {mod.badge}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-200">
                      {mod.copy}
                    </p>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Focus: {mod.tag}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* PILLARS + WHO IT'S FOR */}
          <section className="grid gap-8">
            {/* Pillars */}
            <div className="grid gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950">
              {pillars.map((item) => (
                <div key={item.title} className="space-y-3">
                  <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                    {item.title}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-200">
                    {item.copy}
                  </p>
                </div>
              ))}
            </div>

            {/* Who it's for */}
            <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">
                  Built for people living inside catalogs.
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-200">
                  AvidiaTech exists for teams who own product data—from first ingest to
                  SEO page and every downstream feed.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {audiences.map((aud) => (
                  <div
                    key={aud.title}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {aud.title}
                    </p>
                    <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-200">
                      {aud.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* HOW IT WORKS + CAPABILITIES */}
          <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                How AvidiaTech fits into your stack.
              </h2>
              <div className="space-y-4">
                {howItWorks.map((item) => (
                  <div
                    key={item.step}
                    className="space-y-1 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900"
                  >
                    <p className="text-sm font-semibold text-cyan-700 dark:text-cyan-200">
                      {item.step}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-200">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
                Why teams standardize on AvidiaTech.
              </h3>
              <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                {capabilities.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>

          {/* FINAL CTA STRIP */}
          <section className="rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-50 via-emerald-50 to-amber-50 p-8 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                  Ready to see your catalog in AvidiaTech?
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200">
                  Start with a single manufacturer URL. If you like the output, bring
                  the rest of your products.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="/sign-up"
                  className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                >
                  Get Started
                </a>
                <a
                  href="/sign-in?redirect_url=/dashboard"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-900"
                >
                  Open Dashboard
                </a>
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-auto border-t border-slate-200 pt-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} AvidiaTech. All rights reserved.</span>
            <div className="flex flex-wrap items-center gap-3">
              <a href="/status" className="hover:text-slate-800 dark:hover:text-slate-200">
                Status
              </a>
              <a href="/privacy" className="hover:text-slate-800 dark:hover:text-slate-200">
                Privacy
              </a>
              <a href="/terms" className="hover:text-slate-800 dark:hover:text-slate-200">
                Terms
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
