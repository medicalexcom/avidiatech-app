export const dynamic = "force-dynamic";
export const runtime = "edge";

import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px" }}>
      <SignIn routing="path" path="/sign-in" />
    </div>
  );
}
