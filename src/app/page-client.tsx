"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// ─── Module marquee data ───────────────────────────────────────────────────────
const allModules = [
  { name: "Extract",   color: "#f59e0b" },
  { name: "Describe",  color: "#8b5cf6" },
  { name: "SEO",       color: "#10b981" },
  { name: "Translate", color: "#0ea5e9" },
  { name: "Cluster",   color: "#6366f1" },
  { name: "Studio",    color: "#d946ef" },
  { name: "Match",     color: "#06b6d4" },
  { name: "Variants",  color: "#f43f5e" },
  { name: "Specs",     color: "#14b8a6" },
  { name: "Docs",      color: "#f97316" },
  { name: "Images",    color: "#ec4899" },
  { name: "Import",    color: "#10b981" },
  { name: "Audit",     color: "#f43f5e" },
  { name: "Price",     color: "#f59e0b" },
  { name: "Feeds",     color: "#f97316" },
  { name: "Monitor",   color: "#0ea5e9" },
  { name: "Browser",   color: "#06b6d4" },
  { name: "API",       color: "#6366f1" },
];

// ─── Feature highlights ────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Instant ingestion",
    body: "Paste any manufacturer URL. Specs, images, variants, and manuals are normalized into clean JSON in seconds — not hours.",
    accent: "from-amber-500 to-orange-500",
    glow: "rgba(245,158,11,0.15)",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
    title: "AI-powered enrichment",
    body: "Describe and SEO modules apply your brand rules to generate compliant, conversion-optimized copy at catalog scale.",
    accent: "from-violet-500 to-indigo-500",
    glow: "rgba(139,92,246,0.15)",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
      </svg>
    ),
    title: "Live monitoring",
    body: "Vendor pages change. Monitor tracks them automatically, flags drifts, and retriggers your pipeline so you're never behind.",
    accent: "from-sky-500 to-cyan-500",
    glow: "rgba(14,165,233,0.15)",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
      </svg>
    ),
    title: "Pipeline automation",
    body: "Chain modules into repeatable workflows. Import, Audit, Feeds, and Translate run in sequence without any manual glue.",
    accent: "from-emerald-500 to-teal-500",
    glow: "rgba(16,185,129,0.15)",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
      </svg>
    ),
    title: "Catalog intelligence",
    body: "Match dedupes SKUs. Cluster groups similar products. Specs normalizes attributes. Data becomes usable — not just stored.",
    accent: "from-fuchsia-500 to-pink-500",
    glow: "rgba(217,70,239,0.15)",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
      </svg>
    ),
    title: "Developer-first API",
    body: "Every module exposes clean REST endpoints. Webhooks, bulk jobs, and a typed schema — so your stack stays in control.",
    accent: "from-indigo-500 to-blue-500",
    glow: "rgba(99,102,241,0.15)",
  },
];

const steps = [
  {
    n: "01",
    badge: "Extract",
    color: "#f59e0b",
    title: "Drop a manufacturer URL",
    body: "AvidiaExtract scrapes and normalizes specs, documents, variants, and media into a single reusable product payload in seconds.",
  },
  {
    n: "02",
    badge: "Describe + SEO",
    color: "#8b5cf6",
    title: "AI does the heavy lifting",
    body: "AvidiaDescribe and AvidiaSEO apply your custom brand rules to generate descriptions, titles, and full metadata — no copy-paste.",
  },
  {
    n: "03",
    badge: "Feeds + Monitor",
    color: "#10b981",
    title: "Sync everywhere. Stay ahead.",
    body: "Push enriched output to your store, PIM, or feeds. Monitor vendor changes and rerun flows automatically when pages drift.",
  },
];

const stats = [
  { value: "1M+",       label: "SKUs processed"   },
  { value: "18",        label: "Modules"           },
  { value: "10–20 hrs", label: "Saved weekly"      },
  { value: "99.9%",     label: "Pipeline uptime"   },
];

