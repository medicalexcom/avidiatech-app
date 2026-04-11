"use client";

import * as React from "react";
import clsx from "clsx";

// ─── Types ────────────────────────────────────────────────────────────────────
export type ButtonVariant =
  | "primary"    // dark filled — primary action
  | "secondary"  // white/glass bordered — secondary action
  | "ghost"      // no border, hover fill
  | "danger"     // rose/red — destructive
  | "success"    // emerald — positive action
  | "cyan"       // cyan filled — brand primary
  | "outline";   // clean outlined

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  children?: React.ReactNode;
  asChild?: boolean;
}

// ─── Style maps ───────────────────────────────────────────────────────────────
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-slate-900 text-white border-transparent hover:bg-slate-800 shadow-sm hover:shadow " +
    "dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200",
  secondary:
    "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300 shadow-sm " +
    "dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600",
  ghost:
    "bg-transparent text-slate-600 border-transparent hover:bg-slate-100 hover:text-slate-900 " +
    "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  danger:
    "bg-rose-600 text-white border-transparent hover:bg-rose-700 shadow-sm " +
    "dark:bg-rose-700 dark:hover:bg-rose-600",
  success:
    "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-sm " +
    "dark:bg-emerald-700 dark:hover:bg-emerald-600",
  cyan:
    "bg-cyan-500 text-slate-950 border-transparent hover:bg-cyan-400 shadow-sm " +
    "dark:bg-cyan-500 dark:hover:bg-cyan-400",
  outline:
    "bg-transparent text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 " +
    "dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:border-slate-600",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-6 px-2.5 text-[11px] gap-1 rounded-md",
  sm: "h-7 px-3 text-xs gap-1.5 rounded-md",
  md: "h-8 px-3.5 text-[13px] gap-2 rounded-lg",
  lg: "h-9 px-4 text-sm gap-2 rounded-lg",
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <span
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
      aria-hidden="true"
    />
  );
}

// ─── Button component ─────────────────────────────────────────────────────────
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      iconLeft,
      iconRight,
      className,
      disabled,
      children,
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={clsx(
          // Base
          "inline-flex items-center justify-center font-medium border",
          "transition-all duration-150 select-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-1",
          "disabled:pointer-events-none disabled:opacity-50",
          // Variant + size
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...rest}
      >
        {loading ? <Spinner /> : iconLeft}
        {children}
        {!loading && iconRight}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
