import React from "react";
import ApiKeysManager from "@/components/settings/ApiKeysManager";
import { getUserRole } from "@/lib/auth/getUserRole";
import BackToDashboard from "@/components/BackToDashboard";

export default function ApiKeysPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <BackToDashboard />
            <h1 className="text-lg font-semibold mt-2">Developer → API Keys</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2">You are not authorized to manage API keys.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <BackToDashboard />
            <nav className="text-sm text-slate-500 mt-2">Settings &raquo; Developer &raquo; API Keys</nav>
          </div>
        </div>

        <ApiKeysManager />
      </div>
    </main>
  );
}
