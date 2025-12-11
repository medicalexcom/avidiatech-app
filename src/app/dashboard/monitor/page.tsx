"use client";

/**
 * AvidiaMonitor module page
 *
 * AvidiaMonitor tracks changes to your products and sources over time.
 * It watches price, availability, attributes, and feed health—then notifies
 * you of significant changes and keeps a full history for analytics.
 */

export default function MonitorPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background: amber/emerald bias for alerts + health */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-400/24 blur-3xl dark:bg-amber-500/25" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-400/22 blur-3xl dark:bg-emerald-500/22" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.9)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* COMPACT HEADER / HERO (Cluster-style) */}
        <section className="mb-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: title + description */}
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/90 dark:text-slate-300">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                Commerce &amp; Automation · AvidiaMonitor
                <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-amber-600 dark:text-amber-200">
                  Change &amp; alert engine
                </span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-50">
                  Stay ahead of{" "}
                  <span className="bg-gradient-to-r from-amber-400 via-amber-300 to-emerald-300 bg-clip-text text-transparent dark:from-amber-300 dark:via-amber-200 dark:to-emerald-200">
                    every product change
                  </span>{" "}
                  before it hits your store.
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  AvidiaMonitor continuously watches prices, availability, variants, and
                  key attributes across your sources and catalog. When something important
                  shifts, you get a clear alert—not a surprise from angry customers or
                  broken margins.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/70 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-amber-500/60 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Track price, availability, and variant drift over time.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-emerald-500/55 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>
                    Trigger alerts via email or webhook when thresholds are crossed.
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90 dark:text-slate-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>Keep a full change log for auditing and analytics.</span>
                </div>
              </div>
            </div>

            {/* Right: module status + snapshot */}
            <div className="mt-1 w-full max-w-xs space-y-3 lg:mt-0 lg:max-w-sm">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md shadow-slate-200/70 dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-none sm:px-5 sm:py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                      Module status
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="inline-flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.9)]" />
                      <span className="text-sm font-semibold text-amber-700 dark:text-amber-200">
                        Monitoring rules drafted · Event stream in progress
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    Watchtower
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  AvidiaMonitor will sit on top of your ingests, pricing, and feeds to
                  catch issues early and keep a traceable history of what changed.
                </p>
              </div>

              {/* Static monitoring snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-[0_16px_40px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-950/90 dark:shadow-[0_16px_40px_rgba(15,23,42,0.75)]">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Sample monitoring snapshot
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Products tracked
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      8,420 SKUs
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Last 24h events
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      1,137 changes
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">
                      Alerts triggered
                    </span>
                    <span className="font-medium text-amber-600 dark:text-amber-300">
                      42 alerts
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-400/80 dark:bg-emerald-500/10 dark:text-emerald-200">
                      Healthy · No critical incidents
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-500">
                  The future UI will show trend lines, suppressed noise, and only the
                  changes that matter for revenue and risk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: two-column layout */}
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1.1fr)]">
          {/* LEFT: what it does / value */}
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.35)] sm:p-5 dark:border-slate-800 dark:bg-slate-900/85 dark:shadow-[0_18px_45px_rgba(15,23,42,0.7)]">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Continuous monitoring for a living catalog
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                AvidiaMonitor understands that product data is never static. Suppliers
                change specs, prices move, variants appear and disappear. Instead of
                finding out after the fact, you get a continuous feed of changes tied to
                the same normalized product model the rest of AvidiaTech uses.
              </p>

              <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>
                    Tracks{" "}
                    <span className="font-medium">
                      price, availability, and attribute changes
                    </span>{" "}
                    across your catalog and inbound feeds.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>
                    Schedules <span className="font-medium">periodic crawls</span> or feed
                    checks to detect newly added, removed, or renamed variants.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>
                    Notifies you of significant changes via{" "}
                    <span className="font-medium">
                      email, webhooks, or future in-app alerts
                    </span>{" "}
                    instead of manual spot checks.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>
                    Maintains a <span className="font-medium">time-stamped change history</span>{" "}
                    for auditing, rollback decisions, and performance analytics.
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Monitoring scenarios AvidiaMonitor supports
              </h3>
              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300">
                    Margin &amp; price drift
                  </div>
                  <p className="mt-1.5">
                    Watch for supplier cost changes that push your margins below target, or
                    detect competitor price moves (via future connectors) that warrant a
                    review.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-500 dark:text-amber-300">
                    Catalog stability
                  </div>
                  <p className="mt-1.5">
                    See when variants disappear, specs shift, or manuals change so you can
                    re-run AvidiaSEO, Audit, or Import before anything breaks downstream.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: workflow + integrations */}
          <div className="space-y-4">
            {/* Workflow */}
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">
                Planned workflow · how AvidiaMonitor will run
              </h2>
              <ol className="mt-3 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-600 dark:bg-slate-800 dark:text-amber-300">
                    1
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Choose what and where to watch
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Select brands, categories, or feeds to monitor. Configure which
                      fields matter most: price, availability, specs, variants, or SEO
                      content.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-600 dark:bg-slate-800 dark:text-amber-300">
                    2
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Define thresholds &amp; alert rules
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Set rules like &quot;alert me if price changes &gt; 5%&quot; or
                      &quot;notify when a variant goes out of stock in all sizes&quot; and
                      choose email, webhook, or Slack (future) as destinations.
                    </p>
                  </div>
                </li>
                <li className="flex gap-3">
                  <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-amber-600 dark:bg-slate-800 dark:text-amber-300">
                    3
                  </div>
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Review events &amp; act quickly
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Use the Monitor workspace to filter changes by severity, product, or
                      source. From there, jump directly into Pricing, Audit, or Import to
                      respond.
                    </p>
                  </div>
                </li>
              </ol>

              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-[0_12px_32px_rgba(251,191,36,0.55)] hover:bg-amber-400 disabled:opacity-70"
                  disabled
                >
                  Monitor workspace (coming soon)
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  The Monitor workspace will surface time-series views, alert histories, and
                  deep links into affected products and batches.
                </p>
              </div>
            </div>

            {/* Integrations */}
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                Planned integrations
              </h3>
              <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaExtract &amp; Feeds
                  </span>{" "}
                  — monitor upstream changes from manufacturers and supplier feeds before
                  they impact your store.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaPrice
                  </span>{" "}
                  — re-run pricing on impacted SKUs when costs or competitors change.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    AvidiaAudit
                  </span>{" "}
                  — flag when spec or content changes should trigger new audits or
                  auto-heal.
                </li>
                <li>
                  •{" "}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Import / Export
                  </span>{" "}
                  — block or re-queue exports when critical monitoring rules are violated.
                </li>
              </ul>
              <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-500">
                Over time, AvidiaMonitor becomes your early-warning system: it doesn&apos;t
                just show you the catalog—you see how it’s moving and where to intervene.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
