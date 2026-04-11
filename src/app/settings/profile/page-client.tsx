import React from "react";
import ProfileForm from "@/components/settings/ProfileForm";

export default function ProfilePage() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="border-b border-slate-200 pb-5 dark:border-slate-800">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Account Settings</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          Manage your personal account details, display name, and preferences.
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <ProfileForm />
      </div>
    </div>
  );
}
