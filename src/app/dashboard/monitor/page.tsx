"use client";

import React from "react";
import MonitorDashboard from "@/components/monitor/MonitorDashboard";

/**
 * Monitor page
 *
 * This page composes the existing marketing / overview UI with the interactive
 * MonitorDashboard client component (lists watches, events, manual checks).
 *
 * Drop this file at: src/app/dashboard/monitor/page.tsx
 *
 * Notes:
 * - MonitorDashboard is a client component that calls:
 *   - GET /api/monitor/watches
 *   - POST /api/monitor/watches
 *   - POST /api/monitor/check
 *   - GET /api/monitor/events
 *   Ensure those API routes exist (see src/lib/monitor/core.ts and the api routes).
 * - Keep Clerk server auth configured for POST endpoints (or adapt auth to your stack).
 */

export default function MonitorPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* Ambient background: amber/emerald bias for alerts + health */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-amber-400/24 blur-3xl dark:bg-amber-500/25" />
        <div className="absolute -bottom-40 right-[-10rem] h-80 w-80 rounded-full bg-emerald-400/22 blur-3xl dark:bg-emerald-500/22" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.9)_55%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(2,6,23,0.85)_55%,_rgba(2,6,23,1)_100%)]" />
        <div className="absolute inset-0 opacity-[0.03] mix-blend-soft-light dark:opacity-[0.06]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        {/* COMPACT HEADER / HERO */}
        <section className="mb-4">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            {/* Left: title + description */}
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]" />
                Commerce &amp; Automation · AvidiaMonitor
                <span className="h-1 w-px bg-slate-300 dark:bg-slate-700" />
                <span className="text-amber-600 dark:text-amber-200">Change &amp; alert engine</span>
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
                  AvidiaMonitor continuously watches prices, availability, variants, and key attributes
                  across your sources and catalog. When something important shifts, you get a clear alert—not a surprise.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-[11px]">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/70 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-amber-500/60 dark:bg-slate-950/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Track price, availability, and variant drift over time.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-emerald-500/55 dark:bg-slate-950/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  <span>Trigger alerts via email or webhook when thresholds are crossed.</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-3 py-1.5 text-slate-700 shadow-sm dark:border-slate-700/70 dark:bg-slate-950/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  <span>Keep a full change log for auditing and analytics.</span>
                </div>
              </div>
            </div>

            {/* Right: module status + snapshot */}
            <div className="mt-1 w-full max-w-xs space-y-3 lg:mt-0 lg:max-w-sm">
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-md sm:px-5 dark:border-slate-800 dark:bg-slate-950/90">
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
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50">
                    Watchtower
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  AvidiaMonitor sits on top of your ingests, pricing, and feeds to catch issues early and keep a traceable history.
                </p>
              </div>

              {/* Static monitoring snapshot */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/95 px-4 py-3 shadow-[0_16px_40px_rgba(148,163,184,0.35)] dark:border-slate-800 dark:bg-slate-950/90">
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  Sample monitoring snapshot
                </p>
                <div className="space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Products tracked</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">8,420 SKUs</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Last 24h events</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">1,137 changes</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Alerts triggered</span>
                    <span className="font-medium text-amber-600 dark:text-amber-300">42 alerts</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                    <span className="text-slate-600 dark:text-slate-300">Status</span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/70 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-300/40 dark:text-emerald-200">
                      Healthy · No critical incidents
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
                  The future UI will show trend lines, suppressed noise, and only the changes that matter for revenue and risk.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* BODY: interactive Monitor workspace */}
        <section className="rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-[0_18px_45px_rgba(148,163,184,0.18)] dark:border-slate-800 dark:bg-slate-950/55">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-8">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-300">Monitor workspace</h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Manage watches, inspect recent events, and run checks on-demand. The list below shows configured watches and the most recent events.
              </p>

              <div className="mt-4">
                {/* Interactive dashboard component (client) */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <MonitorDashboard />
                </div>
              </div>
            </div>

            <aside className="lg:col-span-4">
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-950/55">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">Quick actions</h3>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                  Use quick actions to add a watch, run an immediate check, or view the latest event stream.
                </p>

                <div className="mt-3 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500">Add watch</div>
                      <div className="text-xs text-slate-700 dark:text-slate-200">Add a new URL to monitor</div>
                    </div>
                    <a href="#add-watch" className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs border">Add</a>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500">Run check</div>
                      <div className="text-xs text-slate-700 dark:text-slate-200">Trigger a manual check for a selected watch</div>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs border">Check now</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-500">Events</div>
                      <div className="text-xs text-slate-700 dark:text-slate-200">View recent monitor events</div>
                    </div>
                    <a href="#events" className="inline-flex items-center gap-2 rounded px-3 py-1 text-xs border">Open</a>
                  </div>
                </div>

                <div className="mt-4 border-t pt-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="font-medium text-slate-900 dark:text-slate-50">Integrations</div>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-xs">AvidiaPrice</div>
                      <div className="text-xs text-slate-500">Reprice on change</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs">AvidiaAudit</div>
                      <div className="text-xs text-slate-500">Send high-impact changes</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs">AvidiaImport</div>
                      <div className="text-xs text-slate-500">Trigger re-extracts</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-950/40">
                <div className="font-semibold text-slate-900 dark:text-slate-50">Monitor tips</div>
                <ul className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
                  <li>Start with a small seed of key SKUs and vendor pages.</li>
                  <li>Tune frequency: heavy feeds need less frequent checks; product pages can be more frequent.</li>
                  <li>Adjust sensitivity for price vs spec changes to avoid noise.</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
