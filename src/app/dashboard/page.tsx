'use client';

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Quick client-side gate: if user is signed-in and we don't have a stripeCustomerId,
    // send them to the pricing/trial flow so they choose a plan.
    if (!isLoaded) return;

    if (isSignedIn) {
      const stripeCustomerId = (user as any)?.privateMetadata?.stripeCustomerId;
      // if you keep a separate subscriptions table, replace this check with an API call
      if (!stripeCustomerId) {
        router.push("/dashboard/pricing");
      }
    }
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <main className="p-10 space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-gray-700">
        Welcome to the AvidiaTech control center. Use the navigation to explore analytics,
        imports, descriptions, automation flows, and developer tooling.
      </p>
    </main>
  );
}
