export const dynamic = "force-dynamic";

import Link from "next/link";

const events = [
  {
    event: "product.extracted",
    description: "Fired when AvidiaExtract successfully processes a product URL.",
    payload: '{ "product_id": "...", "sku": "...", "status": "extracted" }',
  },
  {
    event: "product.described",
    description: "Fired when AvidiaDescribe generates descriptions for a product.",
    payload: '{ "product_id": "...", "sku": "...", "status": "described" }',
  },
  {
    event: "product.seo_complete",
    description: "Fired when AvidiaSEO generates titles and meta for a product.",
    payload: '{ "product_id": "...", "sku": "...", "status": "seo_complete" }',
  },
  {
    event: "bulk_job.complete",
    description: "Fired when an entire bulk pipeline job finishes processing.",
    payload: '{ "job_id": "...", "total": 500, "succeeded": 498, "failed": 2 }',
  },
  {
    event: "subscription.updated",
    description: "Fired when a plan change or renewal updates your subscription status.",
    payload: '{ "plan": "growth", "status": "active", "period_end": "..." }',
  },
];

export default function WebhooksPage() {
  return (
    <div className="max-w-prose space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300">
          Developer
        </span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Webhooks
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Receive real-time event notifications in your own systems when products are processed,
          jobs complete, or subscription status changes.
        </p>
      </div>

      {/* Coming soon notice */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-2">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">📌 Full documentation coming soon</p>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Webhook delivery logs and endpoint management are available in{" "}
          <Link href="/dashboard/settings" className="underline hover:no-underline">
            Settings → Developer
          </Link>
          . Detailed integration guides for each event type are being added here.
        </p>
      </div>

      {/* Overview */}
      <section className="space-y-4" id="overview">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Overview
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          AvidiaTech webhooks let you trigger automation in your own systems the moment something
          happens in the pipeline. Instead of polling our API, register an HTTPS endpoint and we'll
          POST a signed JSON payload whenever a relevant event occurs.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          All webhook requests are signed with an HMAC-SHA256 signature in the{" "}
          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-Avadia-Signature</code> header
          so you can verify authenticity before processing the payload.
        </p>
      </section>

      {/* Setup */}
      <section className="space-y-4" id="setup">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Registering a Webhook Endpoint
        </h2>
        <ol className="space-y-2 text-sm text-slate-600 dark:text-slate-300 list-decimal list-inside">
          <li>
            Go to{" "}
            <Link href="/dashboard/settings" className="text-cyan-600 dark:text-cyan-400 hover:underline">
              Settings → Developer → Webhooks
            </Link>
            .
          </li>
          <li>Click <strong>Add endpoint</strong> and enter your HTTPS URL.</li>
          <li>Select the event types you want to receive.</li>
          <li>Save — we'll immediately send a test ping to verify reachability.</li>
          <li>
            Copy your <strong>signing secret</strong> and store it securely. Use it to verify
            the <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-Avadia-Signature</code> header on incoming requests.
          </li>
        </ol>
      </section>

      {/* Events */}
      <section className="space-y-4" id="events">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Event Types
        </h2>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
          {events.map((e) => (
            <div key={e.event} className="p-4 space-y-1 bg-white dark:bg-slate-900">
              <p className="text-xs font-mono font-semibold text-cyan-700 dark:text-cyan-400">{e.event}</p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{e.description}</p>
              <code className="block text-xs bg-slate-50 dark:bg-slate-800 rounded px-2 py-1 text-slate-500 dark:text-slate-400 mt-1 overflow-x-auto">
                {e.payload}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Security */}
      <section className="space-y-4" id="security">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Verifying Signatures
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Every webhook request includes an <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">X-Avadia-Signature</code> header
          containing an HMAC-SHA256 hash of the raw request body, signed with your endpoint's
          secret. Always verify this before processing:
        </p>
        <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
          <pre className="text-xs text-slate-300 font-mono whitespace-pre">{`import crypto from "crypto";

function verifyWebhook(rawBody: string, signature: string, secret: string) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
        </div>
      </section>

      {/* Next steps */}
      <section className="space-y-3" id="next-steps">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-800 pb-2">
          Related
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/docs/getting-started"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Getting started →
          </Link>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Settings → Developer →
          </Link>
        </div>
      </section>
    </div>
  );
}
