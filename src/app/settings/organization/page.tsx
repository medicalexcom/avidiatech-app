"use client";

import React, { useEffect } from "react";
import { OrganizationProfile, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

/**
 * /settings/organization
 *
 * Single canonical organization management page: shows Clerk's OrganizationProfile
 * for signed-in users. Removed the duplicate app-level header/wrapper so Clerk's
 * own UI is the primary frame.
 */

export default function OrganizationSettingsPage() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const redirect = "/settings/organization";

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace(`/sign-in?redirect=${encodeURIComponent(redirect)}`);
    }
  }, [isLoaded, isSignedIn, router, redirect]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <main className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Keep only the back link (no page-level H1 or description — Clerk renders those). */}
        <div className="mb-4">
          <a href="/dashboard" className="text-sm text-slate-600 inline-flex items-center gap-2">
            ← Back to dashboard
          </a>
        </div>

        {/* Render Clerk's OrganizationProfile as the single canonical frame */}
        <div>
          <OrganizationProfile
            {...({
              appearance: {
                elements: {
                  rootBox: "w-full",
                },
              },
            } as any)}
          />
        </div>
      </div>
    </main>
  );
}
