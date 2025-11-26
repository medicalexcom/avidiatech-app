import React from "react";
import ProfileForm from "@/components/settings/ProfileForm";

export default function ProfilePage() {
  return (
    <main className="p-6">
      <div className="max-w-6xl mx-auto">
        <nav className="text-sm text-slate-500 mb-4">Settings &raquo; Profile</nav>
        <ProfileForm />
      </div>
    </main>
  );
}
