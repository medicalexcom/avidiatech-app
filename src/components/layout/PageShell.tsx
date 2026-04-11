"use client";

import * as React from "react";
import clsx from "clsx";

// ─── Ambient glow presets ─────────────────────────────────────────────────────
type GlowPreset = "cyan" | "fuchsia" | "emerald" | "violet" | "amber" | "rose" | "sky" | "neutral";

const glowMap: Record<GlowPreset, { a: string; b: string }> = {
  cyan:    { a: "bg-cyan-300/20 dark:bg-cyan-500/10",    b: "bg-emerald-300/15 dark:bg-emerald-500/8" },
  fuchsia: { a: "bg-fuchsia-300/18 dark:bg-fuchsia-500/10", b: "bg-pink-300/12 dark:bg-pink-500/8" },
  emerald: { a: "bg-emerald-300/20 dark:bg-emerald-500/10", b: "bg-teal-300/12 dark:bg-teal-500/8" },
  violet:  { a: "bg-violet-300/20 dark:bg-violet-500/10",  b: "bg-indigo-300/12 dark:bg-indigo-500/8" },
  amber:   { a: "bg-amber-300/18 dark:bg-amber-500/10",   b: "bg-yellow-300/12 dark:bg-yellow-500/8" },
  rose:    { a: "bg-rose-300/18 dark:bg-rose-500/10",     b: "bg-pink-300/12 dark:bg-pink-500/8" },
  sky:     { a: "bg-sky-300/20 dark:bg-sky-500/10",       b: "bg-cyan-300/12 dark:bg-cyan-500/8" },
  neutral: { a: "bg-slate-300/10 dark:bg-slate-500/6",    b: "bg-slate-300/8 dark:bg-slate-500/4" },
};

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  kicker?: string;
  title: React.ReactNode;
  description?: string;
  right?: React.ReactNode;
  dot?: string;          // Tailwind bg class for animated dot
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  kicker,
  title,
  description,
  right,
  dot,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={clsx("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {/* Kicker row */}
        {(kicker || badge) && (
          <div className="flex flex-wrap items-center gap-2">
            {kicker && (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
                {dot && (
                  <span className="relative flex h-[7px] w-[7px] shrink-0">
                    <span className={clsx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-50", dot)} />
                    <span className={clsx("relative h-[7px] w-[7px] rounded-full", dot)} />
                  </span>
                )}
                <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {kicker}
                </span>
              </div>
            )}
            {badge}
          </div>
        )}

        {/* Title */}
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
          {title}
        </h1>

        {/* Description */}
        {description && (
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {/* Right slot */}
      {right && (
        <div className="flex shrink-0 items-start gap-2">
          {right}
        </div>
      )}
    </div>
  );
}

// ─── PageShell ────────────────────────────────────────────────────────────────
interface PageShellProps {
  children: React.ReactNode;
  glow?: GlowPreset;
  className?: string;
  /** Override max-width. Default: max-w-7xl */
  maxWidth?: string;
  /** Inner content padding. Default: standard responsive */
  noPad?: boolean;
}

/**
 * PageShell — consistent page wrapper for all dashboard module pages.
 *
 * Provides:
 * - Full height fill (no white gap)
 * - Subtle ambient glow + grid background
 * - Consistent padding + max-width
 * - Dark / light mode aware
 *
 * Usage:
 *   <PageShell glow="cyan">
 *     <PageHeader kicker="Extract" title="AvidiaExtract" description="..." />
 *     ...content...
 *   </PageShell>
 */
export default function PageShell({
  children,
  glow = "neutral",
  className,
  maxWidth = "max-w-7xl",
  noPad = false,
}: PageShellProps) {
  const { a, b } = glowMap[glow];

  return (
    <div className="relative flex min-h-full w-full flex-col">
      {/* ── Ambient background decorations ─────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Glow blobs */}
        <div className={clsx("absolute -left-32 -top-32 h-[380px] w-[380px] rounded-full blur-[90px]", a)} />
        <div className={clsx("absolute -bottom-32 right-[-6rem] h-[320px] w-[320px] rounded-full blur-[80px]", b)} />

        {/* Fine grid */}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right,rgba(100,116,139,0.08) 1px,transparent 1px)," +
              "linear-gradient(to bottom,rgba(100,116,139,0.08) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Vignette fade */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,rgba(248,250,252,0.7)_60%,rgba(248,250,252,1)_100%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,transparent_0%,rgba(2,6,23,0.7)_60%,rgba(2,6,23,1)_100%)]" />
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <div
        className={clsx(
          "relative z-10 mx-auto w-full flex-1",
          maxWidth,
          !noPad && "space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
