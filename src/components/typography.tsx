// src/components/typography.tsx
"use client";

import * as React from "react";
import clsx from "clsx";

/**
 * Central typography system for AvidiaTech.
 *
 * - <Text variant="cardTitle" tone="default" />
 * - Shorthands like <PageTitle>, <CardTitle>, <MetricValue> etc.
 *
 * Change sizes / weights / colors here and the whole app follows.
 */

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

export type TextTone = "default" | "muted" | "subtle" | "accent";

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
  | "label";

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: TextTag;
  variant?: TextVariant;
  tone?: TextTone;
}

/**
 * Base styles per variant: size, weight, base color.
 * Titles / headings = darker (around 900), body = softer.
 */
const baseByVariant: Record<TextVariant, string> = {
  // Page-level
  pageTitle:
    "text-xl sm:text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-50",
  pageKicker:
    "text-xs font-semibold text-slate-700 dark:text-slate-300",
  pageDescription:
    "max-w-2xl text-sm text-slate-600 dark:text-slate-300",

  // Section / card labels (no uppercase, no extra tracking)
  sectionLabel:
    "text-[11px] font-semibold text-slate-900 dark:text-slate-50",

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

  // Badges / pills (no tracking, no auto-uppercase)
  badge:
    "text-[10px] font-medium text-slate-600 dark:text-slate-400",
  pill:
    "text-[11px] text-slate-700 dark:text-slate-200",
};

/**
 * Tone modifiers: how strong / muted the text feels.
 * These layer on top of the base variant.
 */
const toneByTone: Record<TextTone, string> = {
  default: "",
  muted: "text-slate-500 dark:text-slate-400",
  subtle: "text-slate-400 dark:text-slate-500",
  accent:
    "text-cyan-700 dark:text-cyan-300",
};

export function Text({
  as: Tag = "p",
  variant = "body",
  tone = "default",
  className,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={clsx(baseByVariant[variant], toneByTone[tone], className)}
      {...rest}
    />
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
