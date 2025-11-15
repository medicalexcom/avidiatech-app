import { auth } from "@clerk/nextjs";

export default function DashboardPage() {
  const { userId } = auth();

  return (
    <div style={{ padding: "40px" }}>
      <h1>Dashboard</h1>
      <p>Welcome! You are signed in as: {userId}</p>
    </div>
  );
}
