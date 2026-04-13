"use client";

import Link from "next/link";
import React from "react";

/**
 * Floating support button that links to the in-app Support Chat page.
 * Add <SupportButton /> into your layout (e.g. src/app/layout.tsx or src/app/dashboard/layout.tsx)
 * to show a floating CTA without touching the sidebar.
 */
export function SupportButton() {
  return (
    <Link
      href="/dashboard/support"
      aria-label="Open support chat"
      className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-400"
    >
      <span className="sr-only">Open support chat</span>
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </Link>
  );
}
