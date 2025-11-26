import React from "react";
import OrganizationPanel from "@/components/settings/OrganizationPanel";
import { getUserRole } from "@/lib/auth/getUserRole";

export default function OrganizationPage() {
  const role = getUserRole();
  // allow owners & admins
  if (!["owner", "admin"].includes(role)) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-lg font-semibold">Organization</h1>
          <p className="text-sm text-slate-500 mt-2">You do not have permission to manage the organization.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm text-slate-500 mb-4">Settings &raquo; Organization</nav>
        <OrganizationPanel />
      </div>
    </main>
  );
}
