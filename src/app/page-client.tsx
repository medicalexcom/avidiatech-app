"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

// ─── Static data ──────────────────────────────────────────────────────────────

const modules = [
  {
    name: "AvidiaExtract",
    badge: "Ingestion",
    copy: "Turn any manufacturer URL into clean, normalized JSON — specs, manuals, images, variants.",
    color: { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300", bar: "bg-amber-400" },
  },
  {
    name: "AvidiaDescribe",
    badge: "AI copy",
    copy: "Generate brand-compliant, SEO-aware product descriptions from structured data or rough notes.",
    color: { dot: "bg-violet-400", badge: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300", bar: "bg-violet-400" },
  },
  {
    name: "AvidiaSEO",
    badge: "Full SEO",
    copy: "Titles, meta, H1s, and internal links auto-built from your ingested data. No copy-paste.",
    color: { dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300", bar: "bg-emerald-400" },
  },
  {
    name: "AvidiaMatch",
    badge: "Intelligence",
    copy: "Match, dedupe, and cluster SKUs across vendors and channels — no spreadsheets required.",
    color: { dot: "bg-cyan-400", badge: "bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300", bar: "bg-cyan-400" },
  },
];

const steps = [
  {
    n: "01",
    title: "Drop a manufacturer URL",
    body: "AvidiaExtract scrapes and normalizes specs, documents, variants, and media into a single reusable product payload.",
  },
  {
    n: "02",
    title: "AI does the heavy lifting",
    body: "AvidiaDescribe and AvidiaSEO apply your custom brand rules to generate descriptions, titles, and full metadata.",
  },
  {
    n: "03",
    title: "Sync everywhere you sell",
    body: "Push enriched output to your store, PIM, or feeds. Monitor vendor changes and rerun flows automatically.",
  },
];

const stats = [
  { value: "1M+",       label: "SKUs processed",    sub: "Built for large catalogs" },
  { value: "15+",       label: "Modules",             sub: "Extract, Describe, SEO & more" },
  { value: "10–20 hrs", label: "Saved per week",      sub: "Per ops or content lead" },
];

const audiences = [
  {
    title: "Store & brand owners",
    body:  "Ship SEO-ready product pages without living in Google Sheets. Brand rules stay intact as your catalog scales.",
    icon: "🛍️",
  },
  {
    title: "Ops & content teams",
    body:  "Swap fire-drills for flows. Let AvidiaTech handle variants, specs, and approvals while you spot-check edge cases.",
    icon: "⚙️",
  },
  {
    title: "Developers & data teams",
    body:  "REST APIs, webhooks, and a clean schema — instead of brittle scraping scripts and ad-hoc cron jobs.",
    icon: "🔌",
  },
];

// ─── Mini icons ───────────────────────────────────────────────────────────────
function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function CheckCircle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" />
      <path d="M5 8.5l2 2L11 6" />
    </svg>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && isSignedIn) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, router]);

  // Interactive demo
  const [demoUrl, setDemoUrl]       = useState("https://vendor.com/products/infusion-pump-9000");
  const [demoOutput, setDemoOutput] = useState<string | null>(null);
  const [demoStatus, setDemoStatus] = useState<"idle" | "running" | "done">("idle");
  const [demoRunsLeft, setDemoRunsLeft] = useState(1);
  const [demoError, setDemoError]   = useState<string | null>(null);

  function runDemo() {
    if (!demoUrl.trim()) { setDemoError("Paste a manufacturer URL to preview the pipeline."); return; }
    if (demoRunsLeft <= 0) { setDemoError("Sample limit reached. Create a free workspace to run unlimited flows."); return; }
    setDemoError(null);
    setDemoStatus("running");
    setTimeout(() => {
      setDemoOutput(
        `The Infusion Pump 9000 is a hospital-grade, microprocessor-controlled volumetric infusion device engineered for precision fluid delivery in critical-care environments.\n\nKey specifications: Flow rate 1–999 mL/hr (0.1 mL resolution), ±2% accuracy, 7-inch WVGA touchscreen, 15-drug library pre-loaded, anti-free-flow safety mechanism, KVO 0.1–5 mL/hr, dual alarm system (audible + visual), IP23 ingress protection.\n\nThis panel reflects what AvidiaTech's Describe step would produce after Extract normalizes the product page — a compliant, search-aware paragraph built from your ingestion rules and brand instructions.`
      );
      setDemoStatus("done");
      setDemoRunsLeft(0);
    }, 800);
  }

  // Sticky nav
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased dark:bg-[#09090b] dark:text-slate-50">

      {/* ── Ambient top glow ────────────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-64 right-[-10%] h-[700px] w-[700px] rounded-full bg-indigo-400/10 blur-[140px] dark:bg-indigo-500/8" />
        <div className="absolute left-[-10%] top-[30%] h-[500px] w-[500px] rounded-full bg-violet-400/8 blur-[120px] dark:bg-violet-500/6" />
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-200 ${scrolled ? "border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#09090b]/90" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/30">
              <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">AvidiaTech</span>
          </Link>

          {/* Center links */}
          <nav className="hidden items-center gap-6 md:flex">
            {[
              { label: "Features", href: "#modules" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Pricing", href: "/dashboard/pricing" },
              { label: "Docs", href: "/docs" },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-[14px] text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-2.5">
            <Link href="/sign-in" className="hidden text-[14px] font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-[13.5px] font-semibold text-white shadow-sm shadow-indigo-600/30 transition hover:bg-indigo-700 hover:-translate-y-px active:translate-y-0"
            >
              Start free trial
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-0 pt-20 sm:px-6 lg:px-10 lg:pt-28">
        <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-10">

          {/* Left: copy */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <span className="flex h-[7px] w-[7px] rounded-full bg-emerald-500">
                <span className="absolute inline-flex h-[7px] w-[7px] animate-ping rounded-full bg-emerald-400 opacity-60" />
              </span>
              <span className="text-[11.5px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Product data automation
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h1 className="text-[2.6rem] font-bold leading-[1.1] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.1rem]">
                Turn manufacturer URLs{" "}
                <span className="bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 bg-clip-text text-transparent">
                  into revenue‑ready product pages.
                </span>
              </h1>
              <p className="max-w-lg text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
                AvidiaTech ingests, enriches, and monitors your entire product catalog — so you can launch new products, regions, and channels without rewriting the same description twice.
              </p>
            </div>

            {/* CTA group */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/sign-up"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-6 text-[15px] font-semibold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0"
              >
                Start free — 14-day trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/sign-in?redirect_url=/dashboard"
                className="inline-flex h-11 items-center rounded-xl border border-slate-200 bg-white px-6 text-[15px] font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Open dashboard
              </Link>
            </div>

            {/* Trust pills */}
            <div className="flex flex-wrap items-center gap-4 text-[13px] text-slate-500 dark:text-slate-400">
              {["No credit card required", "Cancel any time", "GDPR-compliant"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {t}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-[1.6rem] font-bold tracking-tight text-slate-900 dark:text-white">{s.value}</p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: interactive demo */}
          <div className="relative" id="hero-demo">
            {/* Glow behind card */}
            <div className="pointer-events-none absolute -inset-6 -z-10 rounded-3xl bg-gradient-to-tr from-indigo-200/40 via-violet-200/30 to-sky-200/40 blur-3xl dark:from-indigo-500/15 dark:via-violet-500/10 dark:to-sky-500/10" />

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/8 dark:border-slate-800 dark:bg-slate-900">
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-red-400/60" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/60" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/60" />
                  </div>
                  <span className="text-[11px] font-medium text-slate-400">Pipeline preview · Extract → Describe</span>
                </div>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live
                </span>
              </div>

              <div className="space-y-4 p-5">
                {/* Pipeline chips */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "1. Extract · URL ingestion", bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
                    { label: "→", bg: "text-slate-400" },
                    { label: "2. Describe · AI copy", bg: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
                    { label: "→", bg: "text-slate-400" },
                    { label: "3. SEO · pages & feeds", bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
                  ].map((c, i) => (
                    c.bg.startsWith("text-slate") ? (
                      <span key={i} className="self-center text-slate-400 text-[12px]">→</span>
                    ) : (
                      <span key={i} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${c.bg}`}>{c.label}</span>
                    )
                  ))}
                </div>

                {/* URL input */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Step 1 · Paste a manufacturer URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={demoUrl}
                      onChange={(e) => { setDemoUrl(e.target.value); setDemoError(null); }}
                      onKeyDown={(e) => e.key === "Enter" && demoStatus !== "running" && runDemo()}
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[12.5px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:placeholder:text-slate-500"
                      placeholder="https://vendor.com/products/your-sku"
                    />
                    <button
                      onClick={runDemo}
                      disabled={demoStatus === "running" || demoRunsLeft <= 0}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {demoStatus === "running" ? "Running…" : "Run sample"}
                    </button>
                  </div>
                  {demoError && <p className="mt-1.5 text-[11.5px] text-red-600 dark:text-red-400">{demoError}</p>}
                </div>

                {/* Output panel */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Step 2 · AI-generated product description
                  </label>
                  <div className="min-h-[120px] rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                    {demoStatus === "running" ? (
                      <div className="space-y-2.5 pt-1">
                        {[1, 2, 3].map((i) => <div key={i} className="skeleton h-3.5 rounded-md" style={{ width: i === 3 ? "60%" : "100%" }} />)}
                      </div>
                    ) : demoOutput ? (
                      <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">{demoOutput}</p>
                    ) : (
                      <p className="text-[12.5px] leading-relaxed text-slate-400 dark:text-slate-500">
                        Paste a manufacturer URL above and click <strong className="text-slate-600 dark:text-slate-300">Run sample</strong> to see what AvidiaTech would produce after the Extract → Describe pipeline step.
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer note */}
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  {demoRunsLeft > 0 ? `${demoRunsLeft} free sample remaining · ` : "Sample used · "}
                  <Link href="/sign-up" className="text-indigo-600 hover:underline dark:text-indigo-400">
                    Create a workspace
                  </Link>{" "}to run unlimited flows on your catalog.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ─────────────────────────────────────────────────────── */}
      <section id="modules" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mb-10 max-w-xl">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Core modules</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            One module is useful.<br />The full stack is transformative.
          </h2>
          <p className="mt-3 text-[16px] leading-relaxed text-slate-600 dark:text-slate-400">
            Each module is production-ready on its own. Together they replace brittle scripts, spreadsheets, and half a dozen one-off tools.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {modules.map((mod) => (
            <div
              key={mod.name}
              className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${mod.color.badge}`}>
                  <span className={`h-[5px] w-[5px] rounded-full ${mod.color.dot}`} />
                  {mod.badge}
                </span>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-slate-400 transition group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-800 dark:group-hover:bg-indigo-500/15 dark:group-hover:text-indigo-400">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">{mod.name}</h3>
              <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{mod.copy}</p>
              {/* Color accent bar */}
              <div className={`mt-5 h-0.5 w-10 rounded-full ${mod.color.bar} transition-all duration-300 group-hover:w-16`} />
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 text-[14px] font-medium text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            See all 15+ modules in the dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="border-y border-slate-100 bg-slate-50/50 dark:border-slate-800/60 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="mb-12 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">How it works</p>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
              From raw URL to published page in minutes.
            </h2>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <div key={i} className="relative">
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-6 hidden w-1/2 border-t border-dashed border-slate-200 dark:border-slate-700 md:block" />
                )}
                <div className="relative z-10 flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className="text-[2.5rem] font-black tracking-tighter text-indigo-100 dark:text-indigo-500/20 leading-none select-none">{step.n}</span>
                  <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Audience ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 lg:py-28">
        <div className="mb-12 text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-400">Built for</p>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Teams that take their catalog seriously.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-[16px] text-slate-600 dark:text-slate-400">
            AvidiaTech is opinionated. It's built for teams managing hundreds or thousands of SKUs — not side projects.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {audiences.map((a) => (
            <div
              key={a.title}
              className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="text-3xl" role="img" aria-hidden="true">{a.icon}</span>
              <h3 className="mt-4 text-[16px] font-semibold text-slate-900 dark:text-white">{a.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{a.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-8 py-16 text-center shadow-2xl shadow-indigo-600/30 sm:px-16 sm:py-20">
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/8 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-violet-800/40 blur-2xl" />
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.7) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
          </div>
          <div className="relative">
            <h2 className="text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              Ready to build a better catalog?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-indigo-200">
              Start a 14-day free trial. No credit card required. Full access to all modules from day one.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-7 text-[15px] font-bold text-indigo-700 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0"
              >
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:sales@avidiatech.com"
                className="inline-flex h-12 items-center rounded-xl border border-white/30 px-7 text-[15px] font-semibold text-white transition hover:bg-white/10"
              >
                Talk to sales
              </a>
            </div>
            <p className="mt-5 text-[13px] text-indigo-300">
              No credit card · Cancel any time · GDPR-compliant
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-100 dark:border-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">AvidiaTech</span>
              <span className="text-[13px] text-slate-400">· Product Data OS</span>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-[13px]">
              {[
                { label: "Pricing",  href: "/dashboard/pricing" },
                { label: "Docs",     href: "/docs" },
                { label: "Privacy",  href: "/legal/privacy" },
                { label: "Terms",    href: "/legal/terms" },
                { label: "Support",  href: "/support" },
                { label: "Sign in",  href: "/sign-in" },
              ].map((l) => (
                <Link key={l.label} href={l.href} className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  {l.label}
                </Link>
              ))}
            </div>

            <p className="text-[12.5px] text-slate-400 dark:text-slate-500 shrink-0">
              © {new Date().getFullYear()} AvidiaTech, Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
