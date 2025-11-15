** Begin Patch
** Delete File: src/app/dashboard/page.tsx
** End Patch
** Begin Patch
** Add File: src/app/dashboard/page.tsx
// Dashboard page runs on the client so we can use Clerk's useUser hook.
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
** End Patch
