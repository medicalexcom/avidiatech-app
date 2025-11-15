"use client";

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <main style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome! {user?.emailAddresses?.[0]?.emailAddress ?? "Loading..."}</p>
    </main>
  );
}
