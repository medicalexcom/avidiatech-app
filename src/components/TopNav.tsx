"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import ProfileMenu from "./ProfileMenu";

export default function TopNav() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  return (
    <header className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
      <div className="text-xl font-bold">AvidiaTech Dashboard</div>
      <nav className="flex space-x-6 items-center">
        {/* Platform tools */}
        <div className="flex space-x-4">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/dashboard/analytics">Analytics</Link>
          <Link href="/dashboard/visualize">Visualize</Link>
          <Link href="/dashboard/bulk">Bulk Ops</Link>
          <Link href="/dashboard/validate">Validate</Link>
          <Link href="/dashboard/description-formats">Descriptions</Link>
        </div>

        {/* Organization & Admin (kept lightweight: removed items now in ProfileMenu) */}
        <div className="flex space-x-4 border-l border-gray-600 pl-4">
          <Link href="/dashboard/roles">Roles</Link>
          <Link href="/dashboard/versioning">Versioning</Link>
        </div>

        {/* Notifications & Profile */}
        <div className="flex space-x-4 border-l border-gray-600 pl-4 items-center">
          <Link href="/dashboard/notifications">Notifications</Link>

          {/* Profile area: show ProfileMenu when signed in, otherwise a Sign in button */}
          {isLoaded && isSignedIn ? (
            <ProfileMenu />
          ) : (
            <button
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded"
              onClick={() => router.push("/sign-in")}
              type="button"
              disabled={!isLoaded}
            >
              Sign in / Sign up
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
