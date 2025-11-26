import React from "react";
import BillingPanel from "@/components/settings/BillingPanel";

export default function BillingPage() {
  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm text-slate-500 mb-4">Settings &raquo; Billing</nav>
        <BillingPanel />
      </div>
    </main>
  );
}
