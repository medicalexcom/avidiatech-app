"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

// ─── Rotating words for hero headline ────────────────────────────────────────
const WORDS = ["manufacturer URLs", "vendor spec sheets", "raw catalog data", "competitor pages"];

// ─── Pipeline nodes for hero visual ──────────────────────────────────────────
const PIPELINE = [
  {
    step: "01", label: "Extract",  badge: "Ingestion",      color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.3)",
    detail: "Specs · Images · Variants · Manuals",
    icon: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
  },
  {
    step: "02", label: "Describe", badge: "AI copy engine", color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)", border: "rgba(139,92,246,0.3)",
    detail: "Brand rules · SEO compliance · Tone",
    icon: <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  },
  {
    step: "03", label: "SEO",      badge: "Full SEO",       color: "#10b981",
    bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.3)",
    detail: "Titles · Meta · H1s · Structured data",
    icon: <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />,
  },
];

// ─── Module marquee ───────────────────────────────────────────────────────────
const MODULES = [
  ["Extract","#f59e0b"], ["Describe","#8b5cf6"], ["SEO","#10b981"],
  ["Translate","#0ea5e9"], ["Cluster","#6366f1"], ["Studio","#d946ef"],
  ["Match","#06b6d4"], ["Variants","#f43f5e"], ["Specs","#14b8a6"],
  ["Docs","#f97316"], ["Images","#ec4899"], ["Import","#10b981"],
  ["Audit","#f43f5e"], ["Price","#f59e0b"], ["Feeds","#f97316"],
  ["Monitor","#0ea5e9"], ["Browser","#06b6d4"], ["API","#6366f1"],
] as const;

// ─── Three unique value moments ───────────────────────────────────────────────
const MOMENTS = [
  {
    tag: "Speed",
    headline: "URL to SEO page in under 2 minutes.",
    body: "No scraping scripts. No manual copy-paste. Drop a URL, hit run — Extract normalizes everything, Describe writes it, SEO publishes it.",
    visual: "timer",
    color: "#f59e0b",
  },
  {
    tag: "Scale",
    headline: "Thousands of SKUs, zero extra headcount.",
    body: "Bulk jobs process your entire catalog in parallel. Every product gets the same quality treatment your best writer would give to one.",
    visual: "scale",
    color: "#6366f1",
  },
  {
    tag: "Control",
    headline: "Your brand rules, enforced automatically.",
    body: "Describe and SEO modules apply your tone, compliance guardrails, and SEO strategy on every output — not just when someone remembers to.",
    visual: "control",
    color: "#8b5cf6",
  },
];

// ─── Stats / social proof ─────────────────────────────────────────────────────
const STATS = [
  { value: "2.4M+",  label: "SKUs processed",              suffix: "",    color: "#6366f1" },
  { value: "18",     label: "Production-ready modules",     suffix: "",    color: "#8b5cf6" },
  { value: "11",     label: "Hours saved / employee / wk",  suffix: "hrs", color: "#0ea5e9" },
  { value: "99.9",   label: "Uptime SLA",                   suffix: "%",   color: "#10b981" },
];

// ─── Feature cards ────────────────────────────────────────────────────────────
const FEATURES = [
  {
    title: "Instant ingestion",
    body: "Paste any manufacturer URL. Specs, images, variants, and manuals are normalized into clean JSON in seconds — not hours.",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "#f59e0b",
  },
  {
    title: "AI-powered enrichment",
    body: "Describe and SEO modules apply your brand rules to generate compliant, conversion-optimized copy at catalog scale.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z",
    color: "#8b5cf6",
  },
  {
    title: "Live monitoring",
    body: "Vendor pages change. Monitor tracks them automatically, flags drifts, and retriggers your pipeline so you're never behind.",
    icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
    color: "#0ea5e9",
  },
  {
    title: "Pipeline automation",
    body: "Chain modules into repeatable workflows. Import, Audit, Feeds, and Translate run in sequence without any manual glue.",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    color: "#6366f1",
  },
  {
    title: "Catalog intelligence",
    body: "Match dedupes SKUs. Cluster groups similar products. Specs normalizes attributes. Data becomes usable — not just stored.",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    color: "#14b8a6",
  },
  {
    title: "Developer-first API",
    body: "Every module exposes clean REST endpoints. Webhooks, bulk jobs, and a typed schema — so your stack stays in control.",
    icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
    color: "#f97316",
  },
];

