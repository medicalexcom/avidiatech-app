import React from "react";

/**
 * Optional: Describe history page
 * - Implement server-side fetch from product_ingestions where type='describe'
 * - For now provide a placeholder UI instructing how to wire server data
 */

export default async function DescribeHistoryPage() {
  // TODO: server-side fetch: SELECT * FROM product_ingestions WHERE type='describe' AND tenant_id=...
  // Use your Supabase server helper with service role key.

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold">Describe History</h1>
        <p className="text-sm text-slate-500 mt-2">This page will list recent Describe generations for the tenant. Wire server-side DB queries to populate.</p>
        <div className="mt-6">
          <div className="bg-white dark:bg-slate-900 border rounded-lg p-6">Placeholder — implement server-side fetch from product_ingestions.</div>
        </div>
      </div>
    </main>
  );
}
