"use client";

import * as React from "react";
import clsx from "clsx";

export interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  dot?: string;       // Tailwind bg color class for the accent dot
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  loading?: boolean;
  className?: string;
}

/** Premium KPI stat card — used in dashboard pipeline glance and analytics */
export function MetricCard({
  label,
  value,
  sub,
  dot,
  trend,
  trendLabel,
  loading,
  className,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={clsx("skeleton h-[60px] rounded-xl", className)} />
    );
  }

  const trendColor =
    trend === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : trend === "down"
      ? "text-rose-600 dark:text-rose-400"
      : "text-slate-400";

  const trendIcon =
    trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <div
      className={clsx(
        "flex items-start justify-between rounded-xl border border-slate-200/80 bg-white px-3.5 py-3",
        "shadow-[0_1px_3px_rgba(0,0,0,0.05)]",
        "dark:border-slate-800 dark:bg-slate-900/80",
        "transition-colors",
        className
      )}
    >
      {/* Left: label + value */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          {dot && <span className={clsx("h-[5px] w-[5px] shrink-0 rounded-full", dot)} />}
          <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400 truncate">
            {label}
          </span>
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {value}
        </span>
        {sub && (
          <span className="text-[10.5px] text-slate-400 dark:text-slate-500 truncate">
            {sub}
          </span>
        )}
      </div>

      {/* Right: trend indicator */}
      {trend && trendLabel && (
        <div className={clsx("shrink-0 text-right text-[10.5px] font-medium", trendColor)}>
          <span>{trendIcon}</span>
          <span className="ml-0.5">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

export default MetricCard;
