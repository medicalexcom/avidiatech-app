export const dynamic = "force-dynamic";

export default function MonitorDocsPage() {
  return (
    <article className="max-w-3xl space-y-10 text-slate-700 dark:text-slate-300">
      <div>
        <span className="inline-block px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 mb-3">Commerce &amp; Automation</span>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">Product Monitor — Change Detection</h1>
        <p className="text-slate-500 dark:text-slate-400">Automatically watch product pages for price, availability, and specification changes across your supplier catalog.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Overview</h2>
        <p className="text-sm leading-relaxed">
          AvidiaMonitor continuously polls product pages on a configurable schedule and alerts you the moment anything changes. Whether a supplier raises their price by 3%, marks a product discontinued, or adds a new specification, Monitor catches it — automatically.
        </p>
        <p className="text-sm leading-relaxed">
          Unlike one-off extractions, Monitor creates a persistent watch on a URL. Each time the page is checked, AvidiaTech compares the new extraction result against the previous snapshot. Differences are recorded as events in the event log and surfaced as alerts.
        </p>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm">
          <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">When to use Monitor vs. Extract</p>
          <p className="text-amber-700 dark:text-amber-400">Use <strong>Extract</strong> for a one-time data pull. Use <strong>Monitor</strong> when you need ongoing awareness of what changes on a page over time — supplier price lists, competitor catalog pages, or manufacturer spec sheets.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">What Changes Are Detected</h2>
        <p className="text-sm">Monitor compares the full structured extraction between check intervals. Detectable changes include:</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            { label: "Price changes", detail: "Absolute value change or configurable % threshold. Detects both increases and decreases." },
            { label: "Availability / stock status", detail: "In stock → out of stock, discontinued, backordered, or pre-order status." },
            { label: "Title / product name", detail: "Manufacturer renamed the product or updated the model designation." },
            { label: "Description changes", detail: "Updated product copy, new features added, compliance notices added." },
            { label: "Specification changes", detail: "Dimensions, weight, voltage, materials, certifications — any spec field." },
            { label: "Image changes", detail: "New images added, existing images replaced or removed." },
            { label: "New variants", detail: "Additional sizes, colors, or configurations added to the product page." },
            { label: "Page removal", detail: "HTTP 404 or page redirect — product may have been discontinued or moved." },
          ].map(({ label, detail }) => (
            <div key={label} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm mb-1">{label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Setting Up a Watch</h2>
        <ol className="space-y-4 text-sm">
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center">1</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Navigate to Monitor</p>
              <p className="text-slate-500 mt-0.5">Go to <strong>Monitor → Watches</strong> in the sidebar. Click <strong>Add Watch</strong>.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center">2</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Enter the product URL</p>
              <p className="text-slate-500 mt-0.5">Paste the full URL of the product page you want to monitor. Example: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">https://supplier.com/products/bosch-18v-drill</code></p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center">3</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Set check interval</p>
              <p className="text-slate-500 mt-0.5">Choose how frequently the page should be checked:</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500 list-disc pl-4">
                <li><strong>Hourly</strong> — High-frequency for volatile pricing (Pro/Scale plans)</li>
                <li><strong>Daily</strong> — Standard for most supplier catalogs</li>
                <li><strong>Weekly</strong> — Low-frequency for slow-changing spec sheets</li>
              </ul>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center">4</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Configure alert thresholds (optional)</p>
              <p className="text-slate-500 mt-0.5">For price monitoring, set a minimum change threshold to avoid noise. Example: only alert if price changes by more than 5%.</p>
            </div>
          </li>
          <li className="flex gap-3">
            <span className="flex-none w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-400 font-bold text-xs flex items-center justify-center">5</span>
            <div>
              <p className="font-medium text-slate-800 dark:text-slate-200">Activate</p>
              <p className="text-slate-500 mt-0.5">Click <strong>Save &amp; Activate</strong>. The first check runs immediately to establish a baseline snapshot. Subsequent checks run on your configured schedule.</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Monitor Rules</h2>
        <p className="text-sm leading-relaxed">
          Rules let you define automatic actions triggered by specific change events. Navigate to <strong>Monitor → Rules</strong> to configure them.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Trigger</th>
                <th className="text-left px-4 py-3 font-semibold">Condition</th>
                <th className="text-left px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {[
                ["Price change", "Increase &gt; 10%", "Email alert + flag product for repricing"],
                ["Availability change", "Out of stock", "Email alert + pause pipeline for affected product"],
                ["Any change detected", "Any field", "Trigger re-extraction and re-run SEO pipeline"],
                ["Page removed (404)", "HTTP error", "Email alert + mark product as discontinued"],
                ["Spec change", "Any specification", "Flag for manual review in dashboard"],
              ].map(([trigger, condition, action], i) => (
                <tr key={i}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200" dangerouslySetInnerHTML={{ __html: trigger }} />
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: condition }} />
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: action }} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Event Log</h2>
        <p className="text-sm leading-relaxed">
          Every detected change is recorded in the event log at <strong>Monitor → Events</strong>. Each event includes:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-sm">
          <li>Timestamp of detection</li>
          <li>The product URL and watch name</li>
          <li>Which fields changed</li>
          <li>The previous value and the new value (side-by-side diff)</li>
          <li>Whether an alert was sent and to which recipients</li>
        </ul>
        <p className="text-sm">Events are retained for 90 days. You can export the full event history as CSV from the Events page.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Bulk Monitoring</h2>
        <p className="text-sm leading-relaxed">
          To monitor your entire catalog at once, use <strong>Bulk Watch Import</strong>:
        </p>
        <ol className="space-y-2 text-sm list-decimal pl-5">
          <li>Go to <strong>Monitor → Watches → Import</strong></li>
          <li>Upload a CSV with columns: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">url</code>, <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">name</code> (optional), <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-xs">check_interval</code> (hourly/daily/weekly)</li>
          <li>Review the import preview — AvidiaTech will validate all URLs before creating watches</li>
          <li>Click <strong>Create Watches</strong> — all URLs begin monitoring immediately</li>
        </ol>
        <div className="bg-slate-900 text-slate-100 rounded-lg p-4 text-xs overflow-x-auto">
          <p className="text-slate-400 mb-2"># Example bulk-monitor.csv</p>
          <p>url,name,check_interval</p>
          <p>https://supplier.com/products/3m-n95-mask,3M N95 Respirator,daily</p>
          <p>https://supplier.com/products/bosch-18v-drill,Bosch 18V Drill,weekly</p>
          <p>https://supplier.com/products/pulse-oximeter,Roscoe Pulse Oximeter,daily</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Notifications</h2>
        <p className="text-sm">Alerts are delivered in two ways:</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm">
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">In-app alerts</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Alerts appear in the Monitor → Events feed and in the dashboard notification center. No configuration needed.</p>
          </div>
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm">
            <p className="font-semibold text-slate-800 dark:text-slate-200 mb-1">Email notifications</p>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Configure email recipients under <strong>Monitor → Notifications</strong>. You can add multiple addresses and filter by change type or severity.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Common Use Cases</h2>
        <div className="space-y-3">
          {[
            { title: "Supplier price tracking", detail: "Monitor your top 500 supplier SKUs daily. When a supplier raises prices, get alerted before your customers notice the margin squeeze. Re-price on your platform before it costs you." },
            { title: "Competitor catalog monitoring", detail: "Watch competitor product pages for pricing strategy and feature changes. Know when a competitor launches a new variant or drops their price on a best-seller." },
            { title: "Restock / availability alerts", detail: "Watch products that go out of stock. Automatically trigger re-check when an out-of-stock product becomes available again — useful for medical and industrial supplies with long lead times." },
            { title: "Manufacturer spec sheet monitoring", detail: "Spec sheets for industrial and medical products change without notice. Monitor manufacturer URLs for spec updates to keep your product data current and compliant." },
            { title: "Auto-refresh pipeline on change", detail: "Combine Monitor with a Rule to automatically re-run AvidiaExtract + AvidiaSEO when any field changes. Your product catalog stays perpetually current without manual intervention." },
          ].map(({ title, detail }) => (
            <div key={title} className="border-l-2 border-cyan-500 pl-4">
              <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{title}</p>
              <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">Plan Limits</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <tr>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-left px-4 py-3">Max watches</th>
                <th className="text-left px-4 py-3">Min interval</th>
                <th className="text-left px-4 py-3">Event history</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700 bg-white dark:bg-slate-900">
              {[
                ["Starter", "25 watches", "Daily", "30 days"],
                ["Growth", "250 watches", "Daily", "60 days"],
                ["Scale / Pro", "2,000 watches", "Hourly", "90 days"],
                ["Enterprise", "Unlimited", "Hourly", "1 year"],
              ].map(([plan, watches, interval, history]) => (
                <tr key={plan}>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200">{plan}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{watches}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{interval}</td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{history}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <a href="/docs" className="text-sm text-cyan-600 hover:underline">← Back to docs</a>
        <a href="/docs/integrations" className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">Integrations →</a>
      </div>
    </article>
  );
}
