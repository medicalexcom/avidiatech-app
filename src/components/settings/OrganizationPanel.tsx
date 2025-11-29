import React from "react";
import OrganizationForm from "./OrganizationForm";

/**
 * OrganizationPanel — wrapper to provide consistent page-level layout
 * around the existing OrganizationForm component.
 */

export default function OrganizationPanel() {
  return (
    <div className="max-w-6xl">
      <div className="bg-white dark:bg-slate-900 border rounded-lg p-6 shadow-sm">
        <header className="mb-4">
          <h2 className="text-lg font-semibold">Organization</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage organization settings, members, and invites.
          </p>
        </header>

        <OrganizationForm />
      </div>
    </div>
  );
}
