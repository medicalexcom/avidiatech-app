"use client";

import React from "react";
import NotificationsList from "@/components/monitor/NotificationsList";

/**
 * Monitor Notifications Page (upgraded, consistent with other Monitor pages)
 * Path: src/app/dashboard/monitor/notifications/page.tsx
 */

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function TinyChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "signal";
}) {
  const tones =
    tone === "signal"
      ? "border-amber-200/60 bg-amber-50 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
      : tone === "success"
      ? "border-emerald-200/60 bg-emerald-50 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-100"
      : "border-slate-200/70 bg-white/75 text-slate-600 dark:border-slate-700/70 dark:bg-slate-950/45 dark:text-slate-300";

  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] shadow-sm backdrop-blur whitespace-nowrap",
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
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition active:translate-y-[0.5px] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 dark:focus-visible:ring-offset-slate-950";
  if (variant === "primary") {
    return (
      <a
        href={href}
        className={cx(
          base,
          "text-slate-950 shadow-[0_16px_34px_-22px_rgba(2,6,23,0.55)]",
          "bg-gradient-to-r from-amber-400 via-amber-500 to-orange-500",
          "hover:from-amber-300 hover:via-amber-500 hover:to-orange-400",
          "focus-visible:ring-amber-400/70",
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

export default function MonitorNotificationsPage() {
  return (
    <main className="relative min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      {/* BACKGROUND: blobs + radial wash + subtle grid (clipped to prevent horizontal overflow) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-44 -left-36 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl dark:bg-sky-500/15" />
        <div className="absolute -bottom-44 right-[-12rem] h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-3xl dark:bg-amber-500/14" />
        <div className="absolute top-24 right-12 h-56 w-56 rounded-full bg-emerald-300/12 blur-3xl dark:bg-emerald-500/10" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(248,250,252,0)_0,_rgba(248,250,252,0.92)_58%,_rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(circle_at_top,_rgba(15,23,42,0)_0,_rgba(15,23,42,0.92)_58%,_rgba(15,23,42,1)_100%)]" />

        <div className="absolute inset-0 opacity-[0.045] dark:opacity-[0.065]">
          <div className="h-full w-full bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px),linear-gradient(to_bottom,#e5e7eb_1px,transparent_1px)] bg-[size:46px_46px] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]" />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-4 pt-4 pb-10 sm:px-6 lg:px-8 lg:pt-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-white/80 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-amber-700 shadow-sm backdrop-blur dark:border-amber-400/35 dark:bg-slate-950/55 dark:text-amber-100 whitespace-nowrap">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-amber-400/60 bg-slate-100 dark:border-amber-400/35 dark:bg-slate-900">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500 dark:bg-amber-300" />
                </span>
                Commerce • AvidiaMonitor
              </span>

              <TinyChip tone="success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Notifications
              </TinyChip>

              <TinyChip tone="signal">✨ Rules → Alerts → Triage</TinyChip>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-semibold leading-tight text-slate-900 lg:text-3xl dark:text-slate-50">
                Monitor{" "}
                <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-sky-500 bg-clip-text text-transparent dark:from-amber-300 dark:via-orange-300 dark:to-sky-300">
                  notifications
                </span>
              </h1>
              <p className="max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                App notifications generated by Monitor rules and events. Use Rules
                to control what generates alerts.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SoftButton href="/dashboard/monitor/rules" variant="secondary">
              Manage Rules
            </SoftButton>
            <SoftButton href="/dashboard/monitor" variant="secondary">
              Back to Monitor
            </SoftButton>
            <SoftButton href="/dashboard" variant="primary">
              Dashboard
            </SoftButton>
          </div>
        </header>

        <section className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_14px_40px_-28px_rgba(2,6,23,0.55)] backdrop-blur dark:border-slate-800/60 dark:bg-slate-950/45 overflow-x-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                Inbox
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Mark, review, and act on alerts. Pair this with a simple rule like{" "}
                <span className="font-medium">app_notification</span> on{" "}
                <span className="font-medium">change_detected</span>.
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <TinyChip>
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                Live feed
              </TinyChip>
              <TinyChip>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Rule-driven
              </TinyChip>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200/70 bg-white/70 p-3 shadow-sm dark:border-slate-800/60 dark:bg-slate-950/35 overflow-x-hidden">
            <NotificationsList />

            <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/30 dark:text-slate-300">
              <div className="font-semibold text-slate-700 dark:text-slate-200">
                Quick tip
              </div>
              <div className="mt-1">
                If you see no notifications, create a watch and enable a simple
                rule (e.g.,{" "}
                <span className="font-medium">app_notification</span> on{" "}
                <span className="font-medium">change_detected</span>), then trigger
                a check.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
