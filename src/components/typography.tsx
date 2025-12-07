"use client";

import * as React from "react";
import clsx from "clsx";

/* SEE problem_statement: this is the full file content to write */
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

export type TextTone =
  | "default"
  | "muted"
  | "subtle"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "brand";

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

const baseByVariant: Record<TextVariant, string> = {
  pageTitle:
    "text-xl sm:text-2xl md:text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-50",
  pageKicker:
    "text-xs font-medium text-slate-600 dark:text-slate-400",
  pageDescription:
    "max-w-2xl text-sm text-slate-600 dark:text-slate-300",

  sectionLabel:
    "text-[11px] font-medium text-slate-700 dark:text-slate-300",

  cardTitle:
    "text-sm font-semibold text-slate-900 dark:text-slate-50",
  cardDescription:
    "text-xs text-slate-600 dark:text-slate-300",

  body:
    "text-sm text-slate-700 dark:text-slate-200",
  bodySm:
    "text-xs text-slate-600 dark:text-slate-300",
  bodyXs:
    "text-[11px] text-slate-500 dark:text-slate-400",

  metricLabel:
    "text-xs text-slate-500 dark:text-slate-400",
  metricValue:
    "mt-1 text-xl font-semibold text-slate-900 dark:text-slate-50",
  metricHint:
    "mt-1 text-[11px] text-slate-500 dark:text-slate-400",

  badge:
    "text-[10px] font-medium text-slate-600 dark:text-slate-400",
  pill:
    "text-[11px] text-slate-700 dark:text-slate-200",
};

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

export function Text({
  as: Tag = "p",
  variant = "body",
  tone = "default",
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag className={clsx(baseByVariant[variant], toneByTone[tone], className)} {...rest}>
      {children}
    </Tag>
  );
}

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

export function SectionLabel(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="sectionLabel" {...props} />;
}

export function CardTitle(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="h2" variant="cardTitle" {...props} />;
}

export function CardDescription(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="cardDescription" {...props} />;
}

export function MetricLabel(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricLabel" {...props} />;
}

export function MetricValue(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricValue" {...props} />;
}

export function MetricHint(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="metricHint" {...props} />;
}

export function Body(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="body" {...props} />;
}

export function BodySm(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="bodySm" {...props} />;
}

export function BodyXs(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="p" variant="bodyXs" {...props} />;
}

export function BadgeText(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="span" variant="badge" {...props} />;
}

export function PillText(props: Omit<TextProps, "variant" | "as">) {
  return <Text as="span" variant="pill" {...props} />;
}

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
  const variant: TextVariant = level === 1 ? "pageTitle" : "cardTitle";
  return (
    <Text as={tag} variant={variant} className={className} {...rest}>
      {children}
    </Text>
  );
}

export default Text;
