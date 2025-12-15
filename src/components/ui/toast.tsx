"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ToastItem = { id: string; type: "success" | "error" | "info"; message: string };

type ToastContextValue = {
  push: (t: Omit<ToastItem, "id">) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const value = useMemo<ToastContextValue>(
    () => ({
      push: (t) => {
        const id = Math.random().toString(36).slice(2, 9);
        setToasts((s) => [...s, { id, ...t }]);
        setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000);
      },
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded px-4 py-2 shadow ${
              t.type === "success" ? "bg-green-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-gray-800 text-white"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Helper hook to use the toast context in components
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: (msg: string) => console.info("Toast success (no provider):", msg),
      error: (msg: string) => console.warn("Toast error (no provider):", msg),
      info: (msg: string) => console.info("Toast info (no provider):", msg),
    };
  }
  return {
    success: (msg: string) => ctx.push({ type: "success", message: msg }),
    error: (msg: string) => ctx.push({ type: "error", message: msg }),
    info: (msg: string) => ctx.push({ type: "info", message: msg }),
  };
}

// Default export compatibility used in older code that expects toast.* functions
const defaultToast = {
  success: (msg: string) => {
    try {
      const ctx = useContext(ToastContext);
      ctx?.push({ type: "success", message: msg });
    } catch {
      // no-op
      // eslint-disable-next-line no-console
      console.info("Toast success:", msg);
    }
  },
  error: (msg: string) => {
    try {
      const ctx = useContext(ToastContext);
      ctx?.push({ type: "error", message: msg });
    } catch {
      // eslint-disable-next-line no-console
      console.error("Toast error:", msg);
    }
  },
  info: (msg: string) => {
    try {
      const ctx = useContext(ToastContext);
      ctx?.push({ type: "info", message: msg });
    } catch {
      // eslint-disable-next-line no-console
      console.info("Toast info:", msg);
    }
  },
};

export default defaultToast;
