import React from "react";
import { getUserRole } from "@/lib/auth/getUserRole";
import WebhooksManager from "@/components/settings/WebhooksManager";

export default function WebhooksPage() {
  const role = getUserRole();
  if (!["owner", "admin"].includes(role)) {
    return (
      <main style={{ padding: 20 }}>
        <h1>Developer → Webhooks</h1>
        <p>Unauthorized</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 20 }}>
      <h1>Developer → Webhooks</h1>
      <section style={{ marginTop: 16 }}>
        <WebhooksManager />
      </section>
    </main>
  );
}
