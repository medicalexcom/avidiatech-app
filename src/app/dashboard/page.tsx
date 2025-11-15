// THIS MUST BE A SERVER COMPONENT (no "use client")
import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome! {user?.emailAddresses?.[0]?.emailAddress}</p>
    </div>
  );
}
