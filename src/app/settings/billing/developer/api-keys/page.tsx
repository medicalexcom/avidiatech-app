import React from "react";
import { getUserRole } from "@/lib/auth/getUserRole";
import ApiKeysManager from "@/components/settings/ApiKeysManager";

/**
 * Developer API Keys page
 * Owners + Admins
 */

export default function ApiKeysPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Developer → API Keys</h1>
        <p>Unauthorized</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Developer → API Keys</h1>
      <section style={{ marginTop: 16 }}>
        <ApiKeysManager />
      </section>
    </main>
  );
}
