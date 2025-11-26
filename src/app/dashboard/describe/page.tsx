import React from "react";
import DescribeForm from "@/components/describe/DescribeForm";
import DescribeOutput from "@/components/describe/DescribeOutput";
import { getAuth } from "@clerk/nextjs/server";

/**
 * Server page for /dashboard/describe
 * - Provides tenant/user context where needed (e.g. server-side fetch if required)
 * - Renders two-panel layout: DescribeForm (client) + DescribeOutput (client)
 *
 * The DescribeOutput will be rendered client-side when there's result data.
 */

export default async function DescribePage() {
  // Example: getAuth to fetch userId/tenant info server-side if needed
  const auth = getAuth();
  // auth.userId will be available if signed in
  // const tenantId = await fetchTenantForUser(auth.userId) // implement if required

  return (
    <main className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">AvidiaDescribe</h1>
          <p className="text-sm text-slate-500 mt-2">Generate SEO-ready product descriptions from minimal inputs.</p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: inputs (client) */}
          <div className="col-span-12 lg:col-span-5">
            <DescribeForm />
          </div>

          {/* Right: output (client) */}
          <div className="col-span-12 lg:col-span-7">
            <DescribeOutput />
          </div>
        </div>
      </div>
    </main>
  );
}
