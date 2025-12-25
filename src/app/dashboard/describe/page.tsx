// src/app/dashboard/describe/page.tsx
"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DescribeForm from "@/components/describe/DescribeForm";
import DescribeOutput from "@/components/describe/DescribeOutput";

/**
 * Fixes in this version:
 * - HTML view is default (?view=html) if missing.
 * - Removes the “double/triple frame” look:
 *   ✅ No gradient border wrapper around the Inputs/Preview surfaces
 *   ✅ No extra inner card around DescribeForm / DescribeOutput (prevents nested frames)
 * - No extra vertical scrolling containers added at the page level (page scroll only).
 */

export const dynamic = "force-dynamic";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal" | "brand";
}) {
  const tones =
    tone === "brand"
      ? "border-fuchsia-200/60 bg-fuchsia-50 text-fuchsia-700 dark:border-fuchsia-400/25 dark:bg-fuchsia-500/10 dark:text-fuchsia-100"
      : tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] shadow-sm backdrop-blur",
        tones
      )}
    >
      {children}
    </span>
  );
}

function SoftButton({
  href,
  children,
  variant = "secondary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950";

  if (variant === "primary") {
    return (
      <a
        href={href}
        className={cx(
          base,
          "text-slate-950 shadow-[0_16px_34px_-22px_rgba(2,6,23,0.55)]",
          "bg-gradient-to-r from-fuchsia-400 via-pink-500 to-sky-500",
          "hover:from-fuchsia-300 hover:via-pink-400 hover:to-sky-400",
          "focus-visible:ring-fuchsia-400/70",
          className
        )}
      >
        {children}
      </a>
    );
  }

  return (
    <a
      href={href}
      className={cx(
        base,
        "border border-slate-200/80 bg-white/70 text-slate-700 shadow-sm",
        "hover:bg-white hover:text-slate-900",
        "dark:border-slate-800/70 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-slate-950/65 dark:hover:text-slate-50",
        "focus-visible:ring-slate-300/70 dark:focus-visible:ring-slate-700/70",
        className
      )}
    >
      {children}
    </a>
  );
}

function StatCard({
  title,
  value,
  caption,
  tone = "fuchsia",
}: {
  title: string;
  value: React.ReactNode;
  caption?: string;
  tone?: "fuchsia" | "sky" | "emerald" | "amber";
}) {
  const toneMap: Record<
    NonNullable<typeof tone>,
    { ring: string; wash: string; glowA: string; glowB: string; top: string }
  > = {
    fuchsia: {
      ring: "ring-fuchsia-200/60 dark:ring-fuchsia-500/20",
      wash: "from-fuchsia-500/10 via-fuchsia-500/0 to-transparent dark:from-fuchsia-400/10 dark:via-fuchsia-400/0",
      glowA: "bg-fuchsia-400/16 dark:bg-fuchsia-500/12",
      glowB: "bg-pink-400/10 dark:bg-pink-500/10",
      top: "from-fuchsia-400/55 via-fuchsia-300/20 to-transparent dark:from-fuchsia-300/35 dark:via-fuchsia-300/15",
    },
    sky: {
      ring: "ring-sky-200/60 dark:ring-sky-500/20",
      wash: "from-sky-500/10 via-sky-500/0 to-transparent dark:from-sky-400/10 dark:via-sky-400/0",
      glowA: "bg-sky-400/16 dark:bg-sky-500/12",
      glowB: "bg-indigo-400/10 dark:bg-indigo-500/10",
      top: "from-sky-400/55 via-sky-300/20 to-transparent dark:from-sky-300/35 dark:via-sky-300/15",
    },
    emerald: {
      ring: "ring-emerald-200/60 dark:ring-emerald-500/20",
      wash: "from-emerald-500/10 via-emerald-500/0 to-transparent dark:from-emerald-400/10 dark:via-emerald-400/0",
      glowA: "bg-emerald-400/14 dark:bg-emerald-500/12",
      glowB: "bg-cyan-400/10 dark:bg-cyan-500/10",
      top: "from-emerald-400/55 via-emerald-300/20 to-transparent dark:from-emerald-300/35 dark:via-emerald-300/15",
    },
    amber: {
      ring: "ring-amber-200/60 dark:ring-amber-500/20",
      wash: "from-amber-500/12 via-amber-500/0 to-transparent dark:from-amber-400/10 dark:via-amber-400/0",
      glowA: "bg-amber-400/16 dark:bg-amber-500/12",
      glowB: "bg-orange-400/10 dark:bg-orange-500/10",
      top: "from-amber-400/60 via-amber-300/20 to-transparent dark:from-amber-300/35 dark:via-amber-300/15",
    },
  };

  const t = toneMap[tone];

  return (
    <div
      className={cx(
        "group relative overflow-hidden rounded-2xl bg-white/80 p-4 shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] backdrop-blur",
        "ring-1 ring-slate-200/70 dark:bg-slate-950/45 dark:ring-slate-800/60",
        t.ring
      )}
    >
      <div className={cx("pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r", t.top)} />
      <div className={cx("pointer-events-none absolute inset-0 bg-gradient-to-br", t.wash)} />
      <div className={cx("pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl", t.glowA)} />
      <div className={cx("pointer-events-none absolute -left-10 -bottom-12 h-28 w-28 rounded-full blur-2xl", t.glowB)} />

      <div className="relative">
        <div className="text-[13px] font-semibold leading-none text-slate-900 dark:text-slate-50">
          <span className="block truncate">{title}</span>
        </div>
        <div className="mt-3 text-[28px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </div>
        {caption ? (
          <div className="mt-2 text-[11px] leading-none text-slate-500 dark:text-slate-400">
            <span className="block truncate">{caption}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DescribePage() {
  const router = useRouter();
  const params = useSearchParams();

  // ✅ Default the output "View" to HTML
  useEffect(() => {
    if (!params) return;
    const current = params.get("view");
    if (current) return;

    const sp = new URLSearchParams(params.toString());
    sp.set("view", "html");
    router.replace(`?${sp.toString()}`, { scroll: false });
  }, [params, router]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background: premium glows + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-fuchsia-300/18 blur-3xl dark:bg-fuchsia-500/12" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-sky-300/18 blur-3xl dark:bg-sky-500/12" />
        <div className="absolute top-24 right-10 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl dark:bg-amber-500/8" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
        {/* Header / Hero */}
        <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/55 bg-white/75 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-700 shadow-sm backdrop-blur dark:border-fuchsia-400/25 dark:bg-slate-950/45 dark:text-fuchsia-100">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-fuchsia-400/55 bg-slate-100 dark:border-fuchsia-400/25 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                </span>
                Content • AvidiaDescribe
              </span>

              <TinyChip tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Render + GPT • Instructioned
              </TinyChip>

              <TinyChip tone="signal">Default view: HTML</TinyChip>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                Describe the product in{" "}
                <span className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-pink-300 dark:to-sky-300">
                  your own words
                </span>
                . We turn it into a store-ready page.
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                Start with a name, short context, and a few real constraints. AvidiaDescribe
                runs your custom instruction profile and returns SEO-ready copy that stays
                consistent across brands, categories, and channels.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <SoftButton href="#describe-input" variant="primary">
              Start describing
            </SoftButton>
            <SoftButton href="/dashboard/extract" variant="secondary">
              Open Extract
            </SoftButton>
            <SoftButton href="/dashboard/seo" variant="secondary">
              Open SEO
            </SoftButton>
          </div>
        </header>

        {/* Compact “stats” row */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Input length" tone="fuchsia" value="Short" caption="Works from tiny prompts" />
          <StatCard title="Output shape" tone="sky" value="Structured" caption="Headers, bullets, meta" />
          <StatCard title="Rule fidelity" tone="emerald" value="Locked" caption="Custom instructions enforced" />
          <StatCard title="Time to draft" tone="amber" value="Fast" caption="Designed for throughput" />
        </section>

        {/* INPUTS: single-surface (no nested frames) */}
        <section
          id="describe-input"
          className={cx(
            "rounded-3xl bg-white/78 p-4 shadow-[0_18px_55px_-40px_rgba(2,6,23,0.55)] backdrop-blur",
            "ring-1 ring-slate-200/70",
            "dark:bg-slate-950/45 dark:ring-slate-800/60",
            "lg:p-5"
          )}
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <TinyChip tone="brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                  Describe input
                </TinyChip>
                <TinyChip>Name • short context • constraints</TinyChip>
              </div>
              <h2 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                Inputs at the top — always.
              </h2>
              <p className="mt-1 max-w-2xl text-[11px] text-slate-600 dark:text-slate-300">
                Fill in the fields (name, short description, notes, claims, disclaimers, audience).
                The output below defaults to HTML view.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <TinyChip tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Auto-structured
              </TinyChip>
            </div>
          </div>

          {/* ✅ No extra wrapper around DescribeForm (prevents the “multi-frame” look) */}
          <div className="mt-4">
            <DescribeForm />
          </div>
        </section>

        {/* WORKSPACE: Output (left) + Guidance rail (right) */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          {/* LEFT: output preview primary — single surface, no nested frames */}
          <div className="lg:col-span-8">
            <div
              className={cx(
                "rounded-3xl bg-white/78 p-4 shadow-[0_18px_55px_-40px_rgba(2,6,23,0.55)] backdrop-blur",
                "ring-1 ring-slate-200/70",
                "dark:bg-slate-950/45 dark:ring-slate-800/60",
                "lg:p-5"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TinyChip tone="success">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Preview
                    </TinyChip>
                    <TinyChip>Default: HTML view</TinyChip>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Preview results
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This panel is intentionally “one surface”. Any additional framing belongs inside the output component only.
                  </p>
                </div>

                <div className="hidden shrink-0 sm:flex">
                  <SoftButton href="/dashboard/seo" variant="secondary" className="px-3 py-1.5 text-xs">
                    Send to SEO ↗
                  </SoftButton>
                </div>
              </div>

              {/* ✅ No extra wrapper around DescribeOutput (prevents nested frames + weird scroll feel) */}
              <div className="mt-4">
                <DescribeOutput />
              </div>
            </div>
          </div>

          {/* RIGHT: guidance rail */}
          <aside className="space-y-4 lg:col-span-4">
            <div
              className={cx(
                "rounded-3xl bg-white/78 p-4 shadow-[0_18px_55px_-40px_rgba(2,6,23,0.55)] backdrop-blur",
                "ring-1 ring-slate-200/70",
                "dark:bg-slate-950/45 dark:ring-slate-800/60",
                "lg:p-5"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Quick flow
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    A simple path that keeps quality consistent.
                  </p>
                </div>
                <TinyChip tone="brand">
                  <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                  Guide
                </TinyChip>
              </div>

              <div className="mt-4 space-y-2 text-[11px]">
                {[
                  {
                    n: "1",
                    ring: "border-fuchsia-400/45 text-fuchsia-700 dark:text-fuchsia-200",
                    title: "Fill inputs",
                    body: "Name + short context + constraints you actually care about.",
                  },
                  {
                    n: "2",
                    ring: "border-sky-400/45 text-sky-700 dark:text-sky-200",
                    title: "Review HTML",
                    body: "HTML is the default view; make sure structure reads clean.",
                  },
                  {
                    n: "3",
                    ring: "border-emerald-400/45 text-emerald-700 dark:text-emerald-200",
                    title: "Send downstream",
                    body: "Reuse in SEO, Import, and exports.",
                  },
                ].map((x) => (
                  <div
                    key={x.n}
                    className="flex items-start gap-3 rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/25 dark:ring-slate-800/60"
                  >
                    <div
                      className={cx(
                        "mt-[2px] flex h-7 w-7 items-center justify-center rounded-xl border bg-white text-[12px] font-semibold",
                        x.ring,
                        "dark:bg-slate-950"
                      )}
                    >
                      {x.n}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {x.title}
                      </div>
                      <div className="mt-0.5 text-slate-600 dark:text-slate-300">
                        {x.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={cx(
                "rounded-3xl bg-white/78 p-4 shadow-[0_18px_55px_-40px_rgba(2,6,23,0.55)] backdrop-blur",
                "ring-1 ring-slate-200/70",
                "dark:bg-slate-950/45 dark:ring-slate-800/60",
                "lg:p-5"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Engine snapshot
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    What Describe does behind the scenes.
                  </p>
                </div>
                <TinyChip>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Stack
                </TinyChip>
              </div>

              <div className="mt-4 space-y-2 text-[11px]">
                {[
                  { dot: "bg-fuchsia-400", title: "Input → intent", body: "Notes + constraints become structured goals." },
                  { dot: "bg-sky-400", title: "Rules enforced", body: "Your instruction profile shapes tone + sections." },
                  { dot: "bg-emerald-400", title: "HTML default", body: "Human-ready output first; JSON for debug." },
                ].map((x) => (
                  <div
                    key={x.title}
                    className="flex items-start gap-3 rounded-2xl bg-slate-50/70 p-3 ring-1 ring-slate-200/70 dark:bg-slate-900/25 dark:ring-slate-800/60"
                  >
                    <div className="mt-[3px] h-6 w-6 rounded-xl bg-white ring-1 ring-slate-200 dark:bg-slate-950 dark:ring-slate-800">
                      <div className={cx("mx-auto mt-[6px] h-3 w-3 rounded-full", x.dot)} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 dark:text-slate-50">
                        {x.title}
                      </div>
                      <div className="mt-0.5 text-slate-600 dark:text-slate-300">
                        {x.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
