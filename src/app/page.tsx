// src/app/page.tsx
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  // Server-safe Clerk authentication
  const { userId } = await auth();

  const getStartedHref = userId ? "/dashboard" : "/sign-up";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen p-10">
      <h1 className="text-4xl font-bold mb-4 text-center">
        Welcome to AvidiaTech
      </h1>
      <p className="text-lg text-gray-600 mb-6 text-center max-w-lg">
        AI-Powered product intelligence, automation, and catalog operations.
      </p>

      <Link
        href={getStartedHref}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Get Started
      </Link>
    </main>
  );
}
