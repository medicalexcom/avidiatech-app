import React from "react";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth/getUserRole";
import OrganizationForm from "@/components/settings/OrganizationForm";

/**
 * Server component for /dashboard/settings/organization
 * Access: owners + admins
 */
export default async function OrganizationPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    redirect("/dashboard/unauthorized");
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Settings &rarr; Organization</h1>
      <section style={{ marginTop: 16 }}>
        <OrganizationForm />
      </section>
    </main>
  );
}
