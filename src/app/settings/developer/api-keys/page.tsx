import React from "react";
import ApiKeysManager from "@/components/settings/ApiKeysManager";
import { getUserRole } from "@/lib/auth/getUserRole";

export default function ApiKeysPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold">Developer → API Keys</h1>
          <p className="text-sm text-slate-500 mt-2">You are not authorized to manage API keys.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm text-slate-500 mb-4">Settings &raquo; Developer &raquo; API Keys</nav>
        <ApiKeysManager />
      </div>
    </main>
  );
}
