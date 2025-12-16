"use client";

import React from "react";
import RulesAdmin from "@/components/monitor/RulesAdmin";

export default function MonitorRulesPage() {
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Monitor Rules</h1>
          <p className="text-sm text-slate-500">Create rules to trigger app notifications, webhooks, or emails when events occur.</p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/import" className="px-3 py-2 rounded border text-sm">Cancel</a>
          <a href="/dashboard" className="px-3 py-2 rounded bg-amber-500 text-white text-sm">Back to Dashboard</a>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-4 shadow">
        <RulesAdmin />
      </div>
    </main>
  );
}
