import React from "react";
import BillingPanel from "@/components/settings/BillingPanel";
import BackToDashboard from "@/components/BackToDashboard";

export default function BillingPage() {
  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <BackToDashboard />
            <nav className="text-sm text-slate-500 mt-2">Settings &raquo; Billing</nav>
          </div>
        </div>

        <BillingPanel />
      </div>
    </main>
  );
}
