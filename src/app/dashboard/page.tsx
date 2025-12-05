"use client";

import React from "react";
import Link from "next/link";

const primaryModules = [
  {
    name: "AvidiaExtract",
    href: "/dashboard/extract",
    badge: "Ingestion",
    description:
      "Turn any manufacturer URL into normalized JSON for the whole stack.",
    accentBg: "from-cyan-500/15 via-sky-500/10 to-emerald-500/10",
    border: "border-cyan-500/50",
    dot: "bg-cyan-400",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
    status: "live" as const,
  },
  {
    name: "AvidiaDescribe",
    href: "/dashboard/describe",
    badge: "Copy engine",
    description:
      "Start from rough notes and output SEO-ready product descriptions and HTML.",
    accentBg: "from-fuchsia-500/15 via-pink-500/10 to-sky-400/10",
    border: "border-fuchsia-500/50",
    dot: "bg-fuchsia-400",
    glow: "shadow-[0_0_40px_rgba(236,72,153,0.35)]",
    status: "live" as const,
  },
  {
    name: "AvidiaSEO",
    href: "/dashboard/seo",
    badge: "URL → SEO",
    description:
      "Feed ingested URLs into a single-click cascade for compliant SEO pages.",
    accentBg: "from-emerald-500/15 via-cyan-500/10 to-sky-400/10",
    border: "border-emerald-500/50",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.35)]",
    status: "live" as const,
  },
];

type ModuleStatus = "live" | "beta" | "soon";

const secondaryModules: {
  group: string;
  items: {
    name: string;
    href: string;
    tag: string;
    status: ModuleStatus;
  }[];
}[] = [
  {
    group: "AI Extraction & Content",
    items: [
      {
        name: "Translate",
        href: "/dashboard/translate",
        tag: "Multi-language",
        status: "beta",
      },
      {
        name: "Cluster",
        href: "/dashboard/cluster",
        tag: "Similarity & groups",
        status: "beta",
      },
      {
        name: "Studio",
        href: "/dashboard/studio",
        tag: "Experiments",
        status: "soon",
      },
    ],
  },
  {
    group: "Data Intelligence",
    items: [
      {
        name: "Match",
        href: "/dashboard/match",
        tag: "Catalog mapping",
        status: "beta",
      },
      {
        name: "Variants",
        href: "/dashboard/variants",
        tag: "Variations",
        status: "beta",
      },
      {
        name: "Specs",
        href: "/dashboard/specs",
        tag: "Attributes",
        status: "beta",
      },
      {
        name: "Docs",
        href: "/dashboard/docs",
        tag: "Manuals & PDFs",
        status: "soon",
      },
      {
        name: "Images",
        href: "/dashboard/images",
        tag: "Visual library",
        status: "soon",
      },
    ],
  },
  {
    group: "Commerce & Automation",
    items: [
      {
        name: "Import",
        href: "/dashboard/import",
        tag: "Sync in",
        status: "live",
      },
      {
        name: "Audit",
        href: "/dashboard/audit",
        tag: "QA & scoring",
        status: "beta",
      },
      {
        name: "Price",
        href: "/dashboard/price",
        tag: "Pricing rules",
        status: "soon",
      },
      {
        name: "Feeds",
        href: "/dashboard/feeds",
        tag: "Outbound feeds",
        status: "soon",
      },
      {
        name: "Monitor",
        href: "/dashboard/monitor",
        tag: "Pipeline health",
        status: "soon",
      },
    ],
  },
  {
    group: "Developer Tools",
    items: [
      {
        name: "Browser",
        href: "/dashboard/browser",
        tag: "Scraper tools",
        status: "beta",
      },
      {
        name: "API",
        href: "/dashboard/api",
        tag: "API access",
        status: "live",
      },
    ],
  },
];

function statusPillClasses(status: ModuleStatus) {
  if (status === "live") {
    return "bg-emerald-500/15 text-emerald-200 border border-emerald-400/40";
  }
  if (status === "beta") {
    return "bg-amber-500/10 text-amber-200 border border-amber-400/40";
  }
  return "bg-slate-700/40 text-slate-200 border border-slate-600/70";
}

function statusLabel(status: ModuleStatus) {
  if (status === "live") return "Live";
  if (status === "beta") return "Beta";
  return "Coming soon";
}

