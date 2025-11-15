import { currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const user = await currentUser();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome! You are signed in as: {user?.emailAddresses[0].emailAddress}</p>
    </div>
  );
}
