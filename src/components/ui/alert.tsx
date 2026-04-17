"use client";

import * as React from "react";
import clsx from "clsx";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive";
}

export function Alert({
  className,
  variant = "default",
  children,
  ...rest
}: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "relative w-full rounded-xl border px-4 py-3 text-sm",
        variant === "destructive"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
          : "border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export interface AlertDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function AlertDescription({
  className,
  children,
  ...rest
}: AlertDescriptionProps) {
  return (
    <div className={clsx("text-sm leading-relaxed", className)} {...rest}>
      {children}
    </div>
  );
}

export default Alert;
