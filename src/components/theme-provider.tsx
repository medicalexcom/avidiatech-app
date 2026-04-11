"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"          // adds "class" to <html>
      defaultTheme="light"       // 👈 light by default
      enableSystem={false}       // ignore OS theme for now (can set true later)
      storageKey="avidia-theme"  // key in localStorage
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
