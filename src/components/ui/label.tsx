"use client";

import * as React from "react";
import clsx from "clsx";

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, children, ...rest }, ref) {
    return (
      <label
        ref={ref}
        className={clsx(
          "text-sm font-medium leading-none text-slate-900 dark:text-slate-100",
          className
        )}
        {...rest}
      >
        {children}
      </label>
    );
  }
);

export default Label;
