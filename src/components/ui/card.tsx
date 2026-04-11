"use client";

import * as React from "react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CardVariant =
  | "default"     // white surface, subtle border + shadow
  | "elevated"    // stronger shadow
  | "ghost"       // no border, no shadow — inline section framing
  | "accent"      // gradient tinted border
  | "inset";      // slightly darker bg — nested/inner surface

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;          // adds hover lift effect
  as?: "div" | "article" | "section" | "aside";
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const variantClasses: Record<CardVariant, string> = {
  default:
    "bg-white border border-slate-200/80 shadow-card " +
    "dark:bg-slate-900/80 dark:border-slate-800/80 dark:shadow-card-dark",
  elevated:
    "bg-white border border-slate-200/80 shadow-card-md " +
    "dark:bg-slate-900/80 dark:border-slate-800/80 dark:shadow-card-dark",
  ghost:
    "bg-transparent border-0 shadow-none",
  accent:
    "bg-white border border-slate-200/60 shadow-card " +
    "dark:bg-slate-900/80 dark:border-slate-800/70 dark:shadow-card-dark",
  inset:
    "bg-slate-50 border border-slate-200/80 shadow-inner-sm " +
    "dark:bg-slate-950/60 dark:border-slate-800/70",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm:   "p-3",
  md:   "p-4 sm:p-5",
  lg:   "p-5 sm:p-6",
};

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({
  variant = "default",
  padding = "md",
  hover = false,
  as: Tag = "div",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={clsx(
        "rounded-2xl",
        variantClasses[variant],
        paddingClasses[padding],
        hover && "transition-all duration-150 hover:-translate-y-[1px] hover:shadow-card-md cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// ─── Card sub-components ──────────────────────────────────────────────────────

/** Card header row — title + optional right-side action */
export function CardHeader({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("flex items-center justify-between gap-3 mb-4", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card title text */
export function CardTitle({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx(
        "text-sm font-semibold text-slate-900 dark:text-slate-50 leading-tight",
        className
      )}
      {...rest}
    >
      {children}
    </h3>
  );
}

/** Muted card description/subtitle */
export function CardDescription({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={clsx(
        "text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed",
        className
      )}
      {...rest}
    >
      {children}
    </p>
  );
}

/** Section divider inside a card */
export function CardDivider({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "my-4 h-px bg-slate-100 dark:bg-slate-800",
        className
      )}
    />
  );
}

export default Card;
