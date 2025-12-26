// src/app/dashboard/describe/page.tsx

import React from "react";
import Script from "next/script";
import DescribeForm from "@/components/describe/DescribeForm";
import DescribeOutput from "@/components/describe/DescribeOutput";

/**
 * /dashboard/describe
 *
 * Goals:
 * - Inputs immediately accessible at the top (Import-style)
 * - Output preview lives below, left side (primary workspace)
 * - Right rail carries guidance + engine snapshot (premium, compact, aligned)
 * - No extra page-level scroll containers; rely on normal page scroll
 * - Avoid overflow clipping that can make the page feel “paralyzed”
 */

export const dynamic = "force-dynamic";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type StatTone = "fuchsia" | "sky" | "emerald" | "amber";

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
  tone?: StatTone;
}) {
  const toneMap: Record<
    StatTone,
    { border: string; wash: string; glowA: string; glowB: string; top: string }
  > = {
    fuchsia: {
      border: "border-fuchsia-200/70 dark:border-fuchsia-500/20",
      wash: "from-fuchsia-500/10 via-fuchsia-500/0 to-transparent dark:from-fuchsia-400/10 dark:via-fuchsia-400/0",
      glowA: "bg-fuchsia-400/16 dark:bg-fuchsia-500/12",
      glowB: "bg-pink-400/10 dark:bg-pink-500/10",
      top: "from-fuchsia-400/55 via-fuchsia-300/20 to-transparent dark:from-fuchsia-300/35 dark:via-fuchsia-300/15",
    },
    sky: {
      border: "border-sky-200/70 dark:border-sky-500/20",
      wash: "from-sky-500/10 via-sky-500/0 to-transparent dark:from-sky-400/10 dark:via-sky-400/0",
      glowA: "bg-sky-400/16 dark:bg-sky-500/12",
      glowB: "bg-indigo-400/10 dark:bg-indigo-500/10",
      top: "from-sky-400/55 via-sky-300/20 to-transparent dark:from-sky-300/35 dark:via-sky-300/15",
    },
    emerald: {
      border: "border-emerald-200/70 dark:border-emerald-500/20",
      wash: "from-emerald-500/10 via-emerald-500/0 to-transparent dark:from-emerald-400/10 dark:via-emerald-400/0",
      glowA: "bg-emerald-400/14 dark:bg-emerald-500/12",
      glowB: "bg-cyan-400/10 dark:bg-cyan-500/10",
      top: "from-emerald-400/55 via-emerald-300/20 to-transparent dark:from-emerald-300/35 dark:via-emerald-300/15",
    },
    amber: {
      border: "border-amber-200/70 dark:border-amber-500/20",
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
        "group relative overflow-hidden rounded-2xl border bg-white/88 p-4",
        "shadow-[0_10px_30px_-20px_rgba(2,6,23,0.35)] backdrop-blur-xl",
        "dark:bg-slate-950/45",
        t.border
      )}
    >
      <div
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r",
          t.top
        )}
      />
      <div className={cx("pointer-events-none absolute inset-0 bg-gradient-to-br", t.wash)} />
      <div
        className={cx(
          "pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full blur-2xl",
          t.glowA
        )}
      />
      <div
        className={cx(
          "pointer-events-none absolute -left-10 -bottom-12 h-28 w-28 rounded-full blur-2xl",
          t.glowB
        )}
      />

      <div className="relative">
        <div className="text-[13px] font-semibold leading-none text-slate-900 dark:text-slate-50">
          <span className="block truncate whitespace-nowrap">{title}</span>
        </div>
        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="text-[28px] font-semibold leading-none tracking-tight text-slate-900 dark:text-slate-50">
            {value}
          </div>
        </div>
        {caption ? (
          <div className="mt-2 text-[11px] leading-none text-slate-500 dark:text-slate-400">
            <span className="block truncate whitespace-nowrap">{caption}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function DescribePage() {
  return (
    <main className="relative min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Background: premium glows + subtle grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-500/14" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/14" />
        <div className="absolute top-24 right-10 h-56 w-56 rounded-full bg-amber-300/12 blur-3xl dark:bg-amber-500/10" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
        {/* HERO + INPUT */}
        <section className="rounded-[28px] bg-gradient-to-r from-fuchsia-200/60 via-pink-200/35 to-sky-200/55 p-[1px] shadow-[0_18px_55px_-35px_rgba(2,6,23,0.55)] dark:from-fuchsia-500/22 dark:via-pink-500/14 dark:to-sky-500/18 dark:shadow-[0_18px_55px_-35px_rgba(0,0,0,0.75)]">
          <div className="rounded-[27px] border border-white/50 bg-white/75 p-4 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/50 lg:p-5">
            {/* top strip */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-fuchsia-700 shadow-sm backdrop-blur dark:border-fuchsia-400/30 dark:bg-slate-950/55 dark:text-fuchsia-100">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-fuchsia-400/60 bg-slate-100 dark:border-fuchsia-400/30 dark:bg-slate-900">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                  </span>
                  Content • AvidiaDescribe
                </span>

                <TinyChip tone="success">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Render + GPT • Instructioned
                </TinyChip>

                <TinyChip tone="signal">✨ Notes → store-ready page</TinyChip>
              </div>

              <div className="flex flex-wrap gap-2 lg:justify-end">
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
            </div>

            {/* main hero row */}
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.15fr),minmax(0,0.85fr)] lg:items-start">
              {/* LEFT */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                    Describe the product in{" "}
                    <span className="bg-gradient-to-r from-fuchsia-500 via-pink-500 to-sky-500 bg-clip-text text-transparent dark:from-fuchsia-300 dark:via-pink-300 dark:to-sky-300">
                      your own words
                    </span>
                    . We turn it into a store-ready page.
                  </h1>
                  <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                    Start with a name, short context, and a few real constraints. AvidiaDescribe runs
                    your custom instruction profile and returns SEO-ready copy that stays consistent
                    across brands, categories, and channels.
                  </p>
                </div>

                {/* INPUTS */}
                <div
                  id="describe-input"
                  className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-30px_rgba(2,6,23,0.45)] dark:border-slate-800/60 dark:bg-slate-950/45"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <TinyChip tone="brand">
                          <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                          Describe input
                        </TinyChip>
                        <TinyChip>Name • short context • constraints</TinyChip>
                      </div>
                      <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300">
                        Be specific. Mention audience, do/don’t claims, warranty/disclaimer rules,
                        and what must appear in the output.
                      </p>
                    </div>

                    <TinyChip tone="success">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Ready for output
                    </TinyChip>
                  </div>

                  <div className="mt-3">
                    <DescribeForm />
                  </div>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/45">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                        Quick flow
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Keep it fast, consistent, and usable downstream.
                      </p>
                    </div>
                    <TinyChip tone="brand">
                      <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500 dark:bg-fuchsia-300" />
                      Guide
                    </TinyChip>
                  </div>

                  <div className="mt-3 space-y-2 text-[11px]">
                    {[
                      {
                        n: "1",
                        tone: "border-fuchsia-400/50 text-fuchsia-700 dark:text-fuchsia-200",
                        label: "Fill the inputs",
                        body: "Name + short context + constraints you actually care about.",
                      },
                      {
                        n: "2",
                        tone: "border-sky-400/50 text-sky-700 dark:text-sky-200",
                        label: "Review the preview",
                        body: "Check structure, claims, disclaimers, and tone fidelity.",
                      },
                      {
                        n: "3",
                        tone: "border-emerald-400/50 text-emerald-700 dark:text-emerald-200",
                        label: "Send downstream",
                        body: "Reuse the output in SEO, Import, or exporters.",
                      },
                    ].map((s) => (
                      <div
                        key={s.n}
                        className="flex items-start gap-2 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30"
                      >
                        <div
                          className={cx(
                            "mt-[1px] flex h-6 w-6 items-center justify-center rounded-lg border bg-white dark:bg-slate-950",
                            s.tone
                          )}
                        >
                          <span className="text-[12px] font-semibold">{s.n}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-slate-50">
                            {s.label}
                          </div>
                          <div className="mt-0.5 text-slate-600 dark:text-slate-300">
                            {s.body}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl border border-sky-200/70 bg-white/80 p-4 text-[11px] text-slate-700 shadow-sm dark:border-sky-500/25 dark:bg-slate-950/45 dark:text-slate-100">
                    <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Example input
                    </div>
                    <div className="mt-2 leading-relaxed">
                      “Lightweight aluminum walker with wheels, small apartments, highlight
                      stability and safe use; include warranty + no medical claims.”
                    </div>
                  </div>

                  <div className="rounded-2xl border border-emerald-200/70 bg-white/80 p-4 text-[11px] text-slate-700 shadow-sm dark:border-emerald-500/25 dark:bg-slate-950/45 dark:text-slate-100">
                    <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Typical output
                    </div>
                    <ul className="mt-2 list-inside list-disc space-y-1">
                      <li>Clean H1 + scannable sections</li>
                      <li>Benefit-first bullets (not fluff)</li>
                      <li>Compliance-safe disclaimers</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* compact “stats” row */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Input length" tone="fuchsia" value="Short" caption="Works from tiny prompts" />
              <StatCard title="Output shape" tone="sky" value="Structured" caption="Headers, bullets, meta" />
              <StatCard title="Rule fidelity" tone="emerald" value="Locked" caption="Custom instructions enforced" />
              <StatCard title="Time to draft" tone="amber" value="Fast" caption="Designed for throughput" />
            </div>
          </div>
        </section>

        {/* WORKSPACE */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-8">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_46px_-30px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TinyChip tone="success">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Live canvas
                    </TinyChip>
                    <TinyChip>HTML + structured payload</TinyChip>
                  </div>
                  <h2 className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Preview results
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    This is what ships — sections, bullets, disclaimers, and SEO behavior included.
                  </p>
                </div>

                <div className="hidden shrink-0 sm:flex">
                  <SoftButton href="/dashboard/seo" variant="secondary" className="px-3 py-1.5 text-xs">
                    Send to SEO ↗
                  </SoftButton>
                </div>
              </div>

              {/* One-scroll rule:
                  - By default, viewport owns the single scroll.
                  - If HTML viewer insists on an inner scroll (e.g., iframe), we flip so ONLY the inner scroll remains.
               */}
              <style>{`
                /* Small fixed window */
                [data-describe-preview] [data-preview-viewport] {
                  max-height: 60vh;
                }

                /* Who owns the ONE scrollbar? */
                [data-describe-preview][data-preview-scroll="viewport"] [data-preview-viewport] {
                  overflow-y: auto;
                  overflow-x: hidden;
                }
                [data-describe-preview][data-preview-scroll="inner"] [data-preview-viewport] {
                  overflow: hidden; /* kill the outside scrollbar */
                }

                /* Styled + HTML (when viewport owns scroll): remove nested scrollbars */
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] .overflow-auto,
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] .overflow-y-auto,
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] .overflow-x-auto,
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] pre,
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] textarea,
                [data-describe-preview][data-preview-mode="styled"][data-preview-scroll="viewport"] iframe,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] .overflow-auto,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] .overflow-y-auto,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] .overflow-x-auto,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] pre,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] textarea,
                [data-describe-preview][data-preview-mode="html"][data-preview-scroll="viewport"] iframe {
                  overflow: visible !important;
                  max-height: none !important;
                  height: auto !important;
                }

                /* Remove “extra frame” look in Styled/HTML */
                [data-describe-preview][data-preview-mode="styled"] pre,
                [data-describe-preview][data-preview-mode="styled"] textarea,
                [data-describe-preview][data-preview-mode="styled"] code,
                [data-describe-preview][data-preview-mode="styled"] iframe,
                [data-describe-preview][data-preview-mode="html"] pre,
                [data-describe-preview][data-preview-mode="html"] textarea,
                [data-describe-preview][data-preview-mode="html"] code,
                [data-describe-preview][data-preview-mode="html"] iframe {
                  border: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                }

                /* Raw JSON: contained; allow internal code block scroll if needed */
                [data-describe-preview][data-preview-mode="raw"][data-preview-scroll="viewport"] pre,
                [data-describe-preview][data-preview-mode="raw"][data-preview-scroll="viewport"] textarea {
                  overflow: auto !important;
                  border: 0 !important;
                  box-shadow: none !important;
                  outline: none !important;
                }
              `}</style>

              <div
                className="mt-4"
                data-describe-preview
                data-preview-mode="html"
                data-preview-scroll="viewport"
              >
                <div data-preview-viewport>
                  <DescribeOutput />
                </div>
              </div>

              <Script id="describe-preview-single-scroll-html" strategy="afterInteractive">
                {`
                  (function () {
                    var root = document.querySelector('[data-describe-preview]');
                    if (!root) return;

                    var state = window.__AVIDIA_DESCRIBE_PREVIEW_STATE || {
                      userToggled: false,
                      lastTablist: null
                    };
                    window.__AVIDIA_DESCRIBE_PREVIEW_STATE = state;

                    function viewportEl() {
                      return root.querySelector('[data-preview-viewport]') || null;
                    }

                    function textOf(el) {
                      return ((el && (el.textContent || el.innerText)) || '').trim();
                    }

                    function isActiveTab(el) {
                      if (!el) return false;
                      var aria = el.getAttribute && el.getAttribute('aria-selected');
                      if (aria === 'true') return true;
                      var cls = (el.className || '').toString();
                      return /active|selected|current/i.test(cls);
                    }

                    function findTabs() {
                      var candidates = Array.prototype.slice.call(
                        root.querySelectorAll('button,[role="tab"],a')
                      );

                      var htmlTab =
                        candidates.find(function (b) { return /html\\s*viewer/i.test(textOf(b)); }) ||
                        candidates.find(function (b) {
                          var t = textOf(b);
                          return /\\bhtml\\b/i.test(t) && !/styled/i.test(t) && !/json/i.test(t);
                        });

                      var styledTab =
                        candidates.find(function (b) { return /^\\s*styled\\s*$/i.test(textOf(b)) || /\\bstyled\\b/i.test(textOf(b)); });

                      var rawTab =
                        candidates.find(function (b) { return /raw\\s*json/i.test(textOf(b)); }) ||
                        candidates.find(function (b) { return (/\\bjson\\b/i.test(textOf(b)) && /raw/i.test(textOf(b))); }) ||
                        candidates.find(function (b) { return /^\\s*json\\s*$/i.test(textOf(b)); });

                      var active = candidates.find(function (b) { return isActiveTab(b); });

                      return { candidates: candidates, htmlTab: htmlTab, styledTab: styledTab, rawTab: rawTab, active: active };
                    }

                    function inferMode(activeTabText) {
                      var t = (activeTabText || '').toLowerCase();
                      if (t.includes('raw') || t.includes('json')) return 'raw';
                      if (t.includes('styled')) return 'styled';
                      if (t.includes('html')) return 'html';
                      return 'html';
                    }

                    function bindUserToggleHandlers(tabs) {
                      tabs.forEach(function (b) {
                        try {
                          if (!b || b.dataset.__avidiaBound) return;
                          b.dataset.__avidiaBound = "1";
                          b.addEventListener('click', function () {
                            state.userToggled = true;
                          }, { passive: true });
                        } catch (e) {}
                      });
                    }

                    function getTablistEl() {
                      return root.querySelector('[role="tablist"]') || null;
                    }

                    function setAttr(name, val) {
                      try { root.setAttribute(name, val); } catch (e) {}
                    }

                    function setDefaultToHtmlIfNeeded(tabInfo) {
                      var tablist = getTablistEl();
                      if (tablist && tablist !== state.lastTablist) {
                        state.lastTablist = tablist;
                        state.userToggled = false;
                      }
                      if (!state.userToggled && tabInfo.htmlTab && !isActiveTab(tabInfo.htmlTab)) {
                        try { tabInfo.htmlTab.click(); } catch (e) {}
                      }
                    }

                    function resizeSameOriginIframes() {
                      var iframes = root.querySelectorAll('iframe');
                      iframes.forEach(function (ifr) {
                        try {
                          var doc = ifr.contentDocument;
                          if (!doc) return;
                          var h = Math.max(
                            doc.documentElement ? doc.documentElement.scrollHeight : 0,
                            doc.body ? doc.body.scrollHeight : 0
                          );
                          if (h && isFinite(h)) {
                            ifr.style.height = h + 'px';
                            ifr.style.maxHeight = 'none';
                            ifr.style.overflow = 'visible';
                            ifr.style.border = '0';
                            ifr.style.boxShadow = 'none';
                          }
                        } catch (e) {
                          // cross-origin: cannot measure; ignore
                        }
                      });
                    }

                    function stripNestedScrollForViewportOwner(mode) {
                      // When viewport owns scroll, remove nested scrolling so only ONE scrollbar remains.
                      if (!(mode === 'styled' || mode === 'html')) return;

                      var nodes = root.querySelectorAll('.overflow-auto,.overflow-y-auto,.overflow-x-auto,pre,textarea,iframe,[style*="overflow"]');
                      nodes.forEach(function (el) {
                        try {
                          // If it's clearly a scrolling container, neutralize it.
                          var st = window.getComputedStyle(el);
                          var oy = st.overflowY;
                          var ox = st.overflowX;
                          var isScrollableY = (oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1;
                          var isScrollableX = (ox === 'auto' || ox === 'scroll') && el.scrollWidth > el.clientWidth + 1;

                          if (isScrollableY) {
                            el.style.overflowY = 'visible';
                            el.style.maxHeight = 'none';
                            el.style.height = 'auto';
                          }
                          if (isScrollableX) {
                            el.style.overflowX = 'visible';
                          }

                          el.style.border = '0';
                          el.style.boxShadow = 'none';
                          el.style.outline = 'none';
                        } catch (e) {}
                      });

                      // Best-effort: make same-origin iframes expand so they don't scroll internally
                      resizeSameOriginIframes();
                    }

                    function detectAnyRemainingInnerScroll() {
                      // If any inner element still has a vertical scrollbar, we switch ownership to "inner"
                      // so the viewport itself doesn't add a second scrollbar.
                      try {
                        var vp = viewportEl();
                        if (!vp) return false;

                        // Consider likely scroll hosts inside the viewport.
                        var candidates = vp.querySelectorAll('iframe,pre,textarea,code,div,section,article');
                        for (var i = 0; i < candidates.length; i++) {
                          var el = candidates[i];
                          if (!el || el === vp) continue;

                          // Skip tiny elements to avoid noise.
                          if (el.clientHeight < 80) continue;

                          var st = window.getComputedStyle(el);
                          var oy = st.overflowY;

                          // iframe: even if computed overflow isn't "auto", it can still scroll internally.
                          if (el.tagName === 'IFRAME') {
                            // If iframe height is constrained relative to its box, assume it can scroll.
                            // (We cannot reliably detect cross-origin iframe scrollbars.)
                            if (el.clientHeight >= 120) return true;
                            continue;
                          }

                          if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
                            return true;
                          }
                        }
                      } catch (e) {}
                      return false;
                    }

                    function applySingleScroll(mode) {
                      // Default: viewport owns the single scrollbar.
                      setAttr('data-preview-scroll', 'viewport');

                      // Raw JSON: keep viewport scroll and allow code block to scroll if needed.
                      if (mode === 'raw') {
                        setAttr('data-preview-scroll', 'viewport');
                        return;
                      }

                      // Styled: always viewport-owned (your Styled is already perfect).
                      if (mode === 'styled') {
                        setAttr('data-preview-scroll', 'viewport');
                        stripNestedScrollForViewportOwner(mode);
                        return;
                      }

                      // HTML:
                      // 1) Try to remove inner scrollbars so viewport is the only one.
                      // 2) If an inner scrollbar still exists (often due to iframe), switch ownership to inner.
                      if (mode === 'html') {
                        setAttr('data-preview-scroll', 'viewport');
                        stripNestedScrollForViewportOwner(mode);

                        var hasInner = detectAnyRemainingInnerScroll();
                        if (hasInner) {
                          // Kill outer scroll so ONLY the inner scroll remains.
                          setAttr('data-preview-scroll', 'inner');
                        }
                      }
                    }

                    function run() {
                      var t = findTabs();
                      bindUserToggleHandlers(t.candidates);

                      setDefaultToHtmlIfNeeded(t);

                      t = findTabs();
                      var mode = inferMode(textOf(t.active));
                      setAttr('data-preview-mode', mode);

                      applySingleScroll(mode);
                    }

                    run();

                    var mo = new MutationObserver(function () { run(); });
                    mo.observe(root, { childList: true, subtree: true });

                    window.addEventListener('resize', function () { run(); });
                  })();
                `}
              </Script>
            </div>
          </div>

          <aside className="space-y-4 lg:col-span-4">
            <div className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    Describe engine snapshot
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    How Describe turns notes into consistent, shippable output.
                  </p>
                </div>
                <TinyChip>
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Stack
                </TinyChip>
              </div>

              <div className="mt-4 space-y-2 text-[11px]">
                {[
                  {
                    dot: "bg-fuchsia-400",
                    title: "Input channel",
                    body: "Short notes, specs, selling points, constraints, compliance hints.",
                  },
                  {
                    dot: "bg-sky-400",
                    title: "Instruction profile",
                    body: "Locks to your global rules: tone, sections, SEO meta, disclaimers.",
                  },
                  {
                    dot: "bg-emerald-400",
                    title: "Output canvas",
                    body: "Structured HTML + payload you can export or feed into other modules.",
                  },
                ].map((x) => (
                  <div
                    key={x.title}
                    className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 dark:border-slate-800/60 dark:bg-slate-900/30"
                  >
                    <div className="mt-[2px] flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                      <span className={cx("h-3 w-3 rounded-full", x.dot)} />
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

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200/70 bg-white/75 p-3 text-[11px] shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Output includes
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700 dark:text-slate-200">
                    <li>H1 + sections</li>
                    <li>Bullets</li>
                    <li>Meta behavior</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200/70 bg-white/75 p-3 text-[11px] shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Designed for
                  </div>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-slate-700 dark:text-slate-200">
                    <li>Product pages</li>
                    <li>Imports</li>
                    <li>Downstream SEO</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200/70 bg-white/80 p-4 text-[11px] text-slate-700 shadow-sm dark:border-amber-500/25 dark:bg-slate-950/45 dark:text-slate-100">
              <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Quality checklist
              </div>
              <ul className="mt-2 list-inside list-disc space-y-1">
                <li>No medical claims unless allowed</li>
                <li>Warranty/disclaimer included when required</li>
                <li>Scannable sections + clean bullets</li>
                <li>Meta behavior respects length caps</li>
              </ul>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
