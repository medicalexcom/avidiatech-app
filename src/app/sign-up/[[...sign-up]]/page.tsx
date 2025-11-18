export const dynamic = "force-dynamic";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "80px" }}>
        <p>Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to enable the hosted sign-up experience.</p>
      </div>
    );
  }
  return (
    <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px" }}>
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
