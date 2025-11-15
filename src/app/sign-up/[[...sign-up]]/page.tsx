import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div style={{ display:"flex", justifyContent:"center", paddingTop:"80px" }}>
      <SignUp routing="path" path="/sign-up" />
    </div>
  );
}
