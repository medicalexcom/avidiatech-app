"use client";

import * as React from "react";
import clsx from "clsx";

type RadioGroupContextValue = {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

export function RadioGroup({
  value,
  onValueChange,
  name,
  className,
  children,
  ...rest
}: RadioGroupProps) {
  const generatedName = React.useId();

  return (
    <RadioGroupContext.Provider
      value={{
        name: name ?? `radio-group-${generatedName}`,
        value,
        onValueChange,
      }}
    >
      <div className={clsx("space-y-2", className)} {...rest}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value: string;
}

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  function RadioGroupItem({ className, value, checked, onChange, ...rest }, ref) {
    const context = React.useContext(RadioGroupContext);

    const isChecked = context ? context.value === value : checked;

    return (
      <input
        ref={ref}
        type="radio"
        value={value}
        checked={isChecked}
        name={context?.name}
        onChange={(event) => {
          context?.onValueChange?.(event.target.value);
          onChange?.(event);
        }}
        className={clsx("h-4 w-4 border-slate-300 text-slate-900", className)}
        {...rest}
      />
    );
  }
);

export default RadioGroup;
