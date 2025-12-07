"use client";

import React from "react";
import Link from "next/link";
import {
  PageTitle,
  PageDescription,
  CardTitle,
  SectionLabel,
} from "@/components/typography";

const primaryModules = [
  {
    name: "AvidiaExtract",
    href: "/dashboard/extract",
    badge: "Ingestion",
    description:
      "Turn any manufacturer URL into normalized JSON for the whole stack.",
    accentBg: "from-cyan-500/12 via-sky-500/8 to-emerald-500/10",
    border: "border-cyan-400/60 dark:border-cyan-500/50",
    dot: "bg-cyan-400",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.25)] dark:shadow-[0_0_40px_rgba(56,189,248,0.35)]",
    status: "live" as const,
  },
  {
    name: "AvidiaDescribe",
    href: "/dashboard/describe",
    badge: "Copy engine",
    description:
      "Start from rough notes and output SEO-ready product descriptions and HTML.",
    accentBg: "from-fuchsia-500/12 via-pink-500/8 to-sky-400/10",
    border: "border-fuchsia-400/60 dark:border-fuchsia-500/50",
    dot: "bg-fuchsia-400",
    glow: "shadow-[0_0_40px_rgba(236,72,153,0.25)] dark:shadow-[0_0_40px_rgba(236,72,153,0.35)]",
    status: "live" as const,
  },
  {
    name: "AvidiaSEO",
    href: "/dashboard/seo",
    badge: "URL → SEO",
    description:
      "Feed ingested URLs into a single-click cascade for compliant SEO pages.",
    accentBg: "from-emerald-500/12 via-cyan-500/8 to-sky-400/10",
    border: "border-emerald-400/60 dark:border-emerald-500/50",
    dot: "bg-emerald-400",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.25)] dark:shadow-[0_0_40px_rgba(16,185,129,0.35)]",
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
    return "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-400/40";
  }
  if (status === "beta") {
    return "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-400/40";
  }
  return "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600/70";
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
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background: cyan / fuchsia bias, subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-36 -left-32 h-96 w-96 rounded-full bg-cyan-300/26 blur-3xl dark:bg-cyan-500/18" />
        <div className="absolute -bottom-40 right-[-10rem] h-[26rem] w-[26rem] rounded-full bg-fuchsia-300/24 blur-3xl dark:bg-fuchsia-500/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* COMPACT HEADER / HERO (Cluster-style) */}
        <section className="mb-2">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left copy */}
            <div className="flex-1 min-w-[260px] space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[10px] font-medium text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="inline-flex h-3 w-3 items-center justify-center rounded-full bg-slate-50 border border-emerald-400/80 dark:bg-slate-900">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
                AvidiaTech · Dashboard
                <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-slate-700 dark:text-slate-200">
                  Live workspace
                </span>
              </div>

              <div className="space-y-2">
                <PageTitle>
                  Welcome to your{" "}
                  <span className="bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-emerald-500 bg-clip-text text-transparent dark:from-cyan-300 dark:via-fuchsia-300 dark:to-emerald-300">
                    product data command center
                  </span>
                  .
                </PageTitle>
                <PageDescription className="max-w-xl">
                  This is the hub for everything AvidiaTech: ingestion, content, SEO,
                  intelligence, automation, and developer tools. Start with Extract,
                  Describe, or SEO — then layer the rest as your stack matures.
                </PageDescription>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-cyan-500/40 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  <span>Ingestion-first: everything flows from AvidiaExtract.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-fuchsia-500/40 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-400" />
                  <span>Custom GPT instructions power Describe &amp; SEO.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-emerald-500/40 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>More modules are live, in beta, or under construction.</span>
                </div>
              </div>

              {/* Quick primary CTAs */}
              <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                <Link
                  href="/dashboard/extract"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-50 shadow-sm hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-100"
                >
                  Open AvidiaExtract
                  <span className="ml-1 text-[10px]">↗</span>
                </Link>
                <Link
                  href="/dashboard/seo"
                  className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  Run SEO on a URL
                </Link>
              </div>
            </div>

            {/* Right: pipeline snapshot (same content, premium styling) */}
            <div className="mt-4 w-full max-w-md space-y-3 lg:mt-0 lg:max-w-sm">
              <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-4 shadow-[0_16px_40px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-950/95 dark:shadow-[0_16px_40px_rgba(15,23,42,0.8)]">
                <div className="flex items-center justify-between">
                  <SectionLabel className="font-medium">
                    Pipeline at a glance
                  </SectionLabel>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    Sample states — wire later
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-[11px]">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        Ingest jobs
                      </span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      Stable
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        SEO &amp; Describe runs
                      </span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      On demand
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/90">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-amber-400" />
                      <span className="font-semibold text-slate-800 dark:text-slate-100">
                        Pending QA / Audit
                      </span>
                    </div>
                    <span className="text-slate-600 dark:text-slate-300">
                      Hook into Audit
                    </span>
                  </div>
                </div>

                <p className="pt-2 text-[10px] text-slate-500 dark:text-slate-500">
                  Later, wire these to live counts from Supabase: ingests, SEO jobs,
                  audits, and failures.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* PRIMARY MODULES ROW */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-6">
          {primaryModules.map((mod) => (
            <Link
              key={mod.href}
              href={mod.href}
              className={[
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br",
                mod.border,
                mod.accentBg,
                "px-4 py-4 lg:px-5 lg:py-5",
                "transition-all duration-150 hover:-translate-y-[2px] hover:shadow-lg",
                mod.glow,
                "backdrop-blur-sm",
              ].join(" ")}
            >
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950/90 dark:text-slate-300">
                  <span className={`h-1.5 w-1.5 rounded-full ${mod.dot}`} />
                  <span>{mod.badge}</span>
                  <span className="h-1 w-px bg-slate-200 dark:bg-slate-700" />
                  <span className="text-emerald-600 dark:text-emerald-200 font-semibold">
                    Live
                  </span>
                </div>
                <div>
                  <CardTitle className="text-sm lg:text-base">
                    {mod.name}
                  </CardTitle>
                  <p className="mt-1 text-[11px] text-slate-700 dark:text-slate-200">
                    {mod.description}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-700 dark:text-slate-200">
                <span className="inline-flex items-center gap-1">
                  <span className="opacity-80 transition-opacity group-hover:opacity-100">
                    Open module
                  </span>
                  <span className="text-xs transition-transform group-hover:translate-x-[1px]">
                    ↗
                  </span>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Ingest → JSON → SEO ready
                </span>
              </div>
            </Link>
          ))}
        </section>

        {/* SECONDARY MODULE GRID + GUIDANCE */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
          {secondaryModules.map((group) => (
            <div
              key={group.group}
              className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)] lg:p-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-100">
                    {group.group}
                  </h3>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Modules in this group can be rolled in as your workflows mature.
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
                          isSoon
                            ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed opacity-70 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-500"
                            : "border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900",
                        ].join(" ")}
                      >
                        <span>{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400">
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
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(148,163,184,0.25)] dark:border-slate-800 dark:bg-slate-900/90 dark:shadow-[0_16px_40px_rgba(15,23,42,0.7)] lg:p-5">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-100">
              How to grow into all modules
            </h3>
            <ol className="list-inside list-decimal space-y-2 text-[11px] text-slate-600 dark:text-slate-300">
              <li>
                Start in{" "}
                <span className="font-semibold text-cyan-600 dark:text-cyan-300">
                  AvidiaExtract
                </span>{" "}
                to normalize product data from manufacturer URLs.
              </li>
              <li>
                Use{" "}
                <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-300">
                  AvidiaDescribe
                </span>{" "}
                when you have partial info or sales notes and need full descriptions.
              </li>
              <li>
                Run{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  AvidiaSEO
                </span>{" "}
                on ingested URLs to create final SEO pages and JSON payloads for your
                store.
              </li>
              <li>
                Layer in{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Variants
                </span>
                ,{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Audit
                </span>
                ,{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Feeds
                </span>{" "}
                and{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-100">
                  Monitor
                </span>{" "}
                as you move to full automation.
              </li>
            </ol>
            <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 dark:text-slate-500">
                More modules are on the roadmap (Validate, Agency, Bulk Ops, Description
                Formats, and others). They&apos;ll appear here as{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Coming soon
                </span>{" "}
                first, then flip to{" "}
                <span className="font-semibold text-emerald-600 dark:text-emerald-300">
                  Live
                </span>{" "}
                once wired.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
