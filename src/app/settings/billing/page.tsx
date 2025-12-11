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
            <h1 className="text-2xl font-semibold mt-2">Subscription &amp; Billing</h1>
            <p className="text-sm text-slate-500 mt-1">Manage subscription, invoices and payment methods</p>
          </div>
        </div>

        <BillingPanel />
      </div>
    </main>
  );
}
