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
    copy: "Generate compliant, on-brand descriptions from your structured product data or short internal notes.",
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

  // Lightweight, no-auth pipeline sample (URL → Describe-style snippet)
  const [demoUrl, setDemoUrl] = useState(
    "https://vendor.com/products/infusion-pump-9000"
  );
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<"idle" | "running" | "done">(
    "idle"
  );
  const [demoRunsLeft, setDemoRunsLeft] = useState(1);
  const [demoError, setDemoError] = useState<string | null>(null);

  const [showStickyCta, setShowStickyCta] = useState(false);

  const handleDemoRun = () => {
    if (!demoUrl.trim()) {
      setDemoError("Add a manufacturer URL to preview a sample pipeline output.");
      return;
    }

    if (demoRunsLeft <= 0) {
      setDemoError(
        "Sample limit reached. Create a free workspace to run full SEO flows on your own products."
      );
      return;
    }

    setDemoError(null);
    setDemoStatus("running");

    // Mock async behavior – later you can swap this for a real public API call.
    setTimeout(() => {
      setDemoOutput(
        `Sample description (Describe step) for product at ${demoUrl}.\n\nThis simulates what AvidiaTech would produce after Extract + Describe: a compliant, search-aware paragraph tailored to your catalog rules. In your workspace, this becomes structured HTML + SEO JSON AvidiaSEO uses to build the full product page.`
      );
      setDemoStatus("done");
      setDemoRunsLeft((prev) => prev - 1);
    }, 700);
  };

  // Sticky CTA after scroll
  useEffect(() => {
    const onScroll = () => {
      if (typeof window === "undefined") return;
      setShowStickyCta(window.scrollY > 220);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", onScroll);
      onScroll();
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", onScroll);
      }
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      {/* Sticky CTA bar (full width) */}
      {showStickyCta && (
        <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-200 bg-slate-50/85 px-4 py-2 text-xs backdrop-blur sm:px-6 lg:px-10 dark:border-slate-800 dark:bg-slate-950/85">
          <div className="flex w-full items-center justify-between gap-3">
            <span className="hidden text-[11px] text-slate-600 sm:inline dark:text-slate-300">
              Ready to see AvidiaTech on your own catalog?
            </span>
            <span className="inline text-[11px] text-slate-600 sm:hidden dark:text-slate-300">
              Try AvidiaTech on your catalog.
            </span>
            <div className="flex items-center gap-2">
              <a
                href="#hero-url"
                className="hidden text-[11px] text-cyan-700 underline-offset-2 hover:underline dark:text-cyan-300 sm:inline"
              >
                Paste a vendor URL
              </a>
              <a
                href="/sign-up"
                className="inline-flex items-center justify-center rounded-full bg-cyan-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 hover:bg-cyan-400 whitespace-nowrap"
              >
                Create free workspace
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col">
        {/* HEADER – full width */}
        <header className="flex w-full items-center justify-between px-4 py-5 sm:px-6 lg:px-10">
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
        <div className="flex-1 space-y-16 pb-14 lg:space-y-20 lg:pb-20">
          {/* HERO – full-width band */}
          <section className="border-y border-slate-200/60 bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100 py-8 dark:border-slate-800/60 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
            <div className="grid w-full items-stretch gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:gap-12 lg:px-10">
              {/* Left side */}
              <div className="space-y-7">
                <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-200">
                    New
                  </span>
                  <span>AvidiaTech · Product data automation for serious catalogs</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-4xl font-semibold leading-snug sm:text-5xl lg:text-[2.9rem]">
                    Turn messy manufacturer URLs into
                    <span className="bg-gradient-to-r from-cyan-500 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
                      {" "}
                      revenue-ready product pages.
                    </span>
                  </h1>
                  <p className="max-w-xl text-base sm:text-lg text-slate-600 dark:text-slate-200">
                    AvidiaTech ingests, enriches, and monitors your entire catalog—so
                    you can launch new products, regions, and channels without
                    rewriting the same description three times.
                  </p>
                </div>

                {/* URL input */}
                <div className="space-y-2" id="hero-url">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Step 1 · Paste a manufacturer URL to see a sample pipeline output
                  </p>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-950">
                      <input
                        className="w-full border-none bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                        value={demoUrl}
                        onChange={(e) => setDemoUrl(e.target.value)}
                        placeholder="https://vendor.com/products/your-sku"
                      />
                    </div>
                    <button
                      onClick={handleDemoRun}
                      disabled={demoStatus === "running"}
                      className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-70 whitespace-nowrap"
                    >
                      {demoStatus === "running"
                        ? "Generating sample…"
                        : "Try pipeline sample"}
                    </button>
                  </div>
                  {demoError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-300">
                      {demoError}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    We’ll simulate Extract → Describe on this URL. In your workspace,
                    AvidiaDescribe can also start from short internal notes instead of
                    a URL. Sample runs remaining:{" "}
                    <span className="font-semibold">{demoRunsLeft} / 1</span>.
                  </p>
                </div>

                {/* Primary CTAs */}
                <div className="flex flex-wrap items-center gap-4">
                  <a
                    href="/sign-up"
                    className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-300 px-6 py-3 text-sm sm:text-base font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:brightness-110 whitespace-nowrap"
                  >
                    Get Started – free trial
                  </a>

                  <a
                    href="/sign-in?redirect_url=/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-6 py-3 text-sm sm:text-base font-semibold text-slate-800 backdrop-blur transition hover:border-slate-400 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-900 whitespace-nowrap"
                  >
                    Open Dashboard
                  </a>

                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    No credit card required to explore modules. Upgrade only when
                    you’re ready to ship.
                  </p>
                </div>

                {/* Stats */}
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

                {/* Outcomes strip */}
                <div className="mt-2 grid gap-3 text-xs sm:grid-cols-3 sm:text-sm">
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3 text-slate-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-50">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-200">
                      Outcomes
                    </p>
                    <p className="mt-1">
                      Cut time-to-listing from days to hours for new vendor catalogs.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      Catalog control
                    </p>
                    <p className="mt-1">
                      Keep naming, SEO and warnings consistent across thousands of SKUs.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 text-slate-800 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      For serious teams
                    </p>
                    <p className="mt-1">
                      Best when you manage large catalogs or multiple channels—not a fit
                      for 5-SKU side projects.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side – pipeline preview */}
              <div className="relative flex h-full" id="pipeline-preview">
                <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-cyan-200/40 via-emerald-200/30 to-amber-200/40 blur-2xl dark:from-cyan-500/20 dark:via-fuchsia-500/10 dark:to-amber-400/10" />
                <div className="relative z-10 flex h-full flex-col rounded-[2rem] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-900/40">
                  {/* Top bar */}
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span>Pipeline sample · URL → Describe</span>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                      Guardrails active
                    </span>
                  </div>

                  {/* Content */}
                  <div className="mt-4 flex flex-1 flex-col gap-4">
                    {/* Flow strip */}
                    <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
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
                          AvidiaSEO · pages &amp; feeds
                        </span>
                      </div>
                    </div>

                    {/* Output */}
                    <div className="flex flex-1 flex-col rounded-xl bg-slate-50 p-4 text-xs text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        Step 2 · Sample description (Describe step)
                      </p>
                      <div className="mt-2 flex-1 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
                        <pre className="h-full max-h-60 overflow-auto whitespace-pre-wrap p-3 text-[11px] leading-relaxed">
                          {demoOutput ??
                            `Paste a manufacturer URL on the left and click “Try pipeline sample”. 
                        
We’ll simulate the Describe step in your pipeline: a compliant, search-aware paragraph built from your ingestion rules. In the real workspace, this feeds AvidiaSEO, which builds the full product page and SEO JSON.`}
                        </pre>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="mt-auto space-y-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="space-y-1">
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
                      <p>
                        Like what you see? Create a free workspace to unlock full
                        modules, saved ingestions, and end-to-end SEO flows.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* MODULES – full width, slightly pulled up */}
          <section className="w-full -mt-4 space-y-6 px-4 pt-4 sm:px-6 lg:px-10">
            <div className="space-y-3 sm:flex sm:items-end sm:justify-between sm:gap-4 sm:space-y-0">
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
                  className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-950"
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

          {/* Describe + SEO – full width */}
          <section className="grid w-full gap-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm px-4 sm:px-6 lg:grid-cols-[1.05fr,0.95fr] lg:px-10 dark:border-slate-800 dark:bg-slate-950">
            {/* Left */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                AvidiaDescribe: from messy notes to clean, compliant copy.
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-200">
                In the workspace, AvidiaDescribe doesn&apos;t need a perfect source.
                Start from your ingest JSON, a short internal paragraph, or rough
                stakeholder notes—Describe turns it into structured, SEO-aware copy
                that respects your catalog rules.
              </p>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-200">
                <li>• Works with either manufacturer ingest or your own short notes.</li>
                <li>• Applies your custom GPT instructions and compliance guardrails.</li>
                <li>• Returns HTML + fields for titles, bullets, warnings, and manuals blocks.</li>
                <li>• Feeds directly into AvidiaSEO for full-page and feed generation.</li>
              </ul>

              {/* Notes example */}
              <div className="grid gap-4 rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 md:grid-cols-2 dark:bg-slate-900 dark:text-slate-200">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Example notes input
                  </p>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[11px] leading-relaxed">
                      &quot;Need SEO copy for ACME Infusion Pump 9000. 4-channel,
                      dose-error reduction, touchscreen, hospital-grade. Focus on
                      safety, standardizing IV workflows, and smart alarms. Avoid
                      clinical claims we can&apos;t back.&quot;
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Describe output snippet
                  </p>
                  <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
                    <p className="text-[11px] leading-relaxed">
                      The ACME Infusion Pump 9000 is a four-channel, hospital-grade IV
                      pump designed to help standardize medication workflows. A color
                      touch-screen interface, dose-error reduction software, and
                      configurable smart alarms support consistent setup across
                      bedsides while reducing manual double-entry.
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                You control the rules. AvidiaDescribe enforces them every time, so new
                products land on-brand instead of copy-pasted from vendors.
              </p>
            </div>

            {/* Right */}
            <div className="space-y-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">From Describe to full SEO output</span>
                <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  Example
                </span>
              </div>

              {/* Page preview, shorter w/ scroll */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Page preview
                </p>
                <div className="max-h-32 space-y-2 overflow-auto pr-1">
                  <h3 className="text-sm font-semibold">
                    ACME Infusion Pump 9000 – 4-Channel, Smart Alarms, IV Workflow Ready
                  </h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300">
                    The ACME Infusion Pump 9000 is a four-channel, smart IV pump
                    designed for high-acuity environments. Pre-configured drug
                    libraries, a color touch-screen, and dose-error reduction features
                    help standardize IV workflows while reducing manual entry.
                  </p>
                  <ul className="mt-1 list-disc space-y-1 pl-4">
                    <li>4 independent channels with shared drug library</li>
                    <li>Color touch-screen with guided setup</li>
                    <li>Dose-error reduction support for standardized workflows</li>
                  </ul>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Manuals, warranty details, and compliance language are included
                    below the fold and in the JSON payload.
                  </p>
                </div>
              </div>

              {/* JSON snippet */}
              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-900 p-4 text-[11px] text-slate-100 dark:border-slate-700">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  SEO JSON (excerpt)
                </p>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap text-[11px]">
{`{
  "name": "ACME Infusion Pump 9000 – 4-Channel, Smart Alarms, IV Workflow Ready",
  "h1": "ACME Infusion Pump 9000",
  "meta_title": "ACME Infusion Pump 9000 | Smart 4-Channel IV Pump",
  "meta_description": "Four-channel smart infusion pump with dose-error reduction and guided IV workflows for hospital environments.",
  "sections": {
    "overview_html": "<p>The ACME Infusion Pump 9000 is ...</p>",
    "manuals_html": "<ul>...</ul>"
  }
}`}
                </pre>
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                AvidiaSEO runs this inside the dashboard so you can queue URLs, review
                changes, and sync only when you&apos;re ready to publish.
              </p>
            </div>
          </section>

          {/* PILLARS + WHO IT'S FOR – full width */}
          <section className="w-full space-y-8 px-4 sm:px-6 lg:px-10">
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Not a good fit if you only manage a handful of SKUs or don&apos;t care
                  about structured SEO quality.
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

          {/* HOW IT WORKS + CAPABILITIES – full width */}
          <section className="grid w-full gap-8 px-4 sm:px-6 lg:grid-cols-[1.1fr,0.9fr] lg:px-10">
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
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Your catalog and rules stay in your workspace. We don&apos;t train a
                public model on your product data.
              </p>
            </div>
          </section>

          {/* Micro FAQ – full width */}
          <section className="w-full space-y-4 px-4 sm:px-6 lg:px-10">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
              Common questions before teams try AvidiaTech
            </h3>
            <div className="grid gap-4 text-xs sm:grid-cols-3 sm:text-sm">
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Do I need a developer to start?
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  No. You can begin with vendor URLs and internal notes. Developers
                  help when you&apos;re ready to wire exports and feeds.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Will it change my store automatically?
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Not until you connect exports or apps. You stay in control of what
                  gets synced and when.
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  Is there a free way to try it?
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  Yes. Paste a URL above, then create a free workspace to explore
                  modules on a small slice of your catalog.
                </p>
              </div>
            </div>
          </section>

          {/* FINAL CTA – now a centered card, not edge-to-edge full width */}
          <section className="w-full px-4 sm:px-6 lg:px-10">
            <div className="mx-auto max-w-6xl rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-cyan-50 via-emerald-50 to-amber-50 p-8 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">
                    Ready to see your catalog in AvidiaTech?
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    Paste one manufacturer URL above, then create a workspace if the
                    output looks like something you&apos;d ship to customers.
                  </p>
                </div>
                <div className="flex flex-nowrap items-center gap-3">
                  <a
                    href="/sign-up"
                    className="inline-flex items-center justify-center rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 whitespace-nowrap"
                  >
                    Get Started
                  </a>
                  <a
                    href="/sign-in?redirect_url=/dashboard"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-900 whitespace-nowrap"
                  >
                    Open Dashboard
                  </a>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* FOOTER – full width */}
        <footer className="mt-auto border-t border-slate-200 py-4 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div className="flex w-full flex-col gap-2 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
            <span>© {new Date().getFullYear()} AvidiaTech. All rights reserved.</span>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/status"
                className="hover:text-slate-800 dark:hover:text-slate-200"
              >
                Status
              </a>
              <a
                href="/privacy"
                className="hover:text-slate-800 dark:hover:text-slate-200"
              >
                Privacy
              </a>
              <a
                href="/terms"
                className="hover:text-slate-800 dark:hover:text-slate-200"
              >
                Terms
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
