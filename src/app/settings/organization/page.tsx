import React from "react";
import OrganizationPanel from "@/components/settings/OrganizationPanel";
import { getUserRole } from "@/lib/auth/getUserRole";
import BackToDashboard from "@/components/BackToDashboard";

export default function OrganizationPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    return (
      <main className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-4">
            <BackToDashboard />
            <h1 className="text-2xl font-semibold mt-2">Organization</h1>
          </div>
          <p className="text-sm text-slate-500 mt-2">You do not have permission to manage the organization.</p>
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
            <h1 className="text-2xl font-semibold mt-2">Organization</h1>
            <p className="text-sm text-slate-500 mt-1">Manage organization details and members</p>
          </div>
        </div>

        <OrganizationPanel />
      </div>
    </main>
  );
}
