"use client";

import React from "react";

/**
 * Dashboard root: render product background. No client-side redirect to /dashboard/pricing.
 * The hard-block PlanModal will overlay this page for unsubscribed users.
 */

export default function DashboardPage() {
  return (
    <main className="p-10 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-700">
        Welcome to the AvidiaTech control center. Use the navigation to explore analytics,
        imports, descriptions, automation flows, and developer tooling.
      </p>
    </main>
  );
}
