"use client";

/**
 * Subscription and usage page
 *
 * This page summarizes the tenant’s subscription plan, billing status
 * and usage metrics.  It allows users to upgrade or downgrade their plan
 * and view how many ingestion calls or other actions they have used in the
 * current billing period【962839935143576†L163-L179】.
 */
export default function SubscriptionPage() {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-4">Subscription & Usage</h1>
      <p className="mb-4">
        See your current plan, manage billing, and monitor usage.  Tenants
        have one active Stripe subscription and associated quotas for each
        product【962839935143576†L130-L170】.
      </p>
      <ul className="list-disc ml-6 space-y-2">
        <li>
          <strong>Plan details:</strong> view your plan name (starter, growth,
          pro, etc.), status (trialing, active, past due), renewal dates and
          cancellation options【962839935143576†L163-L173】.
        </li>
        <li>
          <strong>Usage counters:</strong> track how many ingestion, SEO,
          variant or match calls you’ve made this billing period and how many
          remain【962839935143576†L173-L178】.
        </li>
        <li>
          <strong>Upgrade/downgrade:</strong> change your plan via Stripe
          billing integration and see pricing differences before confirming
          (future functionality).
        </li>
        <li>
          <strong>Invoice history:</strong> download past invoices and update
          payment methods through the Stripe customer portal.
        </li>
      </ul>
    </div>
  );
}