/**
 * Dashboard root: main signed-in landing.
 * PlanModal will hard-block on top of this page for unsubscribed users.
 */
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden">
      {/* Background gradients + grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-96 w-96 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="absolute -bottom-40 right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-500/15 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:46px_46px]" />
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-8">
        {/* HERO ROW */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 shadow-[0_0_80px_rgba(15,23,42,0.9)] px-5 py-6 lg:px-7 lg:py-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            {/* Left copy */}
            <div className="flex-1 min-w-[260px] space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-slate-700 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 border border-emerald-400/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                AvidiaTech • Dashboard
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl lg:text-4xl font-semibold leading-tight text-slate-50">
                  Welcome to your{" "}
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-emerald-300">
                    product data command center
                  </span>
                  .
                </h1>
                <p className="text-sm text-slate-300 max-w-xl">
                  This is the hub for everything AvidiaTech: ingestion, content,
                  SEO, intelligence, automation, and developer tools. Start with
                  Extract, Describe, or SEO — then layer the rest as your stack
                  matures.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-cyan-500/40 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span className="text-slate-200">
                    Ingestion-first: everything flows from AvidiaExtract.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-fuchsia-500/40 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <span className="text-slate-200">
                    Custom GPT instructions power Describe & SEO.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/90 border border-emerald-500/40 px-3 py-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span className="text-slate-200">
                    More modules are live, in beta, or under construction.
                  </span>
                </div>
              </div>
            </div>

            {/* Right: pipeline snapshot */}
            <div className="w-full lg:w-[360px] xl:w-[400px] mt-4 lg:mt-0">
              <div className="rounded-2xl bg-slate-950/95 border border-slate-800/80 px-4 py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
                    Pipeline at a glance
                  </p>
                  <span className="text-[10px] text-slate-500">
                    Sample states — wire later
                  </span>
                </div>
                <div className="space-y-2 text-[11px]">
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-100">
                        Ingest jobs
                      </span>
                    </div>
                    <span className="text-slate-300">Stable</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span className="font-semibold text-slate-100">
                        SEO & Describe runs
                      </span>
                    </div>
                    <span className="text-slate-300">On demand</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-700 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="font-semibold text-slate-100">
                        Pending QA / Audit
                      </span>
                    </div>
                    <span className="text-slate-300">Hook into Audit</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 pt-1">
                  Later, wire these to live counts from Supabase: ingests, SEO
                  jobs, audits, and failures.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRIMARY MODULES ROW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {primaryModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={[
                "group relative overflow-hidden rounded-2xl border bg-gradient-to-br",
                mod.border,
                mod.accentBg,
                "px-4 py-4 lg:px-5 lg:py-5 flex flex-col justify-between",
                "transition-all duration-150 hover:-translate-y-[2px]",
                mod.glow,
              ].join(" ")}
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-950/80 border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${mod.dot}`} />
                  <span>{mod.badge}</span>
                  <span className="h-1 w-px bg-slate-700" />
                  <span className="text-emerald-200 font-semibold">Live</span>
                </div>
                <div>
                  <h2 className="text-sm lg:text-base font-semibold text-slate-50">
                    {mod.name}
                  </h2>
                  <p className="mt-1 text-[11px] text-slate-200">
                    {mod.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                    Open module
                  </span>
                  <span className="text-xs group-hover:translate-x-[1px] transition-transform">
                    ↗
                  </span>
                </span>
                <span className="text-slate-400">
                  Ingest → JSON → SEO ready
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* SECONDARY MODULE GRID + GUIDANCE */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {secondaryModules.map((group) => (
            <div
              key={group.group}
              className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-4 lg:p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-[0.18em]">
                    {group.group}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Modules in this group can be rolled in as your workflows
                    mature.
                  </p>
                </div>
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const isSoon = item.status === "soon";
                  return (
                    <li key={item.href}>
                      <Link
                        href={isSoon ? "#" : item.href}
                        aria-disabled={isSoon}
                        className={[
                          "flex items-center justify-between rounded-xl px-3 py-2 text-[11px] border transition-colors",
                          "bg-slate-950/80",
                          isSoon
                            ? "border-slate-800 text-slate-500 cursor-not-allowed opacity-70"
                            : "border-slate-800 hover:border-slate-600 hover:bg-slate-900/90 text-slate-200",
                        ].join(" ")}
                      >
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">
                            {item.tag}
                          </span>
                          <span
                            className={[
                              "inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[9px] font-semibold",
                              statusPillClasses(item.status),
                            ].join(" ")}
                          >
                            {statusLabel(item.status)}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* RIGHT COLUMN: helper / roadmap */}
          <div className="rounded-2xl bg-slate-900/90 border border-slate-800/80 p-4 lg:p-5 space-y-3">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-[0.18em]">
              How to grow into all modules
            </h3>
            <ol className="space-y-2 text-[11px] text-slate-300 list-decimal list-inside">
              <li>
                Start in{" "}
                <span className="font-semibold text-cyan-300">
                  AvidiaExtract
                </span>{" "}
                to normalize product data from manufacturer URLs.
              </li>
              <li>
                Use{" "}
                <span className="font-semibold text-fuchsia-300">
                  AvidiaDescribe
                </span>{" "}
                when you have partial info or sales notes and need full
                descriptions.
              </li>
              <li>
                Run{" "}
                <span className="font-semibold text-emerald-300">
                  AvidiaSEO
                </span>{" "}
                on ingested URLs to create final SEO pages and JSON payloads for
                your store.
              </li>
              <li>
                Layer in{" "}
                <span className="font-semibold text-slate-100">Variants</span>,{" "}
                <span className="font-semibold text-slate-100">Audit</span>,{" "}
                <span className="font-semibold text-slate-100">Feeds</span>, and{" "}
                <span className="font-semibold text-slate-100">Monitor</span>{" "}
                as you move to full automation.
              </li>
            </ol>
            <div className="pt-2 border-t border-slate-800 mt-2">
              <p className="text-[10px] text-slate-500">
                More modules are on the roadmap (Validate, Agency, Bulk Ops,
                Description Formats, and others). They&apos;ll appear here as{" "}
                <span className="font-semibold text-slate-300">Coming soon</span>{" "}
                first, then flip to{" "}
                <span className="font-semibold text-emerald-300">Live</span>{" "}
                once wired.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
