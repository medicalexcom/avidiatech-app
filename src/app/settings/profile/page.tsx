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
            <nav className="text-sm text-slate-500 mt-2">Settings &raquo; Profile</nav>
          </div>
        </div>

        <ProfileForm />
      </div>
    </main>
  );
}
