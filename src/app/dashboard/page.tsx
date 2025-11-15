"use client";

import { useUser } from "@clerk/nextjs";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome! {user?.emailAddresses?.[0]?.emailAddress ?? "Loading..."}</p>
    </div>
  );
}
