"use client";

import React from "react";
import Link from "next/link";
import { useIntegrations } from "@/hooks/useIntegrations";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function IntegrationStatus() {
  const { activeIntegrations, loading } = useIntegrations();

  const connected = (activeIntegrations?.length ?? 0) > 0;
  const first =
    activeIntegrations && activeIntegrations.length > 0 ? activeIntegrations[0] : null;

  const providerLabel =
    (first?.platform ?? first?.provider ?? first?.name ?? "").toString().trim();

  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border shadow-sm transition",
        "bg-white/80 dark:bg-slate-900/70",
        "backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/55",
        !loading && !connected && "hover:shadow-md hover:-translate-y-[1px]",
        !loading && !connected && "hover:ring-1 hover:ring-sky-500/25"
      )}
    >
      {/* accent line */}
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-x-0 top-0 h-0.5",
          loading
            ? "bg-gradient-to-r from-slate-300/80 via-slate-200/60 to-slate-300/80 dark:from-slate-700/80 dark:via-slate-800/60 dark:to-slate-700/80"
            : connected
            ? "bg-gradient-to-r from-emerald-500/70 via-sky-500/70 to-violet-500/70"
            : "bg-gradient-to-r from-rose-500/70 via-amber-500/70 to-sky-500/70"
        )}
      />

      <div className="flex items-center gap-4 p-4">
        {/* status icon */}
        <div
          className={cx(
            "grid h-10 w-10 place-items-center rounded-xl border",
            loading
              ? "bg-slate-50 border-slate-200 dark:bg-slate-950/25 dark:border-slate-800"
              : connected
              ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900/60"
              : "bg-rose-50 border-rose-200 dark:bg-rose-950/35 dark:border-rose-900/60"
          )}
        >
          <span
            className={cx(
              "h-2.5 w-2.5 rounded-full",
              loading
                ? "bg-slate-300 dark:bg-slate-600"
                : connected
                ? "bg-emerald-500"
                : "bg-rose-500"
            )}
          />
        </div>

        {/* text */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {loading ? "Checking integrations…" : connected ? "Store connected" : "No store connected"}
            </span>

            {!loading ? (
              <span
                className={cx(
                  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium border",
                  connected
                    ? "text-emerald-700 border-emerald-200 bg-emerald-50 dark:text-emerald-300 dark:border-emerald-900/60 dark:bg-emerald-950/35"
                    : "text-rose-700 border-rose-200 bg-rose-50 dark:text-rose-300 dark:border-rose-900/60 dark:bg-rose-950/30"
                )}
              >
                {connected ? "LIVE" : "SETUP"}
              </span>
            ) : null}
          </div>

          <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400/70 dark:bg-slate-600/80" />
                Verifying connection status
              </span>
            ) : connected ? (
              <span className="inline-flex flex-wrap items-center gap-2">
                <span>Active:</span>
                {providerLabel ? (
                  <span className="inline-flex max-w-[260px] items-center truncate rounded-full border px-2 py-0.5 text-[11px] bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950/30 dark:text-slate-200 dark:border-slate-800">
                    {providerLabel}
                  </span>
                ) : (
                  <span className="text-slate-500 dark:text-slate-500">Unknown provider</span>
                )}
              </span>
            ) : (
              "Connect a store to start importing products."
            )}
          </div>
        </div>

        {/* single CTA */}
        <div className="ml-auto">
          <Link
            href="/integrations"
            className={cx(
              "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-semibold",
              "bg-sky-600 text-white hover:bg-sky-700",
              "shadow-sm shadow-sky-600/10",
              "focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            )}
            aria-label="Manage integrations"
          >
            Manage integrations
          </Link>
        </div>
      </div>
    </div>
  );
}
