import React from "react";
import { getUserRole } from "@/lib/auth/getUserRole";

/**
 * Billing page
 * Owners only (optionally Admins if you allow)
 * Shows plan and link to Stripe portal
 */

export default async function BillingPage() {
  const role = getUserRole();
  if (!["owner"].includes(role)) {
    // show a helpful message for non-owners
    return (
      <main style={{ padding: 20 }}>
        <h1>Settings &rarr; Billing</h1>
        <p>Billing information is available to account owners only. Contact your organization owner to manage billing.</p>
      </main>
    );
  }

  // For scaffold: show placeholder plan and link
  return (
    <main style={{ padding: 20 }}>
      <h1>Settings &rarr; Billing</h1>
      <section style={{ marginTop: 16 }}>
        <div style={{ maxWidth: 900 }}>
          <div style={{ padding: 16, border: "1px solid var(--border,#eee)", borderRadius: 8 }}>
            <h3>Current plan: Growth</h3>
            <p>Renewal: 2026-01-01</p>
            <p>Usage: ingests 1,234 / 10,000</p>
            <div style={{ marginTop: 12 }}>
              <a href="/api/billing/portal">
                <button>Manage Billing</button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
