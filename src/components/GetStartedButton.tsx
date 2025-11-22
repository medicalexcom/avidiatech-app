import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function GetStartedButton({ className = "btn-primary", children = "Get started" }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  function onClick() {
    if (!isLoaded) return; // avoid race where Clerk mounts a modal
    if (isSignedIn) {
      router.push("/dashboard");
    } else {
      router.push("/sign-up?redirect=/dashboard");
    }
  }

  return (
    <button
      onClick={onClick}
      className={className}
      disabled={!isLoaded}
      aria-disabled={!isLoaded}
      type="button"
    >
      {children}
    </button>
  );
}