// ─── How it works steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Extract",
    sub: "Drop a manufacturer URL",
    body: "AvidiaExtract scrapes and normalizes specs, documents, variants, and media into a single reusable product payload in seconds.",
    color: "#f59e0b",
    tags: ["Specs", "Images", "Variants", "Manuals", "JSON output"],
  },
  {
    step: "02",
    title: "Describe + SEO",
    sub: "AI does the heavy lifting",
    body: "AvidiaDescribe and AvidiaSEO apply your custom brand rules to generate descriptions, titles, and full metadata — no copy-paste.",
    color: "#8b5cf6",
    tags: ["Brand voice", "Compliance", "SEO titles", "Meta tags"],
  },
  {
    step: "03",
    title: "Feeds + Monitor",
    sub: "Sync everywhere. Stay ahead.",
    body: "Push enriched output to your store, PIM, or feeds. Monitor vendor changes and rerun flows automatically when pages drift.",
    color: "#0ea5e9",
    tags: ["Store sync", "PIM output", "Auto-rerun", "Drift alerts"],
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ d, size = 18 }: { d: string | React.ReactElement; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {typeof d === "string" ? <path d={d} /> : d}
    </svg>
  );
}

function ArrowRight({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

// ─── Animated pipeline flow dot ───────────────────────────────────────────────
function FlowDots({ color, delay = 0 }: { color: string; delay?: number }) {
  return (
    <div className="relative flex h-10 w-full items-center justify-center overflow-hidden">
      {/* Dashed line */}
      <div className="absolute inset-x-0 top-1/2 h-px border-t border-dashed"
        style={{ borderColor: `${color}40` }} />
      {/* Flowing dots */}
      {[0, 1, 2].map((i) => (
        <div key={i} className="absolute h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: color,
            animation: `flow-down 1.6s ${delay + i * 0.53}s infinite ease-in-out`,
            boxShadow: `0 0 6px ${color}`,
          }} />
      ))}
    </div>
  );
}

