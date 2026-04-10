import React from "react";
import ProfileForm from "@/components/settings/ProfileForm";
import BackToDashboard from "@/components/BackToDashboard";

export default function ProfilePage() {
  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <BackToDashboard />
            <h1 className="text-2xl font-semibold mt-2">Account Settings</h1>
            <p className="text-sm text-slate-500 mt-1">Manage your personal account details and preferences</p>
          </div>
        </div>

        <ProfileForm />
      </div>
    </main>
  );
}