// ─── Helpers ───────────────────────────────────────────────────────────────────
function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function CheckCircle({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="8" cy="8" r="6.5" /><path d="M5 8.5l2 2L11 6" />
    </svg>
  );
}

// Scroll-reveal hook
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
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
        "The Infusion Pump 9000 is a hospital-grade, microprocessor-controlled volumetric infusion device engineered for precision fluid delivery in critical-care environments.\n\nKey specifications: Flow rate 1–999 mL/hr (0.1 mL resolution), ±2% accuracy, 7-inch WVGA touchscreen, 15-drug library pre-loaded, anti-free-flow safety mechanism, KVO 0.1–5 mL/hr, dual alarm system (audible + visual), IP23 ingress protection.\n\nThis panel reflects what AvidiaTech's Describe step would produce — a compliant, search-aware paragraph built from your ingestion rules and brand instructions."
      );
      setDemoStatus("done");
      setDemoRunsLeft(0);
    }, 1200);
  }

  // Sticky nav scroll state
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Mouse parallax for hero orbs
  const heroRef = useRef<HTMLDivElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const onMove = (e: MouseEvent) => {
      const { left, top, width, height } = hero.getBoundingClientRect();
      const x = (e.clientX - left) / width  - 0.5;
      const y = (e.clientY - top)  / height - 0.5;
      if (orb1Ref.current) orb1Ref.current.style.transform = `translate(${x * -30}px, ${y * -20}px)`;
      if (orb2Ref.current) orb2Ref.current.style.transform = `translate(${x * 20}px,  ${y * 15}px)`;
    };
    hero.addEventListener("mousemove", onMove);
    return () => hero.removeEventListener("mousemove", onMove);
  }, []);

  // Section reveals
  const featuresReveal  = useReveal(0.1);
  const stepsReveal     = useReveal(0.1);
  const statsReveal     = useReveal(0.2);
  const ctaReveal       = useReveal(0.2);

  return (
    <>
      {/* Keyframe styles */}
      <style>{`
        @keyframes gradient-shift {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes blob-drift {
          0%, 100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
          33%       { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
          66%       { border-radius: 50% 60% 30% 40% / 30% 40% 70% 60%; }
        }
        @keyframes fade-up {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-8px); }
        }
        .anim-gradient-text {
          background: linear-gradient(270deg, #6366f1, #8b5cf6, #0ea5e9, #6366f1);
          background-size: 300% 300%;
          animation: gradient-shift 6s ease infinite;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .anim-blob { animation: blob-drift 10s ease-in-out infinite; }
        .anim-blob-delay { animation: blob-drift 13s ease-in-out infinite reverse; }
        .anim-float { animation: float 5s ease-in-out infinite; }
        .anim-float-delay { animation: float 6s ease-in-out infinite 1.5s; }
        .reveal { opacity: 0; }
        .reveal.shown { animation: fade-up 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .reveal-stagger > * { opacity: 0; }
        .reveal-stagger.shown > *:nth-child(1) { animation: fade-up 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-stagger.shown > *:nth-child(2) { animation: fade-up 0.5s 0.15s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-stagger.shown > *:nth-child(3) { animation: fade-up 0.5s 0.25s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-stagger.shown > *:nth-child(4) { animation: fade-up 0.5s 0.35s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-stagger.shown > *:nth-child(5) { animation: fade-up 0.5s 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
        .reveal-stagger.shown > *:nth-child(6) { animation: fade-up 0.5s 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
        .marquee-track { animation: marquee 28s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .feature-card:hover .feature-icon-glow { opacity: 1; }
        .feature-card .feature-icon-glow { opacity: 0; transition: opacity 0.3s; }
        .noise-overlay {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 180px 180px;
        }
      `}</style>

      <div className="min-h-screen overflow-x-hidden bg-white text-slate-900 antialiased dark:bg-[#07091a] dark:text-slate-50">

        {/* ── AMBIENT BACKGROUND ─────────────────────────────────────────────── */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          {/* Top gradient wash */}
          <div className="absolute inset-x-0 top-0 h-[85vh] bg-gradient-to-b from-indigo-100/60 via-violet-50/30 to-transparent dark:from-indigo-950/60 dark:via-transparent dark:to-transparent" />
          {/* Animated orbs */}
          <div className="anim-blob absolute -top-40 right-[5%] h-[600px] w-[600px] bg-gradient-to-br from-indigo-400/20 to-violet-400/15 blur-[100px] dark:from-indigo-500/15 dark:to-violet-500/10" />
          <div className="anim-blob-delay absolute left-[-8%] top-[20%] h-[500px] w-[500px] bg-gradient-to-br from-sky-400/15 to-indigo-300/10 blur-[120px] dark:from-sky-500/10 dark:to-indigo-500/5" />
          <div className="absolute bottom-0 left-1/2 h-[400px] w-[800px] -translate-x-1/2 bg-gradient-to-t from-violet-400/10 to-transparent blur-[80px] dark:from-violet-500/8" />
          {/* Dot grid light */}
          <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: "radial-gradient(rgba(99,102,241,0.08) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
          {/* Dot grid dark */}
          <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: "radial-gradient(rgba(99,102,241,0.14) 1px,transparent 1px)", backgroundSize: "32px 32px" }} />
        </div>

        {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled
            ? "border-b border-slate-200/80 bg-white/85 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-[#07091a]/85"
            : "bg-transparent"
        }`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6 lg:px-10">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/30">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true">
                  <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-[15px] font-bold tracking-tight">AvidiaTech</span>
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {[
                { label: "Features",     href: "#features" },
                { label: "How it works", href: "#how-it-works" },
                { label: "Pricing",      href: "/dashboard/pricing" },
                { label: "Docs",         href: "/docs" },
              ].map((l) => (
                <a key={l.label} href={l.href}
                  className="text-[13.5px] font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/sign-in"
                className="hidden text-[13.5px] font-medium text-slate-600 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline">
                Sign in
              </Link>
              <Link href="/sign-up"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-indigo-600/30 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-600/25">
                Start free
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO ───────────────────────────────────────────────────────────── */}
        <section ref={heroRef} className="relative mx-auto max-w-7xl px-4 pb-0 pt-16 sm:px-6 lg:px-10 lg:pt-24">

          {/* Parallax orbs */}
          <div ref={orb1Ref} className="pointer-events-none absolute right-[-5%] top-[-10%] h-[460px] w-[460px] rounded-full bg-gradient-to-br from-indigo-400/25 to-violet-400/20 blur-[90px] transition-transform duration-700 ease-out dark:from-indigo-500/20 dark:to-violet-500/12" />
          <div ref={orb2Ref} className="pointer-events-none absolute left-[-8%] top-[30%] h-[360px] w-[360px] rounded-full bg-gradient-to-br from-sky-400/20 to-cyan-300/15 blur-[100px] transition-transform duration-700 ease-out dark:from-sky-500/12 dark:to-cyan-500/8" />

          <div className="grid gap-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:gap-10">

            {/* ─ Left: copy ─────────────────────────────────────────────────── */}
            <div className="space-y-7" style={{ animation: "fade-up 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both" }}>

              {/* Live badge */}
              <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-200/80 bg-white/90 px-4 py-1.5 shadow-sm backdrop-blur-sm dark:border-indigo-500/30 dark:bg-indigo-950/50">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                  Product data automation · 18 modules
                </span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-[2.75rem] font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                  Turn manufacturer URLs<br />
                  into{" "}
                  <span className="anim-gradient-text">revenue‑ready</span>{" "}
                  product pages.
                </h1>
                <p className="max-w-[520px] text-[17px] leading-relaxed text-slate-600 dark:text-slate-400">
                  AvidiaTech ingests, enriches, and monitors your entire product catalog — so you launch new products, regions, and channels without rewriting the same description twice.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <Link href="/sign-up"
                  className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 text-[15px] font-bold text-white shadow-xl shadow-indigo-600/30 transition-all hover:-translate-y-0.5 hover:shadow-indigo-600/40">
                  Start free — 14-day trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link href="/sign-in?redirect_url=/dashboard"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-6 text-[15px] font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800">
                  Open dashboard
                </Link>
              </div>

              {/* Trust pills */}
              <div className="flex flex-wrap items-center gap-5 text-[13px] text-slate-500 dark:text-slate-400">
                {["No credit card required", "Cancel any time", "GDPR-compliant"].map((t) => (
                  <span key={t} className="flex items-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    {t}
                  </span>
                ))}
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 border-t border-slate-200/70 pt-6 dark:border-slate-800">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="text-[1.5rem] font-extrabold tracking-tight text-slate-900 dark:text-white">{s.value}</p>
                    <p className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ─ Right: interactive demo card ───────────────────────────────── */}
            <div className="relative anim-float" style={{ animation: "float 5s ease-in-out infinite, fade-up 0.8s 0.25s cubic-bezier(0.22,1,0.36,1) both" }}>
              {/* Glow ring behind card */}
              <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-tr from-indigo-300/40 via-violet-300/25 to-sky-300/35 blur-2xl dark:from-indigo-500/20 dark:via-violet-500/12 dark:to-sky-500/15" />
              {/* Subtle outer border glow */}
              <div className="pointer-events-none absolute -inset-[1px] rounded-[22px] bg-gradient-to-br from-indigo-400/40 via-violet-400/20 to-sky-400/30 dark:from-indigo-500/30 dark:to-sky-500/20" style={{ filter: "blur(1px)" }} />

              <div className="relative rounded-[22px] border border-white/80 bg-white/95 shadow-2xl shadow-slate-900/12 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/95">
                {/* Card chrome bar */}
                <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-3.5 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="flex gap-1.5">
                      <span className="h-[11px] w-[11px] rounded-full bg-red-400/70" />
                      <span className="h-[11px] w-[11px] rounded-full bg-amber-400/70" />
                      <span className="h-[11px] w-[11px] rounded-full bg-emerald-400/70" />
                    </div>
                    <span className="text-[11px] font-medium text-slate-400">Pipeline preview · Extract → Describe</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    Live
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  {/* Pipeline step chips */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "1. Extract",  bg: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200/60 dark:border-amber-500/20" },
                      { label: "→",           bg: "text-slate-400" },
                      { label: "2. Describe", bg: "bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300 border border-violet-200/60 dark:border-violet-500/20" },
                      { label: "→",           bg: "text-slate-400" },
                      { label: "3. SEO",      bg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-500/20" },
                    ].map((c, i) =>
                      c.label === "→" ? (
                        <span key={i} className="self-center text-[12px] text-slate-400">→</span>
                      ) : (
                        <span key={i} className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${c.bg}`}>{c.label}</span>
                      )
                    )}
                  </div>

                  {/* URL input */}
                  <div>
                    <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Step 1 · Paste a manufacturer URL
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={demoUrl}
                        onChange={(e) => { setDemoUrl(e.target.value); setDemoError(null); }}
                        onKeyDown={(e) => e.key === "Enter" && demoStatus !== "running" && runDemo()}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[12.5px] text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        placeholder="https://vendor.com/products/your-sku"
                      />
                      <button
                        onClick={runDemo}
                        disabled={demoStatus === "running" || demoRunsLeft <= 0}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-[12.5px] font-bold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {demoStatus === "running" ? (
                          <><svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Running…</>
                        ) : "Run sample"}
                      </button>
                    </div>
                    {demoError && <p className="mt-1.5 text-[11.5px] text-rose-600 dark:text-rose-400">{demoError}</p>}
                  </div>

                  {/* Output */}
                  <div>
                    <label className="mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Step 2 · AI-generated product description
                    </label>
                    <div className="min-h-[110px] rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                      {demoStatus === "running" ? (
                        <div className="space-y-2.5 pt-1">
                          {[100, 100, 60].map((w, i) => (
                            <div key={i} className="h-3 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" style={{ width: `${w}%` }} />
                          ))}
                        </div>
                      ) : demoOutput ? (
                        <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">{demoOutput}</p>
                      ) : (
                        <p className="text-[12.5px] leading-relaxed text-slate-400 dark:text-slate-500">
                          Paste a URL above and click <strong className="text-slate-600 dark:text-slate-300">Run sample</strong> — see the Extract → Describe pipeline in action.
                        </p>
                      )}
                    </div>
                  </div>

                  <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                    {demoRunsLeft > 0 ? `${demoRunsLeft} free sample ·` : "Sample used ·"}{" "}
                    <Link href="/sign-up" className="text-indigo-600 hover:underline dark:text-indigo-400">Create a workspace</Link>{" "}
                    for unlimited flows.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── MODULE MARQUEE ──────────────────────────────────────────────────── */}
        <div className="relative mt-16 overflow-hidden py-5 before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-24 before:bg-gradient-to-r before:from-white before:to-transparent after:absolute after:right-0 after:top-0 after:z-10 after:h-full after:w-24 after:bg-gradient-to-l after:from-white after:to-transparent dark:before:from-[#07091a] dark:after:from-[#07091a]">
          <div className="marquee-track flex w-max gap-3">
            {[...allModules, ...allModules].map((mod, i) => (
              <span key={i}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-[12px] font-semibold text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300"
                style={{ boxShadow: `0 0 0 1px ${mod.color}18, inset 0 0 12px ${mod.color}08` }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: mod.color }} />
                Avidia{mod.name}
              </span>
            ))}
          </div>
        </div>

        {/* ── FEATURES GRID ──────────────────────────────────────────────────── */}
        <section id="features" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <div
            ref={featuresReveal.ref}
            className={`reveal text-center ${featuresReveal.visible ? "shown" : ""}`}
          >
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">
              Built for catalog scale
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-[2.6rem]">
              One module is useful.<br className="hidden lg:block" />
              <span className="anim-gradient-text">The full stack is transformative.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-slate-600 dark:text-slate-400">
              Each module ships production-ready. Together they replace brittle scripts, spreadsheets, and half a dozen one-off tools.
            </p>
          </div>

          <div
            ref={featuresReveal.ref as any}
            className={`reveal-stagger mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${featuresReveal.visible ? "shown" : ""}`}
          >
            {features.map((f) => (
              <div
                key={f.title}
                className="feature-card group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-slate-300/60 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700"
                style={{ "--glow": f.glow } as React.CSSProperties}
              >
                {/* Hover glow */}
                <div className="feature-icon-glow pointer-events-none absolute inset-0 rounded-2xl" style={{ background: `radial-gradient(circle at 30% 30%, ${f.glow}, transparent 60%)` }} />

                {/* Icon */}
                <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${f.accent} text-white shadow-lg`}>
                  {f.icon}
                </div>

                <h3 className="text-[15px] font-bold text-slate-900 dark:text-white">{f.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{f.body}</p>

                {/* Bottom color line */}
                <div className={`mt-5 h-0.5 w-8 rounded-full bg-gradient-to-r ${f.accent} transition-all duration-300 group-hover:w-14`} />
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Link href="/sign-up"
              className="inline-flex items-center gap-2 text-[14px] font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
              See all 18 modules in your dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
        <section id="how-it-works" className="border-y border-slate-100/80 bg-slate-50/60 dark:border-slate-800/60 dark:bg-slate-900/30">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
            <div
              ref={stepsReveal.ref}
              className={`reveal mb-14 text-center ${stepsReveal.visible ? "shown" : ""}`}
            >
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">How it works</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                From raw URL to published page<br className="hidden sm:block" /> in minutes — not days.
              </h2>
            </div>

            <div className={`reveal-stagger grid gap-6 md:grid-cols-3 ${stepsReveal.visible ? "shown" : ""}`}>
              {steps.map((step, i) => (
                <div key={i} className="relative">
                  {/* Connector */}
                  {i < steps.length - 1 && (
                    <div className="absolute right-0 top-9 hidden h-px w-[calc(50%+12px)] border-t border-dashed border-slate-300 dark:border-slate-700 md:block" />
                  )}

                  <div className="relative z-10 flex flex-col gap-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                    {/* Step number watermark */}
                    <span className="absolute right-4 top-3 text-[3.5rem] font-black leading-none tracking-tighter text-slate-100 select-none dark:text-slate-800">{step.n}</span>

                    {/* Badge */}
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-bold"
                      style={{ color: step.color, borderColor: `${step.color}40`, backgroundColor: `${step.color}10` }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: step.color }} />
                      {step.badge}
                    </span>

                    <div className="relative">
                      <h3 className="text-[16px] font-bold text-slate-900 dark:text-white">{step.title}</h3>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── STATS BAND ─────────────────────────────────────────────────────── */}
        <section>
          <div
            ref={statsReveal.ref}
            className={`reveal mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10 ${statsReveal.visible ? "shown" : ""}`}
          >
            <div className="grid grid-cols-2 gap-px rounded-2xl border border-slate-200/80 bg-slate-200/80 overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-800">
              {stats.map((s) => (
                <div key={s.label} className="flex flex-col items-center justify-center gap-1 bg-white px-6 py-8 text-center dark:bg-slate-900">
                  <p className="text-[2.25rem] font-extrabold tracking-tight text-slate-900 dark:text-white">{s.value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-10">
          <div
            ref={ctaReveal.ref}
            className={`reveal ${ctaReveal.visible ? "shown" : ""}`}
          >
            <div className="relative overflow-hidden rounded-3xl px-8 py-20 text-center sm:px-16 sm:py-24"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 45%, #1d4ed8 100%)" }}>

              {/* Noise overlay */}
              <div className="noise-overlay pointer-events-none absolute inset-0 opacity-[0.07]" />

              {/* Decorative orbs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-violet-800/50 blur-3xl" />
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize: "28px 28px" }} />
              </div>

              <div className="relative">
                <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-200">Ready to ship?</p>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                  Build a better catalog,<br className="hidden sm:block" /> starting today.
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-[16px] leading-relaxed text-indigo-200">
                  Start a 14-day free trial. No credit card required. Full access to all 18 modules from day one.
                </p>

                <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up"
                    className="group inline-flex h-13 items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-bold text-indigo-700 shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl">
                    Start free trial
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <a href="mailto:sales@avidiatech.com"
                    className="inline-flex h-13 items-center rounded-xl border border-white/30 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/10">
                    Talk to sales →
                  </a>
                </div>
                <p className="mt-5 text-[12.5px] text-indigo-300">
                  No credit card · Cancel any time · SOC2 & GDPR-compliant
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 dark:border-slate-800/60">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 shadow-sm">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                    <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="text-[14px] font-bold text-slate-900 dark:text-white">AvidiaTech</span>
                <span className="text-[12px] text-slate-400">· Product Data OS</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-5 text-[13px]">
                {[
                  { label: "Features",  href: "#features" },
                  { label: "Pricing",   href: "/dashboard/pricing" },
                  { label: "Docs",      href: "/docs" },
                  { label: "Privacy",   href: "/legal/privacy" },
                  { label: "Terms",     href: "/legal/terms" },
                  { label: "Support",   href: "/support" },
                  { label: "Sign in",   href: "/sign-in" },
                ].map((l) => (
                  <Link key={l.label} href={l.href}
                    className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
                    {l.label}
                  </Link>
                ))}
              </div>

              <p className="shrink-0 text-[12px] text-slate-400 dark:text-slate-500">
                © {new Date().getFullYear()} AvidiaTech, Inc.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
