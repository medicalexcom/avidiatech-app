"use client";

import * as React from "react";
import clsx from "clsx";

/**
 * Central typography system for AvidiaTech.
 *
 * Goals:
 * - Single source of truth for all text sizes / weights / base colors.
 * - Clear hierarchy: pageTitle > cardTitle > body > hints
 * - Remove automatic uppercase/tracking from headings; keep it only for micro elements if needed.
 * - Light mode first, dark mode tokens present for every variant.
 * - Extendable tone system (accent, muted, subtle, success, warning, danger, brand).
 *
 * This file contains:
 * - Text component with `as`, `variant`, `tone` and `className`.
 * - Small helpers: PageTitle, PageKicker, PageDescription, CardTitle, SectionLabel, Metric* etc.
 * - A small Heading helper (levels 1-6) for cases where you want an explicit heading level.
 */

/* ---------- Types ---------- */

export type TextVariant =
  | "pageTitle"
  | "pageKicker"
  | "pageDescription"
  | "sectionLabel"
  | "cardTitle"
  | "cardDescription"
  | "body"
  | "bodySm"
  | "bodyXs"
  | "metricLabel"
  | "metricValue"
  | "metricHint"
  | "badge"
  | "pill";

/**
 * Tone system:
 * - default: uses variant base color
 * - muted/subtle: progressively softer
 * - accent: brand accent color
 * - success/warning/danger: semantic tones for highlights or status text
 */
export type TextTone =
  | "default"
  | "muted"
  | "subtle"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "brand";

/**
 * All tags we allow the `as` prop to choose from.
 * Extended to cover micro elements used in the app.
 */
type TextTag =
  | "p"
  | "span"
  | "div"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "label"
  | "small"
  | "strong"
  | "em"
  | "time"
  | "cite"
  | "code";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextTag;
  variant?: TextVariant;
  tone?: TextTone;
  children?: React.ReactNode;
}

/* ---------- Base variant styles (single source of truth) ---------- */
/**
 * Notes:
 * - Headings are darker (text-slate-900) in light mode and map to bright text in dark mode.
 * - Body text is softer than headings.
 * - Removed automatic uppercase/tracking from variants to avoid forcing casing across the app.
 * - Keep sizes compact for labels / badges.
 */
const baseByVariant: Record<TextVariant, string> = {
  // Page-level
  pageTitle:
    "text-xl sm:text-2xl md:text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50",
  pageKicker:
    "text-xs font-medium text-slate-600 dark:text-slate-400",
  pageDescription:
    "max-w-2xl text-sm text-slate-600 dark:text-slate-300",

  // Section / card labels
  sectionLabel:
    "text-[11px] font-medium text-slate-700 dark:text-slate-300",

  // Card titles / descriptions
  cardTitle:
    "text-sm font-semibold text-slate-900 dark:text-slate-50",
  cardDescription:
    "text-xs text-slate-600 dark:text-slate-300",

  // Body text
  body:
    "text-sm text-slate-700 dark:text-slate-200",
  bodySm:
    "text-xs text-slate-600 dark:text-slate-300",
  bodyXs:
    "text-[11px] text-slate-500 dark:text-slate-400",

  // Metrics
  metricLabel:
    "text-xs text-slate-500 dark:text-slate-400",
  metricValue:
    "mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50",
  metricHint:
    "mt-1 text-[11px] text-slate-500 dark:text-slate-400",

  // Badges / pills
  badge:
    "text-[10px] font-medium text-slate-600 dark:text-slate-400",
  pill:
    "text-[11px] text-slate-700 dark:text-slate-200",
};

/* ---------- Tone modifiers ---------- */
/**
 * Tones layer on top of the base variant. Use them when you want to:
 * - Make something muted: tone="muted"
 * - Make something accent color: tone="accent"
 * - Use semantic colors: success/warning/danger
 *
 * Empty string means the variant's base color is used.
 */
const toneByTone: Record<TextTone, string> = {
  default: "",
  muted: "text-slate-500 dark:text-slate-400",
  subtle: "text-slate-400 dark:text-slate-500",
  accent: "text-cyan-700 dark:text-cyan-300",
  success: "text-emerald-700 dark:text-emerald-300",
  warning: "text-yellow-700 dark:text-yellow-300",
  danger: "text-rose-700 dark:text-rose-300",
  brand: "text-indigo-700 dark:text-indigo-300",
};

/* ---------- Core Text component ---------- */
/**
 * Simple, predictable Text primitive.
 * - `as` selects the tag (h1,h2,p,span,...)
 * - `variant` selects the typography preset (size/weight/base color)
 * - `tone` optionally overrides color to tone (muted, accent, success...)
 *
 * This is intentionally a plain function component (no forwardRef) to keep typings simpler.
 * If you need refs forwarded, we can convert to forwardRef in a follow-up.
 */
export function Text({
  as: Tag = "p",
  variant = "body",
  tone = "default",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <Tag className={clsx(baseByVariant[variant], toneByTone[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}

/* ========= PAGE-LEVEL HELPERS ========= */

export function PageHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <header
      className={clsx(
        "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      {children}
    </header>
  );
}

export function PageKicker(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="pageKicker" {...props} />;
}

export function PageTitle(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="h1" variant="pageTitle" {...props} />;
}

export function PageDescription(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="pageDescription" {...props} />;
}

/* ========= CARD / SECTION HELPERS ========= */

export function SectionLabel(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="sectionLabel" {...props} />;
}

export function CardTitle(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="h2" variant="cardTitle" {...props} />;
}

export function CardDescription(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="cardDescription" {...props} />;
}

/* ========= METRIC / KPI HELPERS ========= */

export function MetricLabel(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricLabel" {...props} />;
}

export function MetricValue(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricValue" {...props} />;
}

export function MetricHint(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricHint" {...props} />;
}

/* ========= GENERIC BODY HELPERS ========= */

export function Body(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="body" {...props} />;
}

export function BodySm(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="bodySm" {...props} />;
}

export function BodyXs(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="bodyXs" {...props} />;
}

/* ========= BADGE / PILL HELPERS ========= */

export function BadgeText(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="span" variant="badge" {...props} />;
}

export function PillText(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="span" variant="pill" {...props} />;
}

/* ========= ADDITIONAL UTILS ========= */

/**
 * Heading helper: choose level 1-6 but keep variant control centralized.
 * Usage: <Heading level={3}>Section</Heading>
 */
export function Heading({
  level = 2,
  children,
  className,
  ...rest
}: {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
} & Omit<TextProps, "as" | "variant">) {
  const tag = (`h${level}` as TextTag) || "h2";
  // Use cardTitle for h2-h3 and pageTitle for h1, h4-h6 fall back to cardTitle
  const variant: TextVariant = level === 1 ? "pageTitle" : "cardTitle";
  return (
    <Text as={tag} variant={variant} className={className} {...rest}>
      {children}
    </Text>
  );
}

export default Text;
