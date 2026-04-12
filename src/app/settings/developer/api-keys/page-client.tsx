import React from "react";
import ApiKeysManager from "@/components/settings/ApiKeysManager";
import { getUserRole } from "@/lib/auth/getUserRole";

export default function ApiKeysPage() {
  const role = getUserRole();

  if (!["owner", "admin"].includes(role)) {
    return (
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">API Keys &amp; Developer Tools</h1>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-5 py-4 dark:border-amber-500/25 dark:bg-amber-500/8">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-amber-500 text-lg leading-none">⚠</span>
            <div>
              <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">Access restricted</p>
              <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-400">
                You are not authorized to manage API keys. Contact your workspace owner or admin.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">API Keys &amp; Developer Tools</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          Generate and rotate API keys for programmatic access to the AvidiaTech API.
        </p>
      </div>

      {/* Manager card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ApiKeysManager />
      </div>
    </div>
  );
}
