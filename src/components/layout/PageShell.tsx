"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  /**
   * Full-width top wash — fades from module color → transparent.
   * Used in light mode. rgba string at peak opacity.
   */
  washLight: string;
  /**
   * Full-width top wash — dark mode version (stronger).
   */
  washDark: string;
  /** Tailwind text class for kicker pill accent color */
  kickerText: string;
  /** Tailwind border class for kicker pill */
  kickerBorder: string;
  /** Tailwind bg class for kicker pill */
  kickerBg: string;
}

/* ── Color reference (primary / secondary RGB of each preset) ────────────────
   washLight: rgba peak ~0.09  → fade to 0 at 68%
   washDark:  rgba peak ~0.22  → fade to 0 at 62%
   Each color washes only within its own family — no cross-mixing.
─────────────────────────────────────────────────────────────────────────────*/
const glowMap: Record<GlowPreset, GlowConfig> = {

  amber: {
    a:      "bg-amber-400/32  dark:bg-amber-500/22",
    b:      "bg-orange-400/20 dark:bg-orange-500/14",
    center: "bg-amber-300/12  dark:bg-amber-600/10",
    stripe: "linear-gradient(90deg,#f59e0b 0%,#fb923c 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(245,158,11,0.09) 0%,rgba(251,146,60,0.05) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(245,158,11,0.22) 0%,rgba(251,146,60,0.10) 34%,transparent 62%)",
    kickerText:   "text-amber-700 dark:text-amber-300",
    kickerBorder: "border-amber-300/60 dark:border-amber-500/40",
    kickerBg:     "bg-amber-50/80 dark:bg-amber-500/10",
  },

  orange: {
    a:      "bg-orange-400/32  dark:bg-orange-500/22",
    b:      "bg-red-400/20     dark:bg-red-500/14",
    center: "bg-orange-300/12  dark:bg-orange-600/10",
    stripe: "linear-gradient(90deg,#f97316 0%,#ef4444 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(249,115,22,0.09) 0%,rgba(239,68,68,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(249,115,22,0.22) 0%,rgba(239,68,68,0.08) 34%,transparent 62%)",
    kickerText:   "text-orange-700 dark:text-orange-300",
    kickerBorder: "border-orange-300/60 dark:border-orange-500/40",
    kickerBg:     "bg-orange-50/80 dark:bg-orange-500/10",
  },

  rose: {
    a:      "bg-rose-400/32    dark:bg-rose-500/22",
    b:      "bg-pink-400/20    dark:bg-pink-500/14",
    center: "bg-rose-300/12    dark:bg-rose-600/10",
    stripe: "linear-gradient(90deg,#f43f5e 0%,#ec4899 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(244,63,94,0.09) 0%,rgba(236,72,153,0.05) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(244,63,94,0.22) 0%,rgba(236,72,153,0.10) 34%,transparent 62%)",
    kickerText:   "text-rose-700 dark:text-rose-300",
    kickerBorder: "border-rose-300/60 dark:border-rose-500/40",
    kickerBg:     "bg-rose-50/80 dark:bg-rose-500/10",
  },

  fuchsia: {
    a:      "bg-fuchsia-400/30 dark:bg-fuchsia-500/20",
    b:      "bg-pink-400/18    dark:bg-pink-500/12",
    center: "bg-fuchsia-300/12 dark:bg-fuchsia-600/10",
    stripe: "linear-gradient(90deg,#d946ef 0%,#ec4899 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(217,70,239,0.09) 0%,rgba(236,72,153,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(217,70,239,0.22) 0%,rgba(236,72,153,0.09) 34%,transparent 62%)",
    kickerText:   "text-fuchsia-700 dark:text-fuchsia-300",
    kickerBorder: "border-fuchsia-300/60 dark:border-fuchsia-500/40",
    kickerBg:     "bg-fuchsia-50/80 dark:bg-fuchsia-500/10",
  },

  violet: {
    a:      "bg-violet-400/30  dark:bg-violet-500/20",
    b:      "bg-indigo-400/18  dark:bg-indigo-500/12",
    center: "bg-violet-300/12  dark:bg-violet-600/10",
    stripe: "linear-gradient(90deg,#8b5cf6 0%,#6366f1 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(139,92,246,0.09) 0%,rgba(99,102,241,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(139,92,246,0.22) 0%,rgba(99,102,241,0.09) 34%,transparent 62%)",
    kickerText:   "text-violet-700 dark:text-violet-300",
    kickerBorder: "border-violet-300/60 dark:border-violet-500/40",
    kickerBg:     "bg-violet-50/80 dark:bg-violet-500/10",
  },

  indigo: {
    a:      "bg-indigo-400/30  dark:bg-indigo-500/20",
    b:      "bg-violet-400/18  dark:bg-violet-500/12",
    center: "bg-indigo-300/12  dark:bg-indigo-600/10",
    stripe: "linear-gradient(90deg,#6366f1 0%,#8b5cf6 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(99,102,241,0.09) 0%,rgba(139,92,246,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(99,102,241,0.22) 0%,rgba(139,92,246,0.09) 34%,transparent 62%)",
    kickerText:   "text-indigo-700 dark:text-indigo-300",
    kickerBorder: "border-indigo-300/60 dark:border-indigo-500/40",
    kickerBg:     "bg-indigo-50/80 dark:bg-indigo-500/10",
  },

  sky: {
    a:      "bg-sky-400/30     dark:bg-sky-500/20",
    b:      "bg-blue-400/18    dark:bg-blue-500/12",
    center: "bg-sky-300/12     dark:bg-sky-600/10",
    stripe: "linear-gradient(90deg,#0ea5e9 0%,#3b82f6 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(14,165,233,0.09) 0%,rgba(59,130,246,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(14,165,233,0.22) 0%,rgba(59,130,246,0.09) 34%,transparent 62%)",
    kickerText:   "text-sky-700 dark:text-sky-300",
    kickerBorder: "border-sky-300/60 dark:border-sky-500/40",
    kickerBg:     "bg-sky-50/80 dark:bg-sky-500/10",
  },

  cyan: {
    a:      "bg-cyan-400/30    dark:bg-cyan-500/20",
    b:      "bg-sky-400/18     dark:bg-sky-500/12",
    center: "bg-cyan-300/12    dark:bg-cyan-600/10",
    stripe: "linear-gradient(90deg,#06b6d4 0%,#0ea5e9 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(6,182,212,0.09) 0%,rgba(14,165,233,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(6,182,212,0.22) 0%,rgba(14,165,233,0.09) 34%,transparent 62%)",
    kickerText:   "text-cyan-700 dark:text-cyan-300",
    kickerBorder: "border-cyan-300/60 dark:border-cyan-500/40",
    kickerBg:     "bg-cyan-50/80 dark:bg-cyan-500/10",
  },

  teal: {
    a:      "bg-teal-400/30    dark:bg-teal-500/20",
    b:      "bg-cyan-400/18    dark:bg-cyan-500/12",
    center: "bg-teal-300/12    dark:bg-teal-600/10",
    stripe: "linear-gradient(90deg,#14b8a6 0%,#06b6d4 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(20,184,166,0.09) 0%,rgba(6,182,212,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(20,184,166,0.22) 0%,rgba(6,182,212,0.09) 34%,transparent 62%)",
    kickerText:   "text-teal-700 dark:text-teal-300",
    kickerBorder: "border-teal-300/60 dark:border-teal-500/40",
    kickerBg:     "bg-teal-50/80 dark:bg-teal-500/10",
  },

  emerald: {
    a:      "bg-emerald-400/30 dark:bg-emerald-500/20",
    b:      "bg-teal-400/18    dark:bg-teal-500/12",
    center: "bg-emerald-300/12 dark:bg-emerald-600/10",
    stripe: "linear-gradient(90deg,#10b981 0%,#14b8a6 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(16,185,129,0.09) 0%,rgba(20,184,166,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(16,185,129,0.22) 0%,rgba(20,184,166,0.09) 34%,transparent 62%)",
    kickerText:   "text-emerald-700 dark:text-emerald-300",
    kickerBorder: "border-emerald-300/60 dark:border-emerald-500/40",
    kickerBg:     "bg-emerald-50/80 dark:bg-emerald-500/10",
  },

  coral: {
    a:      "bg-red-400/30     dark:bg-red-500/20",
    b:      "bg-orange-400/18  dark:bg-orange-500/12",
    center: "bg-red-300/12     dark:bg-red-600/10",
    stripe: "linear-gradient(90deg,#ef4444 0%,#f97316 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(239,68,68,0.09) 0%,rgba(249,115,22,0.04) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(239,68,68,0.22) 0%,rgba(249,115,22,0.09) 34%,transparent 62%)",
    kickerText:   "text-red-700 dark:text-red-300",
    kickerBorder: "border-red-300/60 dark:border-red-500/40",
    kickerBg:     "bg-red-50/80 dark:bg-red-500/10",
  },

  neutral: {
    a:      "bg-slate-400/16   dark:bg-slate-500/12",
    b:      "bg-slate-300/10   dark:bg-slate-400/8",
    center: "bg-slate-300/8    dark:bg-slate-600/6",
    stripe: "linear-gradient(90deg,rgba(100,116,139,0.6) 0%,rgba(148,163,184,0.3) 60%,transparent 100%)",
    washLight: "linear-gradient(180deg,rgba(100,116,139,0.06) 0%,rgba(148,163,184,0.03) 38%,transparent 68%)",
    washDark:  "linear-gradient(180deg,rgba(100,116,139,0.14) 0%,rgba(148,163,184,0.06) 34%,transparent 62%)",
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

// ─── ModuleBreadcrumb ─────────────────────────────────────────────────────────
// Auto-generates a breadcrumb like: Dashboard / Extract from the URL
// Shows on all module pages. Sticky below the top nav.
const segmentLabels: Record<string, string> = {
  dashboard:    "Dashboard",
  extract:      "Extract",
  describe:     "Describe",
  seo:          "SEO",
  translate:    "Translate",
  cluster:      "Cluster",
  studio:       "Studio",
  match:        "Match",
  variants:     "Variants",
  specs:        "Specs",
  docs:         "Docs",
  images:       "Images",
  import:       "Import",
  audit:        "Audit",
  price:        "Price",
  feeds:        "Feeds",
  monitor:      "Monitor",
  browser:      "Browser",
  api:          "API",
  analytics:    "Analytics",
  integrations: "Integrations",
  assistant:    "Assistant",
  bulk:         "Bulk Jobs",
  support:      "Support",
  settings:     "Settings",
  pricing:      "Pricing",
  notifications:"Notifications",
  visualize:    "Visualize",
  roles:        "Roles",
  versioning:   "Versioning",
  history:      "History",
  "api-keys":   "API Keys",
  "api_keys":   "API Keys",
  organization: "Organization",
  agency:       "Agency",
  "description-formats": "Description Formats",
  "sign-in":    "Sign In",
  subscribe:    "Subscribe",
  status:       "Status",
};

export function ModuleBreadcrumb() {
  const pathname = usePathname() ?? "";
  // Split and filter empty segments
  const segments = pathname.split("/").filter(Boolean);

  // Build crumb items: each has a label and an href
  const crumbs: { label: string; href: string }[] = [];
  let href = "";
  for (const seg of segments) {
    href += "/" + seg;
    const label = segmentLabels[seg.toLowerCase()] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, href });
  }

  // Don't render if we're at /dashboard root (no sub-segment)
  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="sticky top-[58px] z-20 flex items-center gap-1.5 border-b border-slate-200/70 bg-white/85 px-4 py-2.5 backdrop-blur-md dark:border-slate-800/70 dark:bg-slate-950/85 sm:px-6 lg:px-10"
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={crumb.href}>
            {i > 0 && (
              <svg
                viewBox="0 0 12 12"
                fill="none"
                className="h-3 w-3 shrink-0 text-slate-300 dark:text-slate-700"
                aria-hidden="true"
              >
                <path d="M4.5 2L7.5 6l-3 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {isLast ? (
              <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="text-[11.5px] font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-500 dark:hover:text-indigo-400"
              >
                {crumb.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}

// ─── PageShell ────────────────────────────────────────────────────────────────
interface PageShellProps {
  children: React.ReactNode;
  glow?: GlowPreset;
  className?: string;
  maxWidth?: string;
  noPad?: boolean;
  /** Show breadcrumb nav above content (default: true) */
  breadcrumb?: boolean;
}

export default function PageShell({
  children,
  glow = "neutral",
  className,
  maxWidth = "max-w-7xl",
  noPad = false,
  breadcrumb = true,
}: PageShellProps) {
  const { a, b, center, stripe, washLight, washDark } = glowMap[glow];

  return (
    <div className="relative flex min-h-full w-full flex-col bg-slate-50 dark:bg-slate-950">

      {/* ── Ambient background layer ─────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        {/* ① 3-px color-identity top stripe */}
        <div
          className="absolute left-0 top-0 h-[3px] w-full"
          style={{ backgroundImage: stripe }}
        />

        {/* ② Full-width color wash — the signature "fading" effect
              Covers ~68 % of page height from the top, fading smoothly.
              Light mode version */}
        <div
          className="absolute left-0 top-0 h-[70%] w-full dark:hidden"
          style={{ backgroundImage: washLight }}
        />
        {/* Dark mode version — richer, more saturated */}
        <div
          className="absolute left-0 top-0 h-[70%] w-full hidden dark:block"
          style={{ backgroundImage: washDark }}
        />

        {/* ③ Top-left corner accent blob — reinforces the wash origin point */}
        <div className={clsx(
          "absolute -left-32 -top-32 h-[440px] w-[440px] rounded-full blur-[90px] transition-all duration-700",
          a
        )} />

        {/* ④ Bottom-right corner glow — grounding complement */}
        <div className={clsx(
          "absolute -bottom-32 right-[-5rem] h-[340px] w-[340px] rounded-full blur-[80px] transition-all duration-700",
          b
        )} />

        {/* ⑤ Center atmospheric diffuse glow — barely-there depth layer */}
        <div className={clsx(
          "absolute left-1/2 top-[30%] h-[500px] w-[700px] -translate-x-1/2 rounded-full blur-[120px]",
          center
        )} />

        {/* ⑥ Dot grid — light mode */}
        <div
          className="absolute inset-0 dark:hidden"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(100,116,139,0.15) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        {/* Dot grid — dark mode */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage: "radial-gradient(circle,rgba(148,163,184,0.08) 1px,transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* ⑦ Soft bottom vignette — pulls color gently toward the top */}
        <div className="absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-slate-50 to-transparent dark:from-slate-950 dark:to-transparent" />
      </div>

      {/* ── Breadcrumb navigation ────────────────────────────────────────── */}
      {breadcrumb && <ModuleBreadcrumb />}

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
