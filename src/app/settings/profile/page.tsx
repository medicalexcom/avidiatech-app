import React from "react";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";
import ProfileForm from "@/components/settings/ProfileForm";

/**
 * Server component for /dashboard/settings/profile
 * Enforces role-based access (all users allowed on profile page)
 */

export default async function ProfilePage() {
  // Everyone can access their own profile
  const role = getUserRole();
  // role not needed for redirect here, but demonstrated
  return (
    <main style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Settings &rarr; Profile</h1>
      </div>
      <section style={{ marginTop: 16 }}>
        <ProfileForm />
      </section>
    </main>
  );
}
