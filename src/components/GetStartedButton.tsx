import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

type Props = {
  className?: string;
  children?: React.ReactNode;
};

export default function GetStartedButton({ className = "btn-primary", children = "Get started" }: Props) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  function onClick() {
    // We disable until isLoaded; this check is defensive.
    if (!isLoaded) return;

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
      disabled={!isLoaded} // prevents clicks while Clerk is initializing (avoids modal flash)
      aria-disabled={!isLoaded}
      type="button"
    >
      {children}
    </button>
  );
}
