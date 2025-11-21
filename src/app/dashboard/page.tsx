"use client";

const statusMessage = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? "Authentication is wired through Clerk."
  : "Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable Clerk sign-in for this workspace.";

export default function DashboardPage() {
  return (
    <main className="p-10 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-700">
        Welcome to the AvidiaTech control center. Use the navigation to explore analytics,
        imports, descriptions, automation flows, and developer tooling.
      </p>
      <div className="rounded border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        {statusMessage}
      </div>
    </main>
  );
}
