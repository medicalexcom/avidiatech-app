"use client";

import React from "react";

/**
 * BackToDashboard button
 * - tries history.back() when possible, otherwise falls back to /dashboard
 * - use in settings pages so users can return to the main dashboard quickly
 */

export default function BackToDashboard() {
  function goBack(e: React.MouseEvent) {
    e.preventDefault();
    try {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      window.location.href = "/dashboard";
    }
  }

  return (
    <a href="/dashboard" onClick={goBack} className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 hover:underline">
      <span aria-hidden>←</span>
      <span>Back to dashboard</span>
    </a>
  );
}
