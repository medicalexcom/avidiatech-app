"use client";

import * as React from "react";
import clsx from "clsx";

// ─── Glow Presets ─────────────────────────────────────────────────────────────
export type GlowPreset =
  | "cyan" | "fuchsia" | "emerald" | "violet" | "amber"
  | "rose"  | "sky"     | "neutral" | "indigo"  | "orange"
  | "teal"  | "coral";

interface GlowConfig {
  /** Top-left corner glow blob */
  a: string;
  /** Bottom-right corner glow blob */
  b: string;
  /** Center atmospheric diffuse glow */
  center: string;
  /** CSS gradient for the top color-identity stripe (3 px) */
  stripe: string;
  /** Tailwind text class for kicker pill accent color */
  kickerText: string;
  /** Tailwind border class for kicker pill */
  kickerBorder: string;
  /** Tailwind bg class for kicker pill */
  kickerBg: string;
}

const glowMap: Record<GlowPreset, GlowConfig> = {
  amber: {
    a:      "bg-amber-400/30  dark:bg-amber-500/20",
    b:      "bg-orange-400/22 dark:bg-orange-500/14",
    center: "bg-amber-300/10  dark:bg-amber-600/8",
    stripe: "linear-gradient(90deg,#f59e0b 0%,#fb923c 50%,transparent 100%)",
    kickerText:   "text-amber-700 dark:text-amber-300",
    kickerBorder: "border-amber-300/60 dark:border-amber-500/40",
    kickerBg:     "bg-amber-50/80 dark:bg-amber-500/10",
  },
  violet: {
    a:      "bg-violet-400/28 dark:bg-violet-500/18",
    b:      "bg-indigo-400/20 dark:bg-indigo-500/12",
    center: "bg-violet-300/10 dark:bg-violet-600/8",
    stripe: "linear-gradient(90deg,#8b5cf6 0%,#6366f1 50%,transparent 100%)",
    kickerText:   "text-violet-700 dark:text-violet-300",
    kickerBorder: "border-violet-300/60 dark:border-violet-500/40",
    kickerBg:     "bg-violet-50/80 dark:bg-violet-500/10",
  },
  cyan: {
    a:      "bg-cyan-400/28    dark:bg-cyan-500/18",
    b:      "bg-sky-400/20     dark:bg-sky-500/12",
    center: "bg-cyan-300/10    dark:bg-cyan-600/8",
    stripe: "linear-gradient(90deg,#06b6d4 0%,#0ea5e9 50%,transparent 100%)",
    kickerText:   "text-cyan-700 dark:text-cyan-300",
    kickerBorder: "border-cyan-300/60 dark:border-cyan-500/40",
    kickerBg:     "bg-cyan-50/80 dark:bg-cyan-500/10",
  },
  emerald: {
    a:      "bg-emerald-400/28 dark:bg-emerald-500/18",
    b:      "bg-teal-400/20    dark:bg-teal-500/12",
    center: "bg-emerald-300/10 dark:bg-emerald-600/8",
    stripe: "linear-gradient(90deg,#10b981 0%,#14b8a6 50%,transparent 100%)",
    kickerText:   "text-emerald-700 dark:text-emerald-300",
    kickerBorder: "border-emerald-300/60 dark:border-emerald-500/40",
    kickerBg:     "bg-emerald-50/80 dark:bg-emerald-500/10",
  },
  fuchsia: {
    a:      "bg-fuchsia-400/28 dark:bg-fuchsia-500/18",
    b:      "bg-pink-400/20    dark:bg-pink-500/12",
    center: "bg-fuchsia-300/10 dark:bg-fuchsia-600/8",
    stripe: "linear-gradient(90deg,#d946ef 0%,#ec4899 50%,transparent 100%)",
    kickerText:   "text-fuchsia-700 dark:text-fuchsia-300",
    kickerBorder: "border-fuchsia-300/60 dark:border-fuchsia-500/40",
    kickerBg:     "bg-fuchsia-50/80 dark:bg-fuchsia-500/10",
  },
  rose: {
    a:      "bg-rose-400/28    dark:bg-rose-500/18",
    b:      "bg-pink-400/20    dark:bg-pink-500/12",
    center: "bg-rose-300/10    dark:bg-rose-600/8",
    stripe: "linear-gradient(90deg,#f43f5e 0%,#ec4899 50%,transparent 100%)",
    kickerText:   "text-rose-700 dark:text-rose-300",
    kickerBorder: "border-rose-300/60 dark:border-rose-500/40",
    kickerBg:     "bg-rose-50/80 dark:bg-rose-500/10",
  },
  sky: {
    a:      "bg-sky-400/28     dark:bg-sky-500/18",
    b:      "bg-blue-400/20    dark:bg-blue-500/12",
    center: "bg-sky-300/10     dark:bg-sky-600/8",
    stripe: "linear-gradient(90deg,#0ea5e9 0%,#3b82f6 50%,transparent 100%)",
    kickerText:   "text-sky-700 dark:text-sky-300",
    kickerBorder: "border-sky-300/60 dark:border-sky-500/40",
    kickerBg:     "bg-sky-50/80 dark:bg-sky-500/10",
  },
  indigo: {
    a:      "bg-indigo-400/28  dark:bg-indigo-500/18",
    b:      "bg-violet-400/20  dark:bg-violet-500/12",
    center: "bg-indigo-300/10  dark:bg-indigo-600/8",
    stripe: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,transparent 100%)",
    kickerText:   "text-indigo-700 dark:text-indigo-300",
    kickerBorder: "border-indigo-300/60 dark:border-indigo-500/40",
    kickerBg:     "bg-indigo-50/80 dark:bg-indigo-500/10",
  },
  orange: {
    a:      "bg-orange-400/28  dark:bg-orange-500/18",
    b:      "bg-amber-400/20   dark:bg-amber-500/12",
    center: "bg-orange-300/10  dark:bg-orange-600/8",
    stripe: "linear-gradient(90deg,#f97316 0%,#f59e0b 50%,transparent 100%)",
    kickerText:   "text-orange-700 dark:text-orange-300",
    kickerBorder: "border-orange-300/60 dark:border-orange-500/40",
    kickerBg:     "bg-orange-50/80 dark:bg-orange-500/10",
  },
  teal: {
    a:      "bg-teal-400/28    dark:bg-teal-500/18",
    b:      "bg-cyan-400/20    dark:bg-cyan-500/12",
    center: "bg-teal-300/10    dark:bg-teal-600/8",
    stripe: "linear-gradient(90deg,#14b8a6 0%,#06b6d4 50%,transparent 100%)",
    kickerText:   "text-teal-700 dark:text-teal-300",
    kickerBorder: "border-teal-300/60 dark:border-teal-500/40",
    kickerBg:     "bg-teal-50/80 dark:bg-teal-500/10",
  },
  coral: {
    a:      "bg-red-400/28     dark:bg-red-500/18",
    b:      "bg-orange-400/20  dark:bg-orange-500/12",
    center: "bg-red-300/10     dark:bg-red-600/8",
    stripe: "linear-gradient(90deg,#ef4444 0%,#f97316 50%,transparent 100%)",
    kickerText:   "text-red-700 dark:text-red-300",
    kickerBorder: "border-red-300/60 dark:border-red-500/40",
    kickerBg:     "bg-red-50/80 dark:bg-red-500/10",
  },
  neutral: {
    a:      "bg-slate-400/14   dark:bg-slate-500/10",
    b:      "bg-slate-300/10   dark:bg-slate-400/6",
    center: "bg-slate-300/6    dark:bg-slate-600/5",
    stripe: "linear-gradient(90deg,rgba(100,116,139,0.5) 0%,rgba(148,163,184,0.3) 50%,transparent 100%)",
    kickerText:   "text-slate-600 dark:text-slate-400",
    kickerBorder: "border-slate-200/80 dark:border-slate-700/60",
    kickerBg:     "bg-white/80 dark:bg-slate-900/60",
  },
};

