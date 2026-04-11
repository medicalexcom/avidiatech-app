"use client";

import * as React from "react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "beta"
  | "live"
  | "soon"
  | "neutral"
  | "cyan"
  | "fuchsia"
  | "emerald"
  | "amber"
  | "violet"
  | "rose"
  | "sky";

export type BadgeSize = "xs" | "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;           // show pulsing dot
  children?: React.ReactNode;
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const variantClasses: Record<BadgeVariant, { wrapper: string; dot: string }> = {
  default:  { wrapper: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/70", dot: "bg-slate-400" },
  neutral:  { wrapper: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700/70", dot: "bg-slate-400" },
  success:  { wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-500/30", dot: "bg-emerald-500" },
  warning:  { wrapper: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:border-amber-500/30", dot: "bg-amber-500" },
  danger:   { wrapper: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/12 dark:text-rose-300 dark:border-rose-500/30", dot: "bg-rose-500" },
  info:     { wrapper: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/12 dark:text-sky-300 dark:border-sky-500/30", dot: "bg-sky-500" },
  beta:     { wrapper: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:border-amber-500/30", dot: "bg-amber-400" },
  live:     { wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-500/30", dot: "bg-emerald-500" },
  soon:     { wrapper: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700/70", dot: "bg-slate-400" },
  cyan:     { wrapper: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/12 dark:text-cyan-300 dark:border-cyan-500/30", dot: "bg-cyan-500" },
  fuchsia:  { wrapper: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-500/12 dark:text-fuchsia-300 dark:border-fuchsia-500/30", dot: "bg-fuchsia-500" },
  emerald:  { wrapper: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/12 dark:text-emerald-300 dark:border-emerald-500/30", dot: "bg-emerald-500" },
  amber:    { wrapper: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/12 dark:text-amber-300 dark:border-amber-500/30", dot: "bg-amber-500" },
  violet:   { wrapper: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/12 dark:text-violet-300 dark:border-violet-500/30", dot: "bg-violet-500" },
  rose:     { wrapper: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/12 dark:text-rose-300 dark:border-rose-500/30", dot: "bg-rose-500" },
  sky:      { wrapper: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/12 dark:text-sky-300 dark:border-sky-500/30", dot: "bg-sky-500" },
};

const sizeClasses: Record<BadgeSize, string> = {
  xs: "px-1.5 py-0.5 text-[9.5px] gap-1 rounded",
  sm: "px-2 py-[3px] text-[10.5px] gap-1.5 rounded-md",
  md: "px-2.5 py-1 text-[11.5px] gap-1.5 rounded-md",
};

// ─── Badge component ──────────────────────────────────────────────────────────
export function Badge({
  variant = "default",
  size = "sm",
  dot = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  const { wrapper, dot: dotColor } = variantClasses[variant];
  const isLive = variant === "live";

  return (
    <span
      className={clsx(
        "inline-flex items-center font-medium border select-none",
        wrapper,
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {dot && (
        <span className="relative flex shrink-0 items-center">
          {isLive && (
            <span
              className={clsx(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
                dotColor
              )}
            />
          )}
          <span className={clsx("relative h-[5px] w-[5px] rounded-full", dotColor)} />
        </span>
      )}
      {children}
    </span>
  );
}

// ─── Status badge shortcuts ───────────────────────────────────────────────────
export type ModuleStatus = "live" | "beta" | "soon";

export function StatusBadge({ status }: { status: ModuleStatus }) {
  if (status === "live")  return <Badge variant="live"  dot size="xs">Live</Badge>;
  if (status === "beta")  return <Badge variant="beta"  dot size="xs">Beta</Badge>;
  return <Badge variant="soon" size="xs">Soon</Badge>;
}

export default Badge;
