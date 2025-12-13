import React from "react";
import BackToDashboard from "@/components/BackToDashboard";
import CreateOrganizationClient from "@/components/settings/CreateOrganizationClient";

export default function NewOrganizationPage() {
  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <BackToDashboard />
          <h1 className="text-2xl font-semibold mt-2">Create organization</h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a workspace to store integrations, imports, SEO projects, and pipelines.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
          <CreateOrganizationClient />
        </div>
      </div>
    </main>
  );
}
