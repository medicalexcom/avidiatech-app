"use client";

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
  // Render plain links so the CTAs are always visible regardless of Clerk initialization.
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-16 px-6 py-16 lg:py-20">
        {/* HERO */}
        <section className="grid items-center gap-12 lg:grid-cols-[1.1fr,0.9fr]">
          {/* Left side: copy + CTAs */}
          <div className="space-y-8">
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs font-medium text-blue-100 ring-1 ring-white/10">
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
                New
              </span>
              <span>AvidiaTech · Product data automation for serious catalogs</span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Turn messy manufacturer URLs into
                <span className="bg-gradient-to-r from-cyan-300 via-emerald-300 to-amber-200 bg-clip-text text-transparent">
                  {" "}
                  revenue-ready product pages.
                </span>
              </h1>
              <p className="max-w-xl text-base sm:text-lg text-slate-200">
                AvidiaTech ingests, enriches, and monitors your entire catalog—so you can launch new products, regions, and
                channels without rewriting the same description three times.
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
                className="inline-flex items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm sm:text-base font-semibold text-white/90 backdrop-blur transition hover:border-white/40 hover:bg-white/5"
              >
                Open Dashboard
              </a>

              <p className="text-xs sm:text-sm text-slate-400">
                No credit card required to explore modules. Upgrade only when you’re ready to ship.
              </p>
            </div>

            {/* Social proof / quick stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{stat.label}</p>
                  <p className="mt-1 text-xl font-semibold text-slate-50">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-300">{stat.hint}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right side: “fake” dashboard preview */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-cyan-500/20 via-fuchsia-500/10 to-amber-400/10 blur-3xl" />
            <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-sky-900/40 backdrop-blur">
              {/* Top bar */}
              <div className="flex items-center justify-between text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>Live workspace · tenant: medx</span>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-200">
                  Guardrails active
                </span>
              </div>

              {/* Flow strip */}
              <div className="mt-4 grid gap-3 rounded-xl bg-slate-900/80 p-4 text-xs text-slate-200">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pipeline snapshot</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-[11px] font-medium text-cyan-100">
                    AvidiaExtract · URL ingests
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="rounded-full bg-fuchsia-500/20 px-3 py-1 text-[11px] font-medium text-fuchsia-100">
                    AvidiaDescribe · AI copy
                  </span>
                  <span className="text-slate-500">→</span>
                  <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-medium text-amber-100">
                    AvidiaSEO · pages & feeds
                  </span>
                </div>
              </div>

              {/* Two-column inner content */}
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {/* Left: URL input + live run */}
                <div className="space-y-3 rounded-xl bg-slate-900/70 p-4">
                  <p className="text-xs font-medium text-slate-300">New ingestion</p>
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      Manufacturer URL
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
                      <span className="truncate text-slate-300">
                        https://vendor.com/products/infusion-pump-9000
                      </span>
                      <span className="rounded-md bg-cyan-500/20 px-2 py-1 text-[11px] text-cyan-100">
                        Ready
                      </span>
                    </div>
                    <button className="mt-1 w-full rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400">
                      Generate SEO page
                    </button>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Ingest</span>
                      <span className="text-emerald-300">✓ Completed</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>AI description</span>
                      <span className="text-emerald-300">✓ Completed</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SEO checks</span>
                      <span className="text-amber-200">• 2 suggestions</span>
                    </div>
                  </div>
                </div>

                {/* Right: quotas + billing awareness */}
                <div className="space-y-3 rounded-xl bg-slate-900/70 p-4">
                  <p className="text-xs font-medium text-slate-300">Usage & access</p>
                  <div className="space-y-3 text-xs text-slate-200">
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">This month</p>
                        <p>642 / 1,000 ingests</p>
                      </div>
                      <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] text-emerald-200">
                        Growth plan
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                      <p>Owner override</p>
                      <span className="text-[11px] text-emerald-300">Unlimited actions</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-slate-950/80 px-3 py-2">
                      <p>Stripe subscription</p>
                      <span className="text-[11px] text-amber-200">Renewal in 12 days</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    All of this wiring ships with the starter template—so your team focuses on flows, not scaffolding.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* PILLARS */}
        <section className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-inner sm:grid-cols-3">
          {pillars.map((item) => (
            <div key={item.title} className="space-y-3">
              <p className="text-sm font-semibold text-cyan-200">{item.title}</p>
              <p className="text-sm text-slate-100">{item.copy}</p>
            </div>
          ))}
        </section>

        {/* WHO IT'S FOR */}
        <section className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-white">Built for people living inside catalogs.</h2>
            <p className="text-sm sm:text-base text-slate-200">
              AvidiaTech exists for teams who own product data—from first ingest to SEO page and every downstream feed.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {audiences.map((aud) => (
              <div
                key={aud.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{aud.title}</p>
                <p className="mt-2 text-xs sm:text-sm text-slate-200">{aud.copy}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MODULES */}
        <section className="space-y-6 rounded-3xl border border-white/10 bg-slate-950/60 p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Start with one module or run the full stack.</h2>
              <p className="mt-1 text-sm text-slate-200">
                Every module is useful on its own. Together, they replace half a dozen brittle scripts and spreadsheets.
              </p>
            </div>
            <p className="text-xs text-slate-400">
              Coming soon: Monitor, Variants, Translate, Studio, and more—already wired for tenants and billing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {modules.map((mod) => (
              <div
                key={mod.name}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-50">{mod.name}</p>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-200">
                      {mod.badge}
                    </span>
                  </div>
                  <p className="text-sm text-slate-200">{mod.copy}</p>
                </div>
                <div className="mt-3 text-xs text-slate-400">Focus: {mod.tag}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS + CAPABILITIES */}
        <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-8">
            <h2 className="text-xl font-semibold text-white">How AvidiaTech fits into your stack.</h2>
            <div className="space-y-4">
              {howItWorks.map((item) => (
                <div key={item.step} className="space-y-1 rounded-2xl bg-slate-950/60 p-4">
                  <p className="text-sm font-semibold text-cyan-200">{item.step}</p>
                  <p className="text-sm text-slate-200">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-8">
            <h3 className="text-lg font-semibold text-white">Why teams standardize on AvidiaTech.</h3>
            <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-200">
              {capabilities.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 ring-1 ring-white/15"
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA STRIP */}
        <section className="rounded-3xl border border-cyan-500/40 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-cyan-200">Ready to see your catalog in AvidiaTech?</p>
              <p className="text-sm text-slate-200">
                Start with a single manufacturer URL. If you like the output, bring the rest of your products.
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
                className="inline-flex items-center justify-center rounded-xl border border-white/30 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/5"
              >
                Open Dashboard
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