// ─── Moment visual ────────────────────────────────────────────────────────────
function MomentVisual({ type, color }: { type: string; color: string }) {
  if (type === "timer") return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4"
        style={{ borderColor: `${color}30`, background: `${color}10` }}>
        <div className="absolute inset-0 rounded-full border-4 border-transparent"
          style={{ borderTopColor: color, animation: "spin 2s linear infinite" }} />
        <span className="text-[12px] font-bold tabular-nums" style={{ color }}>1:47</span>
      </div>
      <span className="text-[12px] font-semibold text-slate-500">avg. per product</span>
    </div>
  );

  if (type === "scale") return (
    <div className="flex items-end gap-1.5 py-2">
      {[40, 60, 75, 90, 100, 95, 100].map((h, i) => (
        <div key={i} className="w-5 rounded-sm"
          style={{
            height: `${h * 0.56}px`, backgroundColor: color,
            opacity: 0.3 + (i / 10),
            animation: `bar-grow 0.4s ${i * 0.07}s both ease-out`,
          }} />
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-1.5 py-1 text-[10.5px] font-mono">
      {[
        ["brand_voice", '"professional"'],
        ["tone",        '"authoritative"'],
        ["seo_rules",   '"enforce_h1"'],
        ["guardrails",  '"true"'],
      ].map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-slate-400">{k}:</span>
          <span className="font-semibold" style={{ color }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Scroll reveal ────────────────────────────────────────────────────────────
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, on };
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => { if (isLoaded && isSignedIn) router.replace("/dashboard"); }, [isLoaded, isSignedIn, router]);

  // Rotating word in headline
  const [wordIdx, setWordIdx] = useState(0);
  const [wordVisible, setWordVisible] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setWordVisible(false);
      setTimeout(() => { setWordIdx((i) => (i + 1) % WORDS.length); setWordVisible(true); }, 350);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  // 3D tilt on pipeline card
  const tiltRef = useRef<HTMLDivElement>(null);
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = tiltRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${y * -7}deg) scale(1.01)`;
  }, []);
  const onMouseLeave = useCallback(() => {
    if (tiltRef.current) tiltRef.current.style.transform = "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
  }, []);

  // Sticky nav
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);

  // Interactive demo
  const [demoUrl, setDemoUrl]     = useState("https://vendor.com/products/infusion-pump-9000");
  const [demoOut, setDemoOut]     = useState<string | null>(null);
  const [demoState, setDemoState] = useState<"idle"|"running"|"done">("idle");
  const [demoErr, setDemoErr]     = useState<string|null>(null);
  const [runsLeft, setRunsLeft]   = useState(1);

  function runDemo() {
    if (!demoUrl.trim()) { setDemoErr("Paste a manufacturer URL first."); return; }
    if (runsLeft <= 0)   { setDemoErr("Sample used. Sign up for unlimited runs."); return; }
    setDemoErr(null); setDemoState("running");
    setTimeout(() => {
      setDemoOut(
        "The Infusion Pump 9000 is a hospital-grade, microprocessor-controlled volumetric infusion device engineered for precision fluid delivery in critical-care environments.\n\nFlow rate: 1–999 mL/hr (0.1 mL resolution), ±2% accuracy. Features a 7-inch WVGA touchscreen, 15-drug library, anti-free-flow safety, KVO 0.1–5 mL/hr, dual alarm system, and IP23 ingress protection.\n\nThis is the output AvidiaDescribe produces after AvidiaExtract normalizes the product page — brand-compliant, search-aware, built from your rules."
      );
      setDemoState("done"); setRunsLeft(0);
    }, 1400);
  }

  // Section reveals
  const statsSec   = useReveal(0.1);
  const featureSec = useReveal(0.06);
  const howSec     = useReveal(0.06);
  const moments    = useReveal(0.08);
  const demoSec    = useReveal(0.1);
  const ctaSec     = useReveal(0.15);

  return (
    <>
      <style>{`
        @keyframes word-in  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes word-out { from { opacity:1; transform:translateY(0);    } to { opacity:0; transform:translateY(-10px); } }
        @keyframes flow-down {
          0%   { top: 20%; opacity: 0; }
          20%  { opacity: 1; }
          80%  { opacity: 1; }
          100% { top: 80%; opacity: 0; }
        }
        @keyframes marquee   { from { transform:translateX(0); }   to { transform:translateX(-50%); } }
        @keyframes spin      { to   { transform:rotate(360deg); } }
        @keyframes bar-grow  { from { transform:scaleY(0); transform-origin:bottom; } to { transform:scaleY(1); } }
        @keyframes float-y   { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-10px);} }
        @keyframes pulse-glow{ 0%,100%{opacity:.6;} 50%{opacity:1;} }
        @keyframes fade-up   { from{opacity:0;transform:translateY(24px);} to{opacity:1;transform:translateY(0);} }
        @keyframes fade-in   { from{opacity:0;} to{opacity:1;} }
        @keyframes grid-pulse{ 0%,100%{opacity:.5;} 50%{opacity:1;} }
        @keyframes border-run{
          0%  { clip-path: inset(0 100% 0 0); }
          100%{ clip-path: inset(0 0 0 0); }
        }

        .word-in  { animation: word-in  .35s cubic-bezier(.22,1,.36,1) both; }
        .word-out { animation: word-out .35s ease-in both; }
        .float-y  { animation: float-y 5s ease-in-out infinite; }
        .float-y2 { animation: float-y 6.5s ease-in-out infinite 1.2s; }
        .marquee-track { animation: marquee 32s linear infinite; }
        .marquee-track:hover { animation-play-state: paused; }
        .tilt-card { transition: transform .22s cubic-bezier(.22,1,.36,1); transform-style: preserve-3d; }
        .reveal { opacity:0; }
        .reveal.on { animation: fade-up .7s cubic-bezier(.22,1,.36,1) forwards; }
        .stagger.on > *:nth-child(1){ animation: fade-up .55s .05s cubic-bezier(.22,1,.36,1) both; }
        .stagger.on > *:nth-child(2){ animation: fade-up .55s .18s cubic-bezier(.22,1,.36,1) both; }
        .stagger.on > *:nth-child(3){ animation: fade-up .55s .31s cubic-bezier(.22,1,.36,1) both; }
        .stagger > * { opacity:0; }

        .pipeline-glow { filter: drop-shadow(0 0 16px rgba(99,102,241,.18)); }

        .noise {
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='.45'/%3E%3C/svg%3E");
          background-size: 200px;
        }

        .hero-grid {
          background-image:
            linear-gradient(rgba(99,102,241,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.06) 1px, transparent 1px);
          background-size: 48px 48px;
          animation: grid-pulse 6s ease-in-out infinite;
        }
        .dark .hero-grid {
          background-image:
            linear-gradient(rgba(99,102,241,.12) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99,102,241,.12) 1px, transparent 1px);
        }
      `}</style>

      <div className="min-h-screen overflow-x-hidden bg-[#fafafa] text-slate-900 antialiased dark:bg-[#060a18] dark:text-slate-50">

        {/* ── NAV ─────────────────────────────────────────────────────────────── */}
        <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? "border-b border-slate-200/70 bg-white/88 shadow-sm backdrop-blur-xl dark:border-slate-800/70 dark:bg-[#060a18]/88"
                   : "bg-transparent"
        }`}>
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-10">
            <Link href="/" className="flex shrink-0 items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-600/25">
                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
                  <path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span className="text-[15px] font-bold tracking-tight">AvidiaTech</span>
            </Link>

            <nav className="hidden items-center gap-7 md:flex">
              {[["Features","#pipeline"],["How it works","#demo"],["Pricing","/dashboard/pricing"],["Docs","/docs"]].map(([l,h]) => (
                <a key={l} href={h} className="text-[13.5px] font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{l}</a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <Link href="/sign-in" className="hidden text-[13.5px] font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:inline">Sign in</Link>
              <Link href="/sign-up" className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 text-[13px] font-semibold text-white shadow-md shadow-indigo-600/25 transition hover:-translate-y-px">
                Start free <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </header>

        {/* ── HERO ────────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Animated grid background */}
          <div className="hero-grid pointer-events-none absolute inset-0 -z-10" />
          {/* Radial fade mask over grid */}
          <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-transparent to-[#fafafa] dark:to-[#060a18]" />
          {/* Colour blobs */}
          <div className="pointer-events-none absolute -right-32 -top-32 -z-10 h-[560px] w-[560px] rounded-full bg-gradient-to-br from-indigo-400/25 to-violet-400/18 blur-[100px] dark:from-indigo-500/18 dark:to-violet-500/12" style={{ animation:"float-y 8s ease-in-out infinite" }}/>
          <div className="pointer-events-none absolute -left-24 top-[40%] -z-10 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-sky-400/18 to-cyan-300/12 blur-[90px] dark:from-sky-500/12 dark:to-cyan-500/8" style={{ animation:"float-y 10s ease-in-out infinite 2s" }}/>

          <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 lg:px-10 lg:pt-24">
            <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-10">

              {/* ── Left copy ──────────────────────────────────────────────── */}
              <div className="space-y-8" style={{ animation:"fade-up .7s .08s cubic-bezier(.22,1,.36,1) both" }}>

                {/* Live badge */}
                <div className="inline-flex items-center gap-2.5 rounded-full border border-indigo-200/60 bg-white/80 px-4 py-1.5 shadow-sm backdrop-blur dark:border-indigo-500/25 dark:bg-indigo-950/40">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"/>
                    <span className="relative h-2 w-2 rounded-full bg-emerald-500"/>
                  </span>
                  <span className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-300">
                    18 modules · production-ready
                  </span>
                </div>

                {/* Headline with rotating word */}
                <h1 className="text-[2.6rem] font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.2rem]">
                  Turn{" "}
                  <span
                    key={wordIdx}
                    className={`inline-block bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 bg-clip-text text-transparent ${wordVisible ? "word-in" : "word-out"}`}
                    style={{ minWidth: "2ch" }}
                  >
                    {WORDS[wordIdx]}
                  </span>
                  <br className="hidden sm:block" />
                  into revenue‑ready product pages.
                </h1>

                <p className="max-w-[500px] text-[16.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                  AvidiaTech pipelines product data from ingestion to publication — Extract, enrich, and distribute your entire catalog automatically.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap gap-3">
                  <Link href="/sign-up"
                    className="group inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 text-[15px] font-bold text-white shadow-xl shadow-indigo-600/28 transition hover:-translate-y-0.5 hover:shadow-indigo-600/35">
                    Start free — 14-day trial
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/sign-in?redirect_url=/dashboard"
                    className="inline-flex h-12 items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-6 text-[15px] font-semibold text-slate-700 backdrop-blur transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:bg-slate-800">
                    Open dashboard
                  </Link>
                </div>

                {/* Trust row */}
                <div className="flex flex-wrap gap-5 text-[12.5px] text-slate-500 dark:text-slate-400">
                  {["No credit card","Cancel any time","GDPR-compliant"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6.5"/><path d="M5 8.5l2 2L11 6"/></svg>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* ── Right: animated 3D pipeline ───────────────────────────── */}
              <div
                ref={tiltRef}
                className="tilt-card float-y2 relative"
                onMouseMove={onMouseMove}
                onMouseLeave={onMouseLeave}
                id="pipeline"
              >
                {/* Outer glow */}
                <div className="pointer-events-none absolute -inset-6 -z-10 rounded-[32px] bg-gradient-to-br from-indigo-300/35 via-violet-300/20 to-sky-300/30 blur-3xl dark:from-indigo-500/22 dark:to-sky-500/15" />

                <div className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/95 shadow-2xl shadow-slate-900/14 backdrop-blur dark:border-slate-700/50 dark:bg-slate-900/96">

                  {/* Chrome bar */}
                  <div className="flex items-center justify-between border-b border-slate-100/80 px-5 py-3.5 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="h-[10px] w-[10px] rounded-full bg-red-400/65"/>
                        <span className="h-[10px] w-[10px] rounded-full bg-amber-400/65"/>
                        <span className="h-[10px] w-[10px] rounded-full bg-emerald-400/65"/>
                      </div>
                      <span className="ml-1 text-[10.5px] font-medium text-slate-400">AvidiaTech · Live pipeline</span>
                    </div>
                    <span className="flex items-center gap-1.5 text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500"/>
                      Running
                    </span>
                  </div>

                  <div className="p-5 space-y-1">
                    {/* URL source */}
                    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
                      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-200 dark:bg-slate-700">
                        <svg className="h-3 w-3 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M8 2a6 6 0 110 12A6 6 0 018 2zM8 2c1.5 2.5 1.5 9.5 0 12M8 2C6.5 4.5 6.5 11.5 8 14M2 8h12"/></svg>
                      </span>
                      <span className="font-mono text-[12px] text-slate-600 dark:text-slate-400 truncate">vendor.com/products/pump-9000</span>
                      <span className="ml-auto shrink-0 rounded-md bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">INPUT</span>
                    </div>

                    {/* Pipeline steps */}
                    {PIPELINE.map((node, i) => (
                      <div key={node.label}>
                        <FlowDots color={node.color} delay={i * 0.3} />

                        <div className="rounded-xl border px-4 py-3 transition-all duration-300 hover:shadow-md"
                          style={{ borderColor: node.border, background: node.bg }}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg"
                                style={{ background: node.color, boxShadow: `0 4px 14px ${node.color}55` }}>
                                <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none"
                                  stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                  {node.icon}
                                </svg>
                              </div>
                              <div>
                                <div className="text-[13px] font-bold" style={{ color: node.color }}>Avidia{node.label}</div>
                                <div className="text-[12px] text-slate-500 dark:text-slate-400">{node.badge}</div>
                              </div>
                            </div>
                            <span className="rounded-full px-2 py-0.5 text-[9px] font-bold text-white"
                              style={{ background: node.color, boxShadow: `0 0 8px ${node.color}80`, animation:"pulse-glow 2s ease-in-out infinite" }}>
                              LIVE
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {node.detail.split(" · ").map((d) => (
                              <span key={d} className="rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium"
                                style={{ borderColor: node.border, color: node.color }}>
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Published success */}
                    <FlowDots color="#10b981" delay={0.9} />
                    <div className="flex items-center gap-3 rounded-xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3 dark:border-emerald-500/25 dark:bg-emerald-500/8">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/30">
                        <svg className="h-4 w-4 text-white" viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round"><path d="M3 8l3 3 7-6"/></svg>
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-emerald-700 dark:text-emerald-400">Published · SEO-ready</div>
                        <div className="text-[12px] text-emerald-600/70 dark:text-emerald-400/60">Title · Meta · H1 · Structured data · Feeds</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── STATS BAR ───────────────────────────────────────────────────────── */}
        <section className="border-y border-slate-100/80 bg-white/70 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/50">
          <div ref={statsSec.ref} className={`reveal mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10 ${statsSec.on ? "on" : ""}`}>
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {STATS.map((s, i) => (
                <div key={s.label}
                  className="flex flex-col items-center gap-1 text-center"
                  style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-[2.4rem] font-extrabold tabular-nums leading-none tracking-tight"
                    style={{ color: s.color }}>
                    {s.value}<span className="text-[1.6rem]">{s.suffix}</span>
                  </div>
                  <div className="mt-1 text-[12.5px] font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
                  <div className="mt-2 h-0.5 w-8 rounded-full" style={{ background: s.color, opacity: 0.5 }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── MODULE MARQUEE ──────────────────────────────────────────────────── */}
        <div className="relative mt-10 overflow-hidden border-y border-slate-200/60 bg-white/60 py-4 backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/40
          before:absolute before:left-0 before:top-0 before:z-10 before:h-full before:w-20 before:bg-gradient-to-r before:from-white before:to-transparent
          after:absolute  after:right-0 after:top-0 after:z-10 after:h-full after:w-20 after:bg-gradient-to-l after:from-white after:to-transparent
          dark:before:from-[#060a18] dark:after:from-[#060a18]">
          <div className="marquee-track flex w-max gap-2.5">
            {[...MODULES, ...MODULES].map(([name, color], i) => (
              <span key={i}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-semibold"
                style={{ borderColor:`${color}30`, color, background:`${color}0c` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }}/>
                Avidia{name}
              </span>
            ))}
          </div>
        </div>

        {/* ── BUILT FOR CATALOG SCALE ─────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <div ref={featureSec.ref} className={`reveal ${featureSec.on ? "on" : ""}`}>

            {/* Header */}
            <div className="mb-14 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Built for catalog scale</p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  One module is useful.<br className="hidden sm:block" />
                  <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-sky-500 bg-clip-text text-transparent">The full stack is transformative.</span>
                </h2>
                <p className="mt-4 max-w-xl text-[15.5px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Each module ships production-ready. Together they replace brittle scripts, spreadsheets, and half a dozen one-off tools.
                </p>
              </div>
              <Link href="/sign-in?redirect_url=/dashboard"
                className="group hidden shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-[13.5px] font-semibold text-slate-700 shadow-sm transition hover:-translate-y-px hover:border-indigo-300 hover:text-indigo-700 lg:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-white">
                See all 18 modules in your dashboard
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            {/* Feature grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <div key={f.title}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                  style={{ animationDelay: `${i * 0.07}s` }}>
                  {/* Hover glow */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `radial-gradient(circle at 20% 20%, ${f.color}14, transparent 65%)` }} />
                  {/* Subtle top border accent */}
                  <div className="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />

                  {/* Icon */}
                  <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${f.color}14`, boxShadow: `0 0 0 1px ${f.color}25` }}>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none"
                      stroke={f.color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                      <path d={f.icon} />
                    </svg>
                  </div>

                  <h3 className="mb-2 text-[15px] font-bold text-slate-900 dark:text-white">{f.title}</h3>
                  <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{f.body}</p>

                  <div className="mt-5 h-0.5 w-6 rounded-full transition-all duration-300 group-hover:w-12"
                    style={{ background: f.color }} />
                </div>
              ))}
            </div>

            {/* Mobile see all link */}
            <div className="mt-8 text-center lg:hidden">
              <Link href="/sign-in?redirect_url=/dashboard"
                className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-indigo-600 dark:text-indigo-400">
                See all 18 modules in your dashboard <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────────────────────────── */}
        <section className="border-y border-slate-100/80 bg-gradient-to-b from-slate-50/80 to-white dark:border-slate-800/60 dark:from-slate-900/60 dark:to-[#060a18]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">

            <div ref={howSec.ref} className={`reveal ${howSec.on ? "on" : ""}`}>
              <div className="mb-14 text-center">
                <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">How it works</p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  From raw URL to published page<br className="hidden sm:block" /> in minutes — not days.
                </h2>
              </div>

              {/* Steps */}
              <div className="relative">
                {/* Connecting line (desktop) */}
                <div className="absolute left-1/2 top-8 hidden h-[calc(100%-4rem)] w-px -translate-x-1/2 bg-gradient-to-b from-amber-300/60 via-violet-300/60 to-sky-300/60 lg:block" />

                <div className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
                  {HOW_IT_WORKS.map((step, i) => (
                    <div key={step.step}
                      className="group relative rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900"
                      style={{ animationDelay: `${i * 0.12}s` }}>
                      {/* Hover glow */}
                      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                        style={{ background: `radial-gradient(circle at 30% 10%, ${step.color}12, transparent 70%)` }} />

                      {/* Step number + connector dot */}
                      <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-[12px] font-extrabold tracking-wider"
                          style={{ borderColor: step.color, color: step.color, background: `${step.color}10` }}>
                          {step.step}
                        </div>
                        <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${step.color}60, transparent)` }} />
                      </div>

                      <h3 className="text-[18px] font-extrabold" style={{ color: step.color }}>{step.title}</h3>
                      <p className="mt-0.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-slate-400">{step.sub}</p>
                      <p className="mt-3 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{step.body}</p>

                      {/* Tags */}
                      <div className="mt-5 flex flex-wrap gap-1.5">
                        {step.tags.map((tag) => (
                          <span key={tag}
                            className="rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                            style={{ borderColor: `${step.color}35`, color: step.color, background: `${step.color}0c` }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 text-center">
                <Link href="/sign-up"
                  className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-7 py-3 text-[14px] font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:-translate-y-0.5">
                  Start your first pipeline free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── THREE MOMENTS ───────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
          <div ref={moments.ref} className={`reveal text-center mb-14 ${moments.on ? "on" : ""}`}>
            <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Why teams switch</p>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Three things that change everything.</h2>
          </div>

          <div className={`stagger grid gap-6 md:grid-cols-3 ${moments.on ? "on" : ""}`}>
            {MOMENTS.map((m) => (
              <div key={m.tag}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                {/* Glow on hover */}
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ background: `radial-gradient(circle at 30% 20%, ${m.color}12, transparent 60%)` }}/>

                {/* Tag */}
                <span className="inline-block rounded-full px-2.5 py-1 text-[12px] font-bold uppercase tracking-[0.18em]"
                  style={{ color: m.color, background: `${m.color}14` }}>
                  {m.tag}
                </span>

                {/* Visual */}
                <div className="my-5 flex justify-center">
                  <MomentVisual type={m.visual} color={m.color} />
                </div>

                <h3 className="text-[16px] font-bold leading-snug text-slate-900 dark:text-white">{m.headline}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400">{m.body}</p>

                {/* Bottom accent bar */}
                <div className="mt-5 h-0.5 w-8 rounded-full transition-all duration-300 group-hover:w-16"
                  style={{ background: m.color }}/>
              </div>
            ))}
          </div>
        </section>

        {/* ── LIVE DEMO ───────────────────────────────────────────────────────── */}
        <section id="demo" className="border-y border-slate-100/80 bg-gradient-to-b from-slate-50 to-white dark:border-slate-800/60 dark:from-slate-900/50 dark:to-[#060a18]">
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-10 lg:py-32">
            <div ref={demoSec.ref} className={`reveal grid gap-12 lg:grid-cols-2 lg:items-center ${demoSec.on ? "on" : ""}`}>

              {/* Left: copy */}
              <div className="space-y-5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-indigo-600 dark:text-indigo-400">Interactive demo</p>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  See the pipeline<br />in action.
                </h2>
                <p className="text-[16px] leading-relaxed text-slate-600 dark:text-slate-400">
                  Paste any manufacturer URL and watch Extract → Describe produce a brand-compliant product description. No account needed for this preview.
                </p>
                <ul className="space-y-2 text-[13.5px] text-slate-600 dark:text-slate-400">
                  {["Normalizes specs, images, and variants automatically","Applies brand voice and SEO compliance","Output is ready to paste into your store or PIM"].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round"><circle cx="8" cy="8" r="6.5"/><path d="M5 8.5l2 2L11 6"/></svg>
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href="/sign-up" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400">
                  Run unlimited flows after sign-up <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>

              {/* Right: demo card */}
              <div className="relative">
                <div className="pointer-events-none absolute -inset-4 -z-10 rounded-[28px] bg-gradient-to-tr from-indigo-200/30 via-violet-200/20 to-sky-200/25 blur-2xl dark:from-indigo-500/14 dark:to-sky-500/10"/>

                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/8 dark:border-slate-800 dark:bg-slate-900">
                  {/* Chrome */}
                  <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-400/60"/>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60"/>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60"/>
                      </div>
                      <span className="text-[10.5px] text-slate-400">Extract → Describe · preview</span>
                    </div>
                    <div className="flex gap-1.5">
                      {[["amber","Extract"],["violet","Describe"],["emerald","SEO"]].map(([c,l]) => (
                        <span key={l} className={`rounded-md px-1.5 py-0.5 text-[9.5px] font-bold bg-${c}-50 text-${c}-700 dark:bg-${c}-500/15 dark:text-${c}-300`}>{l}</span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3.5 p-5">
                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">
                        Manufacturer URL
                      </label>
                      <div className="flex gap-2">
                        <input value={demoUrl}
                          onChange={(e) => { setDemoUrl(e.target.value); setDemoErr(null); }}
                          onKeyDown={(e) => e.key==="Enter" && demoState!=="running" && runDemo()}
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[12.5px] outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          placeholder="https://vendor.com/products/sku"
                        />
                        <button onClick={runDemo}
                          disabled={demoState==="running" || runsLeft<=0}
                          className="rounded-xl bg-indigo-600 px-4 text-[12.5px] font-bold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-55">
                          {demoState==="running" ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                          ) : "Run"}
                        </button>
                      </div>
                      {demoErr && <p className="mt-1 text-[12px] text-rose-600">{demoErr}</p>}
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-[0.16em] text-slate-400">AI output · Describe step</label>
                      <div className="min-h-[130px] rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
                        {demoState==="running" ? (
                          <div className="space-y-2">
                            {[100,100,70].map((w,i) => <div key={i} className="h-3 animate-pulse rounded bg-slate-200 dark:bg-slate-700" style={{ width:`${w}%` }}/>)}
                          </div>
                        ) : demoOut ? (
                          <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-300">{demoOut}</p>
                        ) : (
                          <p className="text-[12.5px] text-slate-400">Paste a URL and click <strong className="text-slate-600 dark:text-slate-300">Run</strong> to preview the Extract → Describe output.</p>
                        )}
                      </div>
                    </div>

                    <p className="text-center text-[10.5px] text-slate-400">
                      {runsLeft>0 ? "1 free preview · " : "Preview used · "}
                      <Link href="/sign-up" className="text-indigo-600 hover:underline dark:text-indigo-400">Sign up</Link> for unlimited.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
        <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-10">
          <div ref={ctaSec.ref} className={`reveal ${ctaSec.on ? "on" : ""}`}>
            <div className="relative overflow-hidden rounded-[28px] px-8 py-20 text-center sm:px-16 sm:py-24"
              style={{ background:"linear-gradient(140deg,#4338ca 0%,#7c3aed 50%,#1d4ed8 100%)" }}>

              <div className="noise pointer-events-none absolute inset-0 opacity-[0.06]"/>
              <div className="pointer-events-none absolute inset-0">
                <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl"/>
                <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-900/50 blur-3xl"/>
                {/* Floating module badges */}
                {[["Extract","#f59e0b","left-8 top-12"],["Describe","#8b5cf6","right-10 top-16"],["Monitor","#0ea5e9","left-14 bottom-10"],["Feeds","#f97316","right-8 bottom-12"]].map(([n,c,pos]) => (
                  <div key={n} className={`absolute ${pos} hidden xl:flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white backdrop-blur-sm`}
                    style={{ animation:`float-y ${5+Math.random()*3}s ease-in-out infinite` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background:c }}/>
                    Avidia{n}
                  </div>
                ))}
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage:"radial-gradient(circle,rgba(255,255,255,.8) 1px,transparent 1px)", backgroundSize:"28px 28px" }}/>
              </div>

              <div className="relative">
                <p className="mb-3 text-[10.5px] font-bold uppercase tracking-[0.22em] text-indigo-200">Ready to ship?</p>
                <h2 className="text-3xl font-extrabold text-white sm:text-4xl lg:text-5xl">
                  Build a better catalog,<br className="hidden sm:block"/> starting today.
                </h2>
                <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-indigo-200">
                  14-day free trial. No credit card. Full access to all 18 modules from day one.
                </p>

                <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                  <Link href="/sign-up"
                    className="group inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-bold text-indigo-700 shadow-xl transition hover:-translate-y-0.5 hover:shadow-2xl">
                    Start free trial
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5"/>
                  </Link>
                  <a href="mailto:sales@avidiatech.com"
                    className="inline-flex items-center rounded-xl border border-white/30 px-7 py-3.5 text-[15px] font-semibold text-white backdrop-blur transition hover:bg-white/10">
                    Talk to sales →
                  </a>
                </div>
                <p className="mt-5 text-[12px] text-indigo-300">No credit card · Cancel any time · SOC2 & GDPR</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-100 dark:border-slate-800/60">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-10">
            <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600">
                  <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4"><path d="M5 15L8.5 5h3L15 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><line x1="6.5" y1="11.5" x2="13.5" y2="11.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </div>
                <span className="text-[14px] font-bold">AvidiaTech</span>
                <span className="text-[12px] text-slate-400">· Product Data OS</span>
              </div>
              <div className="flex flex-wrap justify-center gap-5 text-[12.5px]">
                {[["Pricing","/dashboard/pricing"],["Docs","/docs"],["Privacy","/legal/privacy"],["Terms","/legal/terms"],["Support","/support"],["Sign in","/sign-in"]].map(([l,h]) => (
                  <Link key={l} href={h} className="text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{l}</Link>
                ))}
              </div>
              <p className="shrink-0 text-[12px] text-slate-400">© {new Date().getFullYear()} AvidiaTech, Inc.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