// ─── PageHeader ───────────────────────────────────────────────────────────────
interface PageHeaderProps {
  kicker?: string;
  title: React.ReactNode;
  description?: string;
  right?: React.ReactNode;
  dot?: string;
  badge?: React.ReactNode;
  className?: string;
  glow?: GlowPreset;
}

export function PageHeader({
  kicker,
  title,
  description,
  right,
  dot,
  badge,
  className,
  glow = "neutral",
}: PageHeaderProps) {
  const { kickerText, kickerBorder, kickerBg } = glowMap[glow];

  return (
    <div className={clsx("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0 space-y-2">
        {(kicker || badge) && (
          <div className="flex flex-wrap items-center gap-2">
            {kicker && (
              <div className={clsx(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 shadow-sm backdrop-blur-sm",
                kickerBg, kickerBorder
              )}>
                {dot && (
                  <span className="relative flex h-[7px] w-[7px] shrink-0">
                    <span className={clsx("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", dot)} />
                    <span className={clsx("relative h-[7px] w-[7px] rounded-full", dot)} />
                  </span>
                )}
                <span className={clsx("text-[10px] font-semibold uppercase tracking-[0.18em]", kickerText)}>
                  {kicker}
                </span>
              </div>
            )}
            {badge}
          </div>
        )}

        <h1 className="text-xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-2xl dark:text-slate-50">
          {title}
        </h1>

        {description && (
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

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
  maxWidth?: string;
  noPad?: boolean;
}

export default function PageShell({
  children,
  glow = "neutral",
  className,
  maxWidth = "max-w-7xl",
  noPad = false,
}: PageShellProps) {
  const { a, b, center, stripe } = glowMap[glow];

  return (
    <div className="relative flex min-h-full w-full flex-col bg-slate-50 dark:bg-slate-950">

      {/* ── Ambient background layer ──────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* Color-identity top stripe — the module's signature gradient line */}
        <div
          className="absolute left-0 top-0 h-[3px] w-full opacity-90"
          style={{ backgroundImage: stripe }}
        />

        {/* Corner glow blobs */}
        <div className={clsx(
          "absolute -left-40 -top-40 h-[480px] w-[480px] rounded-full blur-[100px] transition-all duration-700",
          a
        )} />
        <div className={clsx(
          "absolute -bottom-40 right-[-6rem] h-[380px] w-[380px] rounded-full blur-[90px] transition-all duration-700",
          b
        )} />

        {/* Center atmospheric glow — large, diffuse, barely-there */}
        <div className={clsx(
          "absolute left-1/2 top-1/2 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]",
          center
        )} />

        {/* Dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(100,116,139,0.18) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.5,
          }}
        />
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.08) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Soft radial vignette — pulls glow away from edges */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_10%,transparent_0%,rgba(248,250,252,0.5)_50%,rgba(248,250,252,0.95)_100%)] dark:bg-[radial-gradient(ellipse_90%_70%_at_50%_10%,transparent_0%,rgba(2,6,23,0.5)_50%,rgba(2,6,23,0.95)_100%)]" />
      </div>

      {/* ── Page content ──────────────────────────────────────────────────── */}
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
