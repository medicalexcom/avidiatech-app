import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function GetStartedButton({ className = "btn-primary", children = "Get started" }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  function onClick() {
    if (!isLoaded) return; // wait until Clerk finishes loading
    if (isSignedIn) {
      router.push("/dashboard");
    } else {
      // route to a path-based sign-up page (not modal)
      router.push("/sign-up?redirect=/dashboard");
    }
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  );
}
