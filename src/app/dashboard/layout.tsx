"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Dashboard layout wrapper:
 * - Calls /api/subscription/status and if not active redirects to /dashboard/pricing
 * - This prevents client-side navigation from showing restricted pages
 */

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      try {
        const res = await fetch("/api/subscription/status");
        if (!mounted) return;
        const data = await res.json();
        if (!data?.active) {
          router.replace("/dashboard/pricing");
        }
      } catch (err) {
        // On error be defensive and redirect to pricing to prevent accidental access
        console.error("subscription check failed", err);
        router.replace("/dashboard/pricing");
      } finally {
        if (mounted) setChecking(false);
      }
    }
    check();
    return () => {
      mounted = false;
    };
  }, [router]);

  // Optionally show a full-screen spinner while checking
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-sm text-slate-600">Verifying subscription status...</div>
      </div>
    );
  }

  return <>{children}</>;
}
